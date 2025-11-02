/**
 * GET /api/admin/metrics/summary
 * Retrieve current snapshot of all system metrics (real-time dashboard view)
 */

import { getAgentManager } from '~/server/utils/agentManager.js'
import { getMetricsCollector } from '~/server/plugins/metricsCollector.js'
import { getDB, builds as buildsSchema, metrics as metricsSchema } from '~/server/utils/database.js'
import { and, gte, eq } from 'drizzle-orm'
import logger from '~/server/utils/logger.js'
import os from 'os'

export default defineEventHandler(async (event) => {
  try {
    const db = await getDB()
    const agentManager = await getAgentManager()
    const metricsCollector = getMetricsCollector()

    if (!db) {
      return {
        success: false,
        error: 'Database not initialized'
      }
    }

    // Get current server metrics
    const serverMetrics = getCurrentServerMetrics()

    // Get current agent metrics
    const agentMetrics = getCurrentAgentMetrics(agentManager)

    // Get recent build statistics (last 24 hours)
    const buildMetrics = await getRecentBuildMetrics(db)

    // Get API performance (last hour)
    const apiMetrics = await getRecentAPIMetrics(db)

    // Get metrics collector status
    const collectorStatus = metricsCollector
      ? metricsCollector.getStatus()
      : { isRunning: false }

    return {
      success: true,
      data: {
        server: serverMetrics,
        agents: agentMetrics,
        builds: buildMetrics,
        api: apiMetrics,
        collector: collectorStatus
      },
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    logger.error('Error fetching metrics summary:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

/**
 * Get current server system metrics
 */
function getCurrentServerMetrics() {
  try {
    // CPU
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

    // Memory
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const memPercent = (usedMem / totalMem) * 100

    // WebSocket connections
    const wsConnections = globalThis.socketIO?.engine?.clientsCount || 0

    return {
      cpu: {
        percent: Math.round(cpuUsage * 100) / 100,
        cores: cpus.length
      },
      memory: {
        used: Math.round(usedMem / 1024 / 1024), // MB
        total: Math.round(totalMem / 1024 / 1024), // MB
        percent: Math.round(memPercent * 100) / 100
      },
      websocket: {
        connections: wsConnections
      },
      uptime: {
        seconds: os.uptime()
      },
      platform: os.platform(),
      hostname: os.hostname()
    }
  } catch (error) {
    logger.error('Error getting server metrics:', error)
    return {}
  }
}

/**
 * Get current agent metrics
 */
function getCurrentAgentMetrics(agentManager) {
  try {
    const agents = agentManager?.getAllAgents() || []

    const onlineAgents = agents.filter(a => a.status === 'online')
    const offlineAgents = agents.filter(a => a.status === 'offline')

    const totalJobs = agents.reduce((sum, a) => sum + (a.currentJobs || 0), 0)
    const maxJobs = agents.reduce((sum, a) => sum + (a.maxConcurrentJobs || 1), 0)

    return {
      total: agents.length,
      online: onlineAgents.length,
      offline: offlineAgents.length,
      jobs: {
        current: totalJobs,
        max: maxJobs,
        utilization: maxJobs > 0 ? Math.round((totalJobs / maxJobs) * 100) : 0
      },
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        currentJobs: agent.currentJobs || 0,
        maxJobs: agent.maxConcurrentJobs || 1,
        platform: agent.platform,
        lastHeartbeat: agent.lastHeartbeat
      }))
    }
  } catch (error) {
    logger.error('Error getting agent metrics:', error)
    return {
      total: 0,
      online: 0,
      offline: 0,
      jobs: { current: 0, max: 0, utilization: 0 },
      agents: []
    }
  }
}

/**
 * Get recent build metrics (last 24 hours)
 */
async function getRecentBuildMetrics(db) {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const recentBuilds = await db
      .select()
      .from(buildsSchema)
      .where(gte(buildsSchema.startedAt, cutoff))
      .all()

    const total = recentBuilds.length
    const success = recentBuilds.filter(b => b.status === 'success').length
    const failure = recentBuilds.filter(b => b.status === 'failure').length
    const running = recentBuilds.filter(b => b.status === 'running').length
    const cancelled = recentBuilds.filter(b => b.status === 'cancelled').length

    const successRate = total > 0 ? Math.round((success / total) * 100 * 100) / 100 : 0

    // Calculate average duration
    const durations = recentBuilds
      .filter(b => b.duration)
      .map(b => b.duration)

    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : 0

    return {
      last24Hours: {
        total,
        success,
        failure,
        running,
        cancelled,
        successRate,
        avgDuration
      }
    }
  } catch (error) {
    logger.error('Error getting build metrics:', error)
    return {
      last24Hours: {
        total: 0,
        success: 0,
        failure: 0,
        running: 0,
        cancelled: 0,
        successRate: 0,
        avgDuration: 0
      }
    }
  }
}

/**
 * Get recent API metrics (last hour)
 */
async function getRecentAPIMetrics(db) {
  try {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const apiMetrics = await db
      .select()
      .from(metricsSchema)
      .where(and(
        gte(metricsSchema.timestamp, cutoff),
        eq(metricsSchema.metricType, 'api_requests')
      ))
      .all()

    let totalRequests = 0
    const allLatencies = []

    apiMetrics.forEach(metric => {
      try {
        const value = JSON.parse(metric.value)
        const metadata = metric.metadata ? JSON.parse(metric.metadata) : null

        totalRequests += value.total || 0

        if (metadata && metadata.endpointData) {
          Object.values(metadata.endpointData).forEach(stats => {
            if (stats.avgLatency) {
              allLatencies.push(stats.avgLatency)
            }
          })
        }
      } catch (error) {
        // Ignore parse errors
      }
    })

    const avgLatency = allLatencies.length > 0
      ? Math.round((allLatencies.reduce((sum, l) => sum + l, 0) / allLatencies.length) * 100) / 100
      : 0

    return {
      lastHour: {
        totalRequests,
        avgLatency
      }
    }
  } catch (error) {
    logger.error('Error getting API metrics:', error)
    return {
      lastHour: {
        totalRequests: 0,
        avgLatency: 0
      }
    }
  }
}
