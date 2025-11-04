/**
 * GET /api/admin/metrics/summary
 * Retrieve current snapshot of all system metrics (real-time dashboard view)
 * Uses MetricsBuffer for real-time data
 */

import { getAgentManager } from '~/server/utils/agentManager.js'
import { getDB, builds as buildsSchema } from '~/server/utils/database.js'
import { gte } from 'drizzle-orm'
import logger from '~/server/utils/logger.js'
import { getAuthenticatedUser } from '~/server/utils/auth.js'

export default defineEventHandler(async (event) => {
  try {
    // Verify user is authenticated and is admin
    const user = await getAuthenticatedUser(event)
    if (!user || user.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Admin access required'
      })
    }

    const db = await getDB()
    if (!db) {
      return {
        success: false,
        error: 'Database not initialized'
      }
    }

    // Get real-time metrics from buffer
    const metricsBuffer = globalThis.metricsBuffer
    const summary = metricsBuffer ? metricsBuffer.getSummary() : null

    if (!summary) {
      return {
        success: false,
        error: 'Metrics buffer not initialized'
      }
    }

    // Get agent manager for additional agent details
    const agentManager = await getAgentManager()
    const agents = agentManager?.getAllAgents() || []

    // Get buffered agent metrics
    const bufferedAgentMetrics = metricsBuffer ? metricsBuffer.agentMetrics : new Map()

    // Enhance agent data with full details and real-time metrics
    const agentsList = agents.map(agent => {
      const agentId = agent.agentId || agent.id
      const metrics = bufferedAgentMetrics.get(agentId)

      return {
        id: agentId,
        name: agent.name,
        status: agent.status,
        currentJobs: agent.currentJobs || 0,
        maxJobs: agent.maxConcurrentJobs || agent.maxJobs || 1,
        platform: agent.platform,
        hostname: agent.hostname,
        lastHeartbeat: agent.lastHeartbeat,
        systemMetrics: metrics ? {
          cpuUsage: metrics.cpuUsage || 0,
          memoryUsage: metrics.memoryUsage || 0,
          diskUsage: metrics.diskUsage || 0,
          platform: metrics.platform || agent.platform,
          uptime: metrics.uptime || 0,
          cpuCount: metrics.cpuCount,
          usedMemory: metrics.usedMemory,
          totalMemory: metrics.totalMemory,
          diskUsed: metrics.diskUsed,
          diskTotal: metrics.diskTotal,
          diskFree: metrics.diskFree,
          process: metrics.process
        } : null
      }
    })

    // Get recent build statistics (last 24 hours)
    const buildMetrics = await getRecentBuildMetrics(db)

    // Get metrics buffer status
    const bufferStatus = metricsBuffer ? metricsBuffer.getStatus() : { isRunning: false }

    return {
      success: true,
      data: {
        server: summary.server,
        agents: {
          ...summary.agents,
          agents: agentsList
        },
        builds: buildMetrics,
        api: summary.api,
        buffer: bufferStatus
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
