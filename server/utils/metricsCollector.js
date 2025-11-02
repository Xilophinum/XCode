/**
 * Metrics Collector
 * Collects system, agent, and API metrics every 30 seconds
 * Stores time-series data with 7-day retention
 */

import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import logger from '~/server/utils/logger.js'
import { builds, metrics} from '~/server/utils/database.js'

export class MetricsCollector {
  constructor(db, agentManager, io) {
    this.db = db
    this.agentManager = agentManager
    this.io = io
    this.intervalId = null
    this.collectionInterval = 30000 // 30 seconds
    this.retentionDays = 7
    this.apiMetrics = new Map() // In-memory API request tracking

    logger.info('MetricsCollector initialized')
  }

  /**
   * Start collecting metrics
   */
  start() {
    if (this.intervalId) {
      logger.warn('MetricsCollector already running')
      return
    }

    logger.info(`Starting metrics collection (every ${this.collectionInterval / 1000}s)`)

    // Initial collection
    this.collect()

    // Start periodic collection
    this.intervalId = setInterval(() => {
      this.collect()
    }, this.collectionInterval)

    // Start cleanup job (runs every hour)
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup()
    }, 3600000) // 1 hour
  }

  /**
   * Stop collecting metrics
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      logger.info('Metrics collection stopped')
    }
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = null
    }
  }

  /**
   * Main collection method
   */
  async collect() {
    try {
      const timestamp = new Date().toISOString()
      const metrics = []

      // Collect server metrics
      const serverMetrics = this.collectServerMetrics(timestamp)
      metrics.push(...serverMetrics)

      // Collect agent metrics
      const agentMetrics = this.collectAgentMetrics(timestamp)
      metrics.push(...agentMetrics)

      // Collect API metrics
      const apiMetrics = this.collectAPIMetrics(timestamp)
      metrics.push(...apiMetrics)

      // Collect build queue metrics
      const queueMetrics = await this.collectQueueMetrics(timestamp)
      metrics.push(...queueMetrics)

      // Insert all metrics into database
      if (metrics.length > 0) {
        await this.insertMetrics(metrics)
        logger.debug(`Collected ${metrics.length} metrics`)
      }

      // Emit real-time update via WebSocket
      this.io?.emit('metrics_update', {
        timestamp,
        summary: this.getMetricsSummary(metrics)
      })

    } catch (error) {
      logger.error('Error collecting metrics:', error)
    }
  }

  /**
   * Collect server system metrics
   */
  collectServerMetrics(timestamp) {
    const metrics = []
    const createdAt = new Date().toISOString()

    try {
      // CPU usage (percentage)
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

      metrics.push({
        id: uuidv4(),
        timestamp,
        metricType: 'server_cpu',
        agentId: null,
        value: JSON.stringify({ percent: cpuUsage }),
        metadata: JSON.stringify({ cores: cpus.length }),
        createdAt
      })

      // Memory usage
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = totalMem - freeMem
      const memPercent = (usedMem / totalMem) * 100

      metrics.push({
        id: uuidv4(),
        timestamp,
        metricType: 'server_memory',
        agentId: null,
        value: JSON.stringify({
          used: Math.round(usedMem / 1024 / 1024), // MB
          total: Math.round(totalMem / 1024 / 1024), // MB
          percent: Math.round(memPercent * 100) / 100
        }),
        metadata: null,
        createdAt
      })

      // Active WebSocket connections
      const wsConnections = this.io?.engine?.clientsCount || 0
      metrics.push({
        id: uuidv4(),
        timestamp,
        metricType: 'server_websocket_connections',
        agentId: null,
        value: JSON.stringify({ count: wsConnections }),
        metadata: null,
        createdAt
      })

      // System uptime
      const uptime = os.uptime()
      metrics.push({
        id: uuidv4(),
        timestamp,
        metricType: 'server_uptime',
        agentId: null,
        value: JSON.stringify({ seconds: uptime }),
        metadata: null,
        createdAt
      })

    } catch (error) {
      logger.error('Error collecting server metrics:', error)
    }

    return metrics
  }

  /**
   * Collect agent metrics
   */
  collectAgentMetrics(timestamp) {
    const metrics = []
    const createdAt = new Date().toISOString()

    try {
      const agents = this.agentManager?.getAllAgents() || []

      agents.forEach(agent => {
        // Agent status
        metrics.push({
          id: uuidv4(),
          timestamp,
          metricType: 'agent_status',
          agentId: agent.id,
          value: JSON.stringify({
            status: agent.status,
            isOnline: agent.status === 'online'
          }),
          metadata: JSON.stringify({
            name: agent.name,
            platform: agent.platform
          }),
          createdAt
        })

        // Agent job count
        metrics.push({
          id: uuidv4(),
          timestamp,
          metricType: 'agent_jobs',
          agentId: agent.id,
          value: JSON.stringify({
            current: agent.currentJobs || 0,
            max: agent.maxConcurrentJobs || 1
          }),
          metadata: JSON.stringify({
            name: agent.name
          }),
          createdAt
        })

        // Parse system info for CPU/Memory if available
        if (agent.systemInfo) {
          try {
            const systemInfo = typeof agent.systemInfo === 'string'
              ? JSON.parse(agent.systemInfo)
              : agent.systemInfo

            if (systemInfo.cpuUsage !== undefined) {
              metrics.push({
                id: uuidv4(),
                timestamp,
                metricType: 'agent_cpu',
                agentId: agent.id,
                value: JSON.stringify({ percent: systemInfo.cpuUsage }),
                metadata: JSON.stringify({
                  name: agent.name,
                  cores: systemInfo.cpuCount
                }),
                createdAt
              })
            }

            if (systemInfo.memoryUsage !== undefined) {
              metrics.push({
                id: uuidv4(),
                timestamp,
                metricType: 'agent_memory',
                agentId: agent.id,
                value: JSON.stringify({
                  percent: systemInfo.memoryUsage,
                  used: systemInfo.usedMemory,
                  total: systemInfo.totalMemory
                }),
                metadata: JSON.stringify({
                  name: agent.name
                }),
                createdAt
              })
            }

            if (systemInfo.diskUsage !== undefined) {
              metrics.push({
                id: uuidv4(),
                timestamp,
                metricType: 'agent_disk',
                agentId: agent.id,
                value: JSON.stringify({
                  percent: systemInfo.diskUsage,
                  used: systemInfo.diskUsed,
                  total: systemInfo.diskTotal,
                  free: systemInfo.diskFree
                }),
                metadata: JSON.stringify({
                  name: agent.name
                }),
                createdAt
              })
            }

            if (systemInfo.networkInterfaceCount !== undefined) {
              metrics.push({
                id: uuidv4(),
                timestamp,
                metricType: 'agent_network',
                agentId: agent.id,
                value: JSON.stringify({
                  interfaceCount: systemInfo.networkInterfaceCount,
                  activeInterfaces: systemInfo.activeInterfaces || 0,
                  ipv4Count: systemInfo.ipv4Count || 0,
                  ipv6Count: systemInfo.ipv6Count || 0
                }),
                metadata: JSON.stringify({
                  name: agent.name,
                  networkInterfaceCount: systemInfo.networkInterfaceCount,
                  activeInterfaces: systemInfo.activeInterfaces,
                  ipv4Count: systemInfo.ipv4Count,
                  ipv6Count: systemInfo.ipv6Count
                }),
                createdAt
              })
            }
          } catch (error) {
            // Ignore parsing errors
          }
        }

        // Last heartbeat (connection health)
        if (agent.lastHeartbeat) {
          const lastHeartbeatMs = new Date(agent.lastHeartbeat).getTime()
          const ageMs = Date.now() - lastHeartbeatMs

          metrics.push({
            id: uuidv4(),
            timestamp,
            metricType: 'agent_heartbeat',
            agentId: agent.id,
            value: JSON.stringify({
              ageMs,
              lastHeartbeat: agent.lastHeartbeat
            }),
            metadata: JSON.stringify({
              name: agent.name
            }),
            createdAt
          })
        }
      })

      // Total agent count
      const onlineAgents = agents.filter(a => a.status === 'online').length
      metrics.push({
        id: uuidv4(),
        timestamp,
        metricType: 'agents_total',
        agentId: null,
        value: JSON.stringify({
          total: agents.length,
          online: onlineAgents,
          offline: agents.length - onlineAgents
        }),
        metadata: null,
        createdAt
      })

    } catch (error) {
      logger.error('Error collecting agent metrics:', error)
    }

    return metrics
  }

  /**
   * Collect API metrics from in-memory tracking
   */
  collectAPIMetrics(timestamp) {
    const metrics = []
    const createdAt = new Date().toISOString()

    try {
      // Aggregate current API metrics
      const apiData = {
        totalRequests: 0,
        endpoints: {}
      }

      this.apiMetrics.forEach((data, endpoint) => {
        apiData.totalRequests += data.count
        apiData.endpoints[endpoint] = {
          count: data.count,
          avgLatency: data.totalLatency / data.count,
          minLatency: data.minLatency,
          maxLatency: data.maxLatency
        }
      })

      // Store aggregated API metrics
      metrics.push({
        id: uuidv4(),
        timestamp,
        metricType: 'api_requests',
        agentId: null,
        value: JSON.stringify({
          total: apiData.totalRequests,
          endpoints: Object.keys(apiData.endpoints).length
        }),
        metadata: JSON.stringify({
          endpointData: apiData.endpoints
        }),
        createdAt
      })

      // Reset counters after collection
      this.apiMetrics.clear()

    } catch (error) {
      logger.error('Error collecting API metrics:', error)
    }

    return metrics
  }

  /**
   * Collect build queue metrics
   */
  async collectQueueMetrics(timestamp) {
    const metrics = []
    const createdAt = new Date().toISOString()

    try {
      // Count running builds
      const runningBuilds = await this.db
        .select()
        .from(builds)
        .where(builds.status, '=', 'running')
        .all()

      // Count queued builds
      const queuedBuilds = await this.db
        .select()
        .from(builds)
        .where(builds.status, '=', 'queued')
        .all()

      metrics.push({
        id: uuidv4(),
        timestamp,
        metricType: 'build_queue',
        agentId: null,
        value: JSON.stringify({
          running: runningBuilds.length,
          queued: queuedBuilds.length
        }),
        metadata: null,
        createdAt
      })

    } catch (error) {
      logger.error('Error collecting queue metrics:', error)
    }

    return metrics
  }

  /**
   * Track API request
   * Called from API middleware
   */
  trackAPIRequest(endpoint, latency) {
    try {
      if (!this.apiMetrics.has(endpoint)) {
        this.apiMetrics.set(endpoint, {
          count: 0,
          totalLatency: 0,
          minLatency: Infinity,
          maxLatency: 0
        })
      }

      const data = this.apiMetrics.get(endpoint)
      data.count++
      data.totalLatency += latency
      data.minLatency = Math.min(data.minLatency, latency)
      data.maxLatency = Math.max(data.maxLatency, latency)

    } catch (error) {
      logger.error('Error tracking API request:', error)
    }
  }

  /**
   * Insert metrics into database
   */
  async insertMetrics(metricValues) {
    try {
      await this.db.insert(metrics).values(metricValues)
    } catch (error) {
      logger.error('Error inserting metrics:', error)
    }
  }

  /**
   * Clean up old metrics (older than retention period)
   */
  async cleanup() {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays)
      const cutoffISO = cutoffDate.toISOString()

      const result = await this.db
        .delete(metrics)
        .where(metrics.timestamp, '<', cutoffISO)

      logger.info(`Cleaned up metrics older than ${this.retentionDays} days (deleted ${result.changes || 0} records)`)
    } catch (error) {
      logger.error('Error cleaning up metrics:', error)
    }
  }

  /**
   * Get summary of current metrics for WebSocket broadcast
   */
  getMetricsSummary(metrics) {
    const summary = {}

    metrics.forEach(metric => {
      try {
        const value = JSON.parse(metric.value)
        summary[metric.metricType] = value
      } catch (error) {
        // Ignore parse errors
      }
    })

    return summary
  }

  /**
   * Get current collection status
   */
  getStatus() {
    return {
      isRunning: this.intervalId !== null,
      collectionInterval: this.collectionInterval,
      retentionDays: this.retentionDays,
      apiMetricsCount: this.apiMetrics.size
    }
  }
}

export default MetricsCollector
