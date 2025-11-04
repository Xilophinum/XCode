/**
 * Metrics Buffer
 * In-memory buffer for metrics with periodic flush to database
 * Event-driven collection with consolidated row storage
 */

import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import logger from '~/server/utils/logger.js'
import { metrics } from '~/server/utils/database.js'
import { lt } from 'drizzle-orm'
      
export class MetricsBuffer {
  constructor(db, agentManager) {
    this.db = db
    this.agentManager = agentManager

    // In-memory buffers - stores latest metrics for each entity
    this.agentMetrics = new Map() // agentId -> { timestamp, metrics }
    this.serverMetrics = null
    this.apiMetrics = null
    this.buildMetrics = null

    // Configuration
    this.flushInterval = 60000 // 60 seconds
    this.retentionDays = 30 // Keep metrics for 30 days

    // State
    this.flushIntervalId = null
    this.cleanupIntervalId = null

    logger.info('MetricsBuffer initialized (flush every 60s)')
  }

  /**
   * Start periodic flush and cleanup
   */
  start() {
    if (this.flushIntervalId) {
      logger.warn('MetricsBuffer already running')
      return
    }

    logger.info('Starting metrics buffer flush')

    // Initial server metrics collection
    this.collectServerMetrics()

    // Flush to database every 60 seconds
    this.flushIntervalId = setInterval(async () => {
      await this.flush()
    }, this.flushInterval)

    // Collect server metrics every 30 seconds (between flushes)
    this.serverCollectIntervalId = setInterval(() => {
      this.collectServerMetrics()
    }, 30000)

    // Cleanup old metrics once per hour
    this.cleanupIntervalId = setInterval(async () => {
      await this.cleanup()
    }, 3600000) // 1 hour
  }

