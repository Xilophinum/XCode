/**
 * GET /api/admin/metrics/server
 * Retrieve server metrics (CPU, memory, WebSocket connections, uptime)
 *
 * Query params:
 *   from: ISO timestamp (default: 24 hours ago)
 *   to: ISO timestamp (default: now)
 *   interval: 1m, 5m, 15m, 1h (default: 5m)
 */

import { getDB, metrics as metricsSchema } from '~/server/utils/database.js'
import { and, gte, lte, inArray } from 'drizzle-orm'
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

    // Metric types to fetch
    const metricTypes = [
      'server_cpu',
      'server_memory',
      'server_websocket_connections',
      'server_uptime'
    ]

    // Fetch metrics
    const metrics = await db
      .select()
      .from(metricsSchema)
      .where(and(
        gte(metricsSchema.timestamp, from.toISOString()),
        lte(metricsSchema.timestamp, to.toISOString()),
        inArray(metricsSchema.metricType, metricTypes)
      ))
      .orderBy(metricsSchema.timestamp, 'asc')
      .all()

    // Aggregate by interval
    const aggregated = aggregateMetrics(metrics, interval)

    return {
      success: true,
      data: aggregated,
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
 * Aggregate metrics by time interval
 */
function aggregateMetrics(metrics, interval) {
  const intervalMs = parseInterval(interval)
  const grouped = new Map()

  metrics.forEach(metric => {
    const timestamp = new Date(metric.timestamp)
    const bucketTime = Math.floor(timestamp.getTime() / intervalMs) * intervalMs
    const bucketKey = `${bucketTime}-${metric.metricType}`

    if (!grouped.has(bucketKey)) {
      grouped.set(bucketKey, {
        timestamp: new Date(bucketTime).toISOString(),
        metricType: metric.metricType,
        values: []
      })
    }

    try {
      const value = JSON.parse(metric.value)
      grouped.get(bucketKey).values.push(value)
    } catch (error) {
      // Ignore parse errors
    }
  })

  // Average the values in each bucket
  const result = {}
  grouped.forEach(bucket => {
    if (!result[bucket.metricType]) {
      result[bucket.metricType] = []
    }

    // Calculate average for this bucket
    const avgValue = averageValues(bucket.values, bucket.metricType)
    result[bucket.metricType].push({
      timestamp: bucket.timestamp,
      ...avgValue
    })
  })

  return result
}

/**
 * Average metric values based on type
 */
function averageValues(values, metricType) {
  if (values.length === 0) return {}

  switch (metricType) {
    case 'server_cpu':
      return {
        percent: average(values.map(v => v.percent))
      }

    case 'server_memory':
      return {
        used: average(values.map(v => v.used)),
        total: values[values.length - 1].total, // Take latest
        percent: average(values.map(v => v.percent))
      }

    case 'server_websocket_connections':
      return {
        count: Math.round(average(values.map(v => v.count)))
      }

    case 'server_uptime':
      return {
        seconds: values[values.length - 1].seconds // Take latest
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
