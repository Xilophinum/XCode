/**
 * GET /api/admin/metrics/agents
 * Retrieve agent metrics (CPU, memory, jobs, status, heartbeat)
 *
 * Query params:
 *   from: ISO timestamp (default: 24 hours ago)
 *   to: ISO timestamp (default: now)
 *   agentId: Specific agent ID (optional)
 *   interval: 1m, 5m, 15m, 1h (default: 5m)
 */

import { getDB, metrics as metricsSchema } from '~/server/utils/database.js'
import { and, gte, lte, inArray, eq } from 'drizzle-orm'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
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
    // Metric types to fetch
    const metricTypes = [
      'agent_status',
      'agent_jobs',
      'agent_cpu',
      'agent_memory',
      'agent_heartbeat',
      'agents_total'
    ]

    // Build query conditions
    const conditions = [
      gte(metricsSchema.timestamp, from.toISOString()),
      lte(metricsSchema.timestamp, to.toISOString()),
      inArray(metricsSchema.metricType, metricTypes)
    ]

    // Filter by specific agent if requested
    if (agentId) {
      conditions.push(eq(metricsSchema.agentId, agentId))
    }

    const metrics = await db
      .select()
      .from(metricsSchema)
      .where(and(...conditions))
      .orderBy(metricsSchema.timestamp, 'asc')
      .all()

    // Aggregate by interval and agent
    const aggregated = aggregateAgentMetrics(metrics, interval, agentId)

    return {
      success: true,
      data: aggregated,
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
 * Aggregate agent metrics by time interval
 */
function aggregateAgentMetrics(metrics, interval, specificAgentId) {
  const intervalMs = parseInterval(interval)
  const grouped = new Map()

  metrics.forEach(metric => {
    const timestamp = new Date(metric.timestamp)
    const bucketTime = Math.floor(timestamp.getTime() / intervalMs) * intervalMs
    const agentKey = metric.agentId || 'global'
    const bucketKey = `${bucketTime}-${agentKey}-${metric.metricType}`

    if (!grouped.has(bucketKey)) {
      grouped.set(bucketKey, {
        timestamp: new Date(bucketTime).toISOString(),
        agentId: metric.agentId,
        metricType: metric.metricType,
        values: [],
        metadata: []
      })
    }

    try {
      const value = JSON.parse(metric.value)
      const metadata = metric.metadata ? JSON.parse(metric.metadata) : null
      grouped.get(bucketKey).values.push(value)
      if (metadata) {
        grouped.get(bucketKey).metadata.push(metadata)
      }
    } catch (error) {
      // Ignore parse errors
    }
  })

  // Organize by agent
  const result = {}

  grouped.forEach(bucket => {
    const agentKey = bucket.agentId || 'global'

    if (!result[agentKey]) {
      result[agentKey] = {}
    }

    if (!result[agentKey][bucket.metricType]) {
      result[agentKey][bucket.metricType] = []
    }

    // Calculate average/aggregate for this bucket
    const aggValue = averageAgentValues(bucket.values, bucket.metricType)

    // Include agent name from metadata if available
    const agentName = bucket.metadata.length > 0 && bucket.metadata[0].name
      ? bucket.metadata[0].name
      : null

    result[agentKey][bucket.metricType].push({
      timestamp: bucket.timestamp,
      agentName,
      ...aggValue
    })
  })

  return result
}

/**
 * Average agent metric values based on type
 */
function averageAgentValues(values, metricType) {
  if (values.length === 0) return {}

  switch (metricType) {
    case 'agent_cpu':
      return {
        percent: average(values.map(v => v.percent))
      }

    case 'agent_memory':
      return {
        percent: average(values.map(v => v.percent)),
        used: average(values.map(v => v.used || 0)),
        total: values[values.length - 1].total
      }

    case 'agent_jobs':
      return {
        current: Math.round(average(values.map(v => v.current))),
        max: values[values.length - 1].max
      }

    case 'agent_status':
      // Take most recent status
      return {
        status: values[values.length - 1].status,
        isOnline: values[values.length - 1].isOnline
      }

    case 'agent_heartbeat':
      return {
        ageMs: average(values.map(v => v.ageMs)),
        lastHeartbeat: values[values.length - 1].lastHeartbeat
      }

    case 'agents_total':
      return {
        total: Math.round(average(values.map(v => v.total))),
        online: Math.round(average(values.map(v => v.online))),
        offline: Math.round(average(values.map(v => v.offline)))
      }

    default:
      return values[values.length - 1]
  }
}

/**
 * Calculate average of array
 */
function average(arr) {
  if (arr.length === 0) return 0
  return Math.round((arr.reduce((sum, val) => sum + val, 0) / arr.length) * 100) / 100
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