  /**
   * Stop flush and cleanup
   */
  stop() {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId)
      this.flushIntervalId = null
    }
    if (this.serverCollectIntervalId) {
      clearInterval(this.serverCollectIntervalId)
      this.serverCollectIntervalId = null
    }
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = null
    }
    logger.info('MetricsBuffer stopped')
  }

  /**
   * Add agent metrics (called from WebSocket heartbeat)
   */
  addAgentMetrics(agentId, agentName, systemMetrics, systemInfo, status, currentJobs) {
    this.agentMetrics.set(agentId, {
      timestamp: Date.now(),
      agentName: agentName,
      status: status || 'unknown',
      currentJobs: currentJobs || 0,
      maxJobs: systemInfo?.maxConcurrentJobs || 1,
      platform: systemInfo?.platform || 'Unknown',
      uptime: systemInfo?.uptime || 0,
      cpuUsage: systemMetrics?.cpuUsage,
      cpuCount: systemMetrics?.cpuCount,
      memoryUsage: systemMetrics?.memoryUsage,
      usedMemory: systemMetrics?.usedMemory,
      totalMemory: systemMetrics?.totalMemory,
      diskUsage: systemMetrics?.diskUsage,
      diskUsed: systemMetrics?.diskUsed,
      diskTotal: systemMetrics?.diskTotal,
      diskFree: systemMetrics?.diskFree,
      interfaceCount: systemMetrics?.interfaceCount,
      activeInterfaces: systemMetrics?.activeInterfaces || [],
      ipv4Count: systemMetrics?.ipv4Count || 0,
      ipv6Count: systemMetrics?.ipv6Count || 0,
      ipv4Addresses: systemMetrics?.ipv4Addresses || [],
      ipv6Addresses: systemMetrics?.ipv6Addresses || [],
      process: systemMetrics?.process
    })
  }

  /**
   * Collect server metrics (called periodically)
   */
  collectServerMetrics() {
    try {
      // CPU usage
      const cpus = os.cpus()
      let totalIdle = 0
      let totalTick = 0

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type]
        }
        totalIdle += cpu.times.idle
      })

      const cpuUsage = 100 - ~~(100 * totalIdle / totalTick)

      // Memory usage
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = totalMem - freeMem
      const memPercent = (usedMem / totalMem) * 100

      // Active connections (will be set by WebSocket plugin)
      const wsConnections = globalThis.socketIO?.engine?.clientsCount || 0

      // Process metrics (server footprint)
      const processMemUsage = process.memoryUsage()
      const processCpuUsage = process.cpuUsage(this.lastCpuUsage)

      // Calculate process CPU percentage
      const totalCpuTime = (processCpuUsage.user + processCpuUsage.system) / 1000 // Convert to ms
      const elapsedTime = Date.now() - (this.lastCpuCheck || Date.now())
      const processCpuPercent = elapsedTime > 0 ? Math.min((totalCpuTime / elapsedTime) * 100, 100) : 0

      // Store for next calculation
      this.lastCpuUsage = process.cpuUsage()
      this.lastCpuCheck = Date.now()

      this.serverMetrics = {
        timestamp: Date.now(),
        cpuUsage: Math.round(cpuUsage * 100) / 100,
        cpuCores: cpus.length,
        memoryUsage: Math.round(memPercent * 100) / 100,
        memoryUsed: Math.round(usedMem / 1024 / 1024), // MB
        memoryTotal: Math.round(totalMem / 1024 / 1024), // MB
        uptime: Math.floor(process.uptime()),
        wsConnections: wsConnections,
        // Process-specific metrics (server footprint)
        process: {
          cpu: Math.round(processCpuPercent * 100) / 100,
          memory: {
            rss: Math.round(processMemUsage.rss / 1024 / 1024), // MB
            heapTotal: Math.round(processMemUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(processMemUsage.heapUsed / 1024 / 1024),
            external: Math.round(processMemUsage.external / 1024 / 1024),
            arrayBuffers: Math.round((processMemUsage.arrayBuffers || 0) / 1024 / 1024)
          },
          uptime: Math.floor(process.uptime()),
          pid: process.pid
        }
      }
    } catch (error) {
      logger.error('Error collecting server metrics:', error)
    }
  }

  /**
   * Add API metrics
   */
  addAPIMetrics(totalRequests, avgLatency, endpoints) {
    this.apiMetrics = {
      timestamp: Date.now(),
      totalRequests,
      avgLatency,
      endpointCount: Object.keys(endpoints || {}).length,
      endpoints: endpoints || {}
    }
  }

  /**
   * Add build metrics
   */
  addBuildMetrics(running, queued, completedToday, successRate) {
    this.buildMetrics = {
      timestamp: Date.now(),
      running,
      queued,
      completedToday,
      successRate
    }
  }

  /**
   * Flush metrics to database
   */
  async flush() {
    try {
      const now = new Date()
      const roundedTimestamp = this.roundToMinute(now)
      const batch = []

      // Flush agent metrics
      for (const [agentId, data] of this.agentMetrics) {

        batch.push({
          id: uuidv4(),
          timestamp: roundedTimestamp,
          entityType: 'agent',
          entityId: agentId,
          metrics: JSON.stringify({
            agentName: data.agentName,
            status: data.status,
            currentJobs: data.currentJobs,
            maxJobs: data.maxJobs,
            platform: data.platform,
            uptime: data.uptime,
            cpu: {
              percent: data.cpuUsage,
              cores: data.cpuCount
            },
            memory: {
              percent: data.memoryUsage,
              used: data.usedMemory,
              total: data.totalMemory
            },
            disk: {
              percent: data.diskUsage,
              used: data.diskUsed,
              total: data.diskTotal,
              free: data.diskFree
            },
            network: {
              interfaceCount: data.interfaceCount,
              activeInterfaces: data.activeInterfaces,
              ipv4Count: data.ipv4Count,
              ipv6Count: data.ipv6Count,
              ipv4Addresses: data.ipv4Addresses,
              ipv6Addresses: data.ipv6Addresses
            },
            process: data.process
          }),
          createdAt: now.toISOString()
        })
      }
      // Flush server metrics
      if (this.serverMetrics) {

        batch.push({
          id: uuidv4(),
          timestamp: roundedTimestamp,
          entityType: 'server',
          entityId: null,
          metrics: JSON.stringify({
            cpu: {
              percent: this.serverMetrics.cpuUsage,
              cores: this.serverMetrics.cpuCores
            },
            memory: {
              percent: this.serverMetrics.memoryUsage,
              used: this.serverMetrics.memoryUsed,
              total: this.serverMetrics.memoryTotal
            },
            uptime: this.serverMetrics.uptime,
            wsConnections: this.serverMetrics.wsConnections,
            process: this.serverMetrics.process
          }),
          createdAt: now.toISOString()
        })
      }

      // Flush API metrics
      if (this.apiMetrics) {
        batch.push({
          id: uuidv4(),
          timestamp: roundedTimestamp,
          entityType: 'api',
          entityId: null,
          metrics: JSON.stringify({
            totalRequests: this.apiMetrics.totalRequests,
            avgLatency: this.apiMetrics.avgLatency,
            endpointCount: this.apiMetrics.endpointCount,
            endpoints: this.apiMetrics.endpoints
          }),
          createdAt: now.toISOString()
        })

        // Reset API metrics after flush
        this.apiMetrics = null
      }

      // Flush build metrics
      if (this.buildMetrics) {
        batch.push({
          id: uuidv4(),
          timestamp: roundedTimestamp,
          entityType: 'builds',
          entityId: null,
          metrics: JSON.stringify({
            running: this.buildMetrics.running,
            queued: this.buildMetrics.queued,
            completedToday: this.buildMetrics.completedToday,
            successRate: this.buildMetrics.successRate
          }),
          createdAt: now.toISOString()
        })
      }

      // Batch insert
      if (batch.length > 0) {

        await this.db.insert(metrics).values(batch)
        logger.debug(`Flushed ${batch.length} metric snapshots to database`)
      }

      // Keep agent metrics in buffer (will be updated by next heartbeat)
      // Only clear API metrics as those are accumulated
    } catch (error) {
      logger.error('Error flushing metrics to database:', error)
    }
  }

  /**
   * Clean up old metrics
   */
  async cleanup() {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays)
      const cutoffISO = cutoffDate.toISOString()
      const result = await this.db
        .delete(metrics)
        .where(lt(metrics.timestamp, cutoffISO))

      logger.info(`Cleaned up metrics older than ${this.retentionDays} days (deleted ${result.changes || 0} records)`)
    } catch (error) {
      logger.error('Error cleaning up metrics:', error)
    }
  }

  /**
   * Round timestamp to nearest minute
   */
  roundToMinute(date) {
    const d = new Date(date)
    d.setSeconds(0, 0)
    return d.toISOString()
  }

  /**
   * Get current metrics summary (for WebSocket broadcast)
   */
  getSummary() {
    return {
      server: this.serverMetrics ? {
        cpu: {
          percent: this.serverMetrics.cpuUsage,
          cores: this.serverMetrics.cpuCores
        },
        memory: {
          percent: this.serverMetrics.memoryUsage,
          used: this.serverMetrics.memoryUsed,
          total: this.serverMetrics.memoryTotal
        },
        uptime: this.serverMetrics.uptime,
        websocket: {
          connections: this.serverMetrics.wsConnections
        },
        process: this.serverMetrics.process
      } : null,
      agents: {
        total: this.agentMetrics.size,
        online: Array.from(this.agentMetrics.values()).filter(a => a.status === 'online').length,
        offline: Array.from(this.agentMetrics.values()).filter(a => a.status !== 'online').length,
        jobs: {
          current: Array.from(this.agentMetrics.values()).reduce((sum, a) => sum + (a.currentJobs || 0), 0),
          max: Array.from(this.agentMetrics.values()).reduce((sum, a) => sum + (a.maxJobs || 1), 0)
        }
      },
      api: this.apiMetrics,
      builds: this.buildMetrics
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      isRunning: this.flushIntervalId !== null,
      flushInterval: this.flushInterval,
      retentionDays: this.retentionDays,
      bufferedAgents: this.agentMetrics.size,
      hasServerMetrics: this.serverMetrics !== null,
      hasAPIMetrics: this.apiMetrics !== null,
      hasBuildMetrics: this.buildMetrics !== null
    }
  }
}

export default MetricsBuffer
