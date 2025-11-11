/**
 * GET /api/admin/metrics/agents
 * Retrieve agent metrics from consolidated storage
 *
 * Query params:
 *   from: ISO timestamp (default: 24 hours ago)
 *   to: ISO timestamp (default: now)
 *   agentId: Specific agent ID (optional)
 *   interval: 1m, 5m, 15m, 1h (default: 5m)
 */

import { getDB, metrics as metricsSchema, agents as agentsSchema } from '~/server/utils/database.js'
import { and, gte, lte, eq } from 'drizzle-orm'
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

    // Get query parameters
    const query = getQuery(event)
    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago

    const from = query.from ? new Date(query.from) : defaultFrom
    const to = query.to ? new Date(query.to) : now
    const agentId = query.agentId || null
    const interval = query.interval || '5m'

    // Validate dates
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return {
        success: false,
        error: 'Invalid date format'
      }
    }

    const db = await getDB()
    if (!db) {
      return {
        success: false,
        error: 'Database not initialized'
      }
    }

    // Get all current agents to cross-reference with metrics
    const currentAgents = await db
      .select()
      .from(agentsSchema)
      .execute()
    
    const currentAgentIds = new Set(currentAgents.map(a => a.id))
    const agentStatusMap = new Map(currentAgents.map(a => [a.id, a.status]))

    // Build query conditions for agent metrics
    const conditions = [
      gte(metricsSchema.timestamp, from.toISOString()),
      lte(metricsSchema.timestamp, to.toISOString()),
      eq(metricsSchema.entityType, 'agent')
    ]

    // Filter by specific agent if requested
    if (agentId) {
      conditions.push(eq(metricsSchema.entityId, agentId))
    }

    const metrics = await db
      .select()
      .from(metricsSchema)
      .where(and(...conditions))
      .orderBy(metricsSchema.timestamp)
      .execute()

    // Also fetch global agent totals
    const globalConditions = [
      gte(metricsSchema.timestamp, from.toISOString()),
      lte(metricsSchema.timestamp, to.toISOString()),
      eq(metricsSchema.entityType, 'agents_total')
    ]

    const globalMetrics = await db
      .select()
      .from(metricsSchema)
      .where(and(...globalConditions))
      .orderBy(metricsSchema.timestamp)
      .execute()

    // Transform to frontend format
    const transformed = transformAgentMetrics(metrics, globalMetrics, interval, currentAgentIds, agentStatusMap)

    return {
      success: true,
      data: transformed,
      meta: {
        from: from.toISOString(),
        to: to.toISOString(),
        interval,
        agentId: agentId || 'all',
        count: metrics.length
      }
    }

  } catch (error) {
    logger.error('Error fetching agent metrics:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

/**
 * Transform consolidated metrics to frontend format
 */
function transformAgentMetrics(agentMetrics, globalMetrics, interval, currentAgentIds, agentStatusMap) {
  const result = {}

  // Process agent metrics
  agentMetrics.forEach(row => {
    const agentId = row.entityId
    const timestamp = row.timestamp

    try {
      const metricsData = JSON.parse(row.metrics)
      if (!result[agentId]) {
        result[agentId] = {
          agent_status: [],
          agent_jobs: [],
          agent_cpu: [],
          agent_memory: [],
          agent_disk: [],
          agent_network: [],
          agent_heartbeat: [],
          agent_process: []
        }
      }

      const agent = result[agentId]

      // Determine actual status - use current agent status from agents table if it exists
      const actualStatus = currentAgentIds.has(agentId) ? agentStatusMap.get(agentId) : 'offline'
      const agentExists = currentAgentIds.has(agentId)

      // Agent status
      agent.agent_status.push({
        timestamp,
        agentName: metricsData.agentName,
        platform: metricsData.platform,
        uptime: metricsData.uptime,
        status: actualStatus, // Use actual status from agents table
        isOnline: actualStatus === 'online',
        agentExists // Flag to show if agent still exists
      })

      // Agent jobs
      agent.agent_jobs.push({
        timestamp,
        agentName: metricsData.agentName,
        current: metricsData.currentJobs,
        max: metricsData.maxJobs
      })

      // CPU metrics
      if (metricsData.cpu) {
        agent.agent_cpu.push({
          timestamp,
          agentName: metricsData.agentName,
          percent: metricsData.cpu.percent
        })
      }

      // Memory metrics
      if (metricsData.memory) {
        agent.agent_memory.push({
          timestamp,
          agentName: metricsData.agentName,
          percent: metricsData.memory.percent,
          used: metricsData.memory.used,
          total: metricsData.memory.total
        })
      }

      // Disk metrics
      if (metricsData.disk) {
        agent.agent_disk.push({
          timestamp,
          agentName: metricsData.agentName,
          percent: metricsData.disk.percent,
          used: metricsData.disk.used,
          total: metricsData.disk.total,
          free: metricsData.disk.free
        })
      }

      // Network metrics
      if (metricsData.network) {
        agent.agent_network.push({
          timestamp,
          agentName: metricsData.agentName,
          interfaceCount: metricsData.network.interfaceCount,
          activeInterfaces: metricsData.network.activeInterfaces || [],
          ipv4Count: metricsData.network.ipv4Count || 0,
          ipv6Count: metricsData.network.ipv6Count || 0,
          ipv4Addresses: metricsData.network.ipv4Addresses || [],
          ipv6Addresses: metricsData.network.ipv6Addresses || []
        })
      }

      // Process metrics
      if (metricsData.process) {
        agent.agent_process.push({
          timestamp,
          agentName: metricsData.agentName,
          cpu: metricsData.process.cpu,
          memory: metricsData.process.memory,
          pid: metricsData.process.pid
        })
      }
    } catch (error) {
      logger.error('Error parsing metrics:', error)
    }
  })

  // Process global metrics (total agent counts)
  if (globalMetrics.length > 0) {
    result.global = {
      agents_total: []
    }

    globalMetrics.forEach(row => {
      try {
        const metricsData = JSON.parse(row.metrics)
        result.global.agents_total.push({
          timestamp: row.timestamp,
          total: metricsData.total,
          online: metricsData.online,
          offline: metricsData.offline
        })
      } catch (error) {
        logger.error('Error parsing global metrics:', error)
      }
    })
  }

  // Apply interval aggregation if needed
  if (interval !== '1m') {
    return aggregateByInterval(result, interval)
  }

  return result
}

/**
 * Aggregate metrics by time interval
 */
function aggregateByInterval(data, interval) {
  const intervalMs = parseInterval(interval)
  const aggregated = {}

  Object.entries(data).forEach(([agentId, agentData]) => {
    aggregated[agentId] = {}

    Object.entries(agentData).forEach(([metricType, dataPoints]) => {
      const buckets = new Map()

      dataPoints.forEach(point => {
        const timestamp = new Date(point.timestamp)
        const bucketTime = Math.floor(timestamp.getTime() / intervalMs) * intervalMs
        const bucketKey = bucketTime.toString()

        if (!buckets.has(bucketKey)) {
          buckets.set(bucketKey, [])
        }
        buckets.get(bucketKey).push(point)
      })

      // Average values within each bucket
      aggregated[agentId][metricType] = Array.from(buckets.entries()).map(([bucketTime, points]) => {
        const avgPoint = { ...points[0] } // Start with first point structure
        avgPoint.timestamp = new Date(parseInt(bucketTime)).toISOString()

        // Average numeric values
        const numericKeys = Object.keys(points[0]).filter(key =>
          typeof points[0][key] === 'number' && key !== 'timestamp'
        )

        numericKeys.forEach(key => {
          const sum = points.reduce((acc, p) => acc + (p[key] || 0), 0)
          avgPoint[key] = Math.round((sum / points.length) * 100) / 100
        })

        return avgPoint
      })
    })
  })

  return aggregated
}

/**
 * Parse interval string to milliseconds
 */
function parseInterval(interval) {
  const units = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  }
  return units[interval] || units['5m']
}
