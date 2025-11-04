/**
 * GET /api/admin/metrics/server
 * Retrieve server metrics from consolidated storage
 *
 * Query params:
 *   from: ISO timestamp (default: 24 hours ago)
 *   to: ISO timestamp (default: now)
 *   interval: 1m, 5m, 15m, 1h (default: 5m)
 */

import { getDB, metrics as metricsSchema } from '~/server/utils/database.js'
import { and, gte, lte, eq } from 'drizzle-orm'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event)
    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago

    const from = query.from ? new Date(query.from) : defaultFrom
    const to = query.to ? new Date(query.to) : now
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

    // Query consolidated server metrics
    const conditions = [
      gte(metricsSchema.timestamp, from.toISOString()),
      lte(metricsSchema.timestamp, to.toISOString()),
      eq(metricsSchema.entityType, 'server')
    ]

    const metrics = await db
      .select()
      .from(metricsSchema)
      .where(and(...conditions))
      .orderBy(metricsSchema.timestamp)
      .all()

    // Transform consolidated storage to frontend format
    const transformed = transformServerMetrics(metrics, interval)

    return {
      success: true,
      data: transformed,
      meta: {
        from: from.toISOString(),
        to: to.toISOString(),
        interval,
        count: metrics.length
      }
    }

  } catch (error) {
    logger.error('Error fetching server metrics:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

/**
 * Transform consolidated metrics to frontend format
 */
function transformServerMetrics(serverMetrics, interval) {
  const result = {
    server_cpu: [],
    server_memory: [],
    server_uptime: [],
    server_websocket_connections: [],
    server_process_cpu: [],
    server_process_memory: []
  }

  serverMetrics.forEach(row => {
    const timestamp = row.timestamp

    try {
      const metricsData = JSON.parse(row.metrics)

      // CPU metrics
      if (metricsData.cpu) {
        result.server_cpu.push({
          timestamp,
          percent: metricsData.cpu.percent,
          cores: metricsData.cpu.cores
        })
      }

      // Memory metrics
      if (metricsData.memory) {
        result.server_memory.push({
          timestamp,
          percent: metricsData.memory.percent,
          used: metricsData.memory.used,
          total: metricsData.memory.total
        })
      }

      // Uptime
      if (metricsData.uptime !== undefined) {
        result.server_uptime.push({
          timestamp,
          seconds: metricsData.uptime
        })
      }

      // WebSocket connections
      if (metricsData.wsConnections !== undefined) {
        result.server_websocket_connections.push({
          timestamp,
          count: metricsData.wsConnections
        })
      }

      // Process CPU metrics
      if (metricsData.process?.cpu !== undefined) {
        result.server_process_cpu.push({
          timestamp,
          percent: metricsData.process.cpu
        })
      }
      // Process Memory metrics
      if (metricsData.process?.memory) {

        result.server_process_memory.push({
          timestamp,
          rss: metricsData.process.memory.rss,
          heapTotal: metricsData.process.memory.heapTotal,
          heapUsed: metricsData.process.memory.heapUsed,
          external: metricsData.process.memory.external,
          arrayBuffers: metricsData.process.memory.arrayBuffers
        })
      }

    } catch (error) {
      logger.error('Error parsing server metrics:', error)
    }
  })

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

  Object.entries(data).forEach(([metricType, dataPoints]) => {
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
    aggregated[metricType] = Array.from(buckets.entries()).map(([bucketTime, points]) => {
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
