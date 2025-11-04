/**
 * GET /api/admin/metrics/api-performance
 * Retrieve API performance metrics from consolidated storage
 *
 * Query params:
 *   from: ISO timestamp (default: 24 hours ago)
 *   to: ISO timestamp (default: now)
 *   interval: 1m, 5m, 15m, 1h (default: 5m)
 */

import { getDB, metrics as metricsSchema } from '~/server/utils/database.js'
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

    // Query consolidated API metrics
    const conditions = [
      gte(metricsSchema.timestamp, from.toISOString()),
      lte(metricsSchema.timestamp, to.toISOString()),
      eq(metricsSchema.entityType, 'api')
    ]

    const metrics = await db
      .select()
      .from(metricsSchema)
      .where(and(...conditions))
      .orderBy(metricsSchema.timestamp)
      .all()

    // Aggregate and analyze
    const aggregated = aggregateAPIMetrics(metrics, interval)
    const endpointStats = calculateEndpointStats(metrics)
    const summary = calculateAPISummary(metrics)

    return {
      success: true,
      data: {
        timeSeries: aggregated,
        endpoints: endpointStats,
        summary
      },
      meta: {
        from: from.toISOString(),
        to: to.toISOString(),
        interval,
        count: metrics.length
      }
    }

  } catch (error) {
    logger.error('Error fetching API performance metrics:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

/**
 * Aggregate API metrics by time interval
 */
function aggregateAPIMetrics(metrics, interval) {
  const intervalMs = parseInterval(interval)
  const grouped = new Map()

  metrics.forEach(metric => {
    const timestamp = new Date(metric.timestamp)
    const bucketTime = Math.floor(timestamp.getTime() / intervalMs) * intervalMs
    const bucketKey = bucketTime.toString()

    if (!grouped.has(bucketKey)) {
      grouped.set(bucketKey, {
        timestamp: new Date(bucketTime).toISOString(),
        totalRequests: 0,
        endpoints: []
      })
    }

    try {
      const metricsData = JSON.parse(metric.metrics)
      const bucket = grouped.get(bucketKey)
      bucket.totalRequests += metricsData.totalRequests || 0
      if (metricsData.endpoints) {
        bucket.endpoints.push(metricsData.endpoints)
      }
    } catch (error) {
      // Ignore parse errors
    }
  })

  // Convert to array and calculate aggregate endpoint stats
  const result = []
  grouped.forEach(bucket => {
    result.push({
      timestamp: bucket.timestamp,
      totalRequests: bucket.totalRequests,
      endpoints: bucket.endpoints.length
    })
  })

  return result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

/**
 * Calculate per-endpoint statistics
 */
function calculateEndpointStats(metrics) {
  const endpointMap = new Map()

  metrics.forEach(metric => {
    try {
      const metricsData = JSON.parse(metric.metrics)
      if (!metricsData || !metricsData.endpoints) return

      Object.entries(metricsData.endpoints).forEach(([endpoint, stats]) => {
        if (!endpointMap.has(endpoint)) {
          endpointMap.set(endpoint, {
            endpoint,
            totalRequests: 0,
            latencies: [],
            minLatency: Infinity,
            maxLatency: 0
          })
        }

        const data = endpointMap.get(endpoint)
        data.totalRequests += stats.count || 0
        data.latencies.push(stats.avgLatency)
        data.minLatency = Math.min(data.minLatency, stats.minLatency || Infinity)
        data.maxLatency = Math.max(data.maxLatency, stats.maxLatency || 0)
      })
    } catch (error) {
      // Ignore parse errors
    }
  })

  // Calculate averages and convert to array
  const result = []
  endpointMap.forEach(data => {
    const avgLatency = data.latencies.length > 0
      ? Math.round((data.latencies.reduce((sum, l) => sum + l, 0) / data.latencies.length) * 100) / 100
      : 0

    // Calculate p95 latency
    const sortedLatencies = [...data.latencies].sort((a, b) => a - b)
    const p95Index = Math.floor(sortedLatencies.length * 0.95)
    const p95Latency = sortedLatencies.length > 0
      ? Math.round(sortedLatencies[p95Index] * 100) / 100
      : 0

    result.push({
      endpoint: data.endpoint,
      totalRequests: data.totalRequests,
      avgLatency,
      p95Latency,
      minLatency: data.minLatency === Infinity ? 0 : Math.round(data.minLatency * 100) / 100,
      maxLatency: Math.round(data.maxLatency * 100) / 100
    })
  })

  // Sort by total requests descending
  return result.sort((a, b) => b.totalRequests - a.totalRequests)
}

/**
 * Calculate overall API summary
 */
function calculateAPISummary(metrics) {
  let totalRequests = 0
  const allLatencies = []
  const uniqueEndpoints = new Set()

  metrics.forEach(metric => {
    try {
      const metricsData = JSON.parse(metric.metrics)
      totalRequests += metricsData.totalRequests || 0

      if (metricsData.endpoints) {
        Object.entries(metricsData.endpoints).forEach(([endpoint, stats]) => {
          uniqueEndpoints.add(endpoint)
          if (stats.avgLatency) {
            allLatencies.push(stats.avgLatency)
          }
        })
      }
    } catch (error) {
      // Ignore parse errors
    }
  })

  // Calculate average latency
  const avgLatency = allLatencies.length > 0
    ? Math.round((allLatencies.reduce((sum, l) => sum + l, 0) / allLatencies.length) * 100) / 100
    : 0

  // Calculate p95 latency
  const sortedLatencies = [...allLatencies].sort((a, b) => a - b)
  const p95Index = Math.floor(sortedLatencies.length * 0.95)
  const p95Latency = sortedLatencies.length > 0
    ? Math.round(sortedLatencies[p95Index] * 100) / 100
    : 0

  // Calculate requests per second (approximate)
  const timeRangeSeconds = metrics.length > 0 && metrics.length > 1
    ? (new Date(metrics[metrics.length - 1].timestamp).getTime() - new Date(metrics[0].timestamp).getTime()) / 1000
    : 1

  const requestsPerSecond = timeRangeSeconds > 0
    ? Math.round((totalRequests / timeRangeSeconds) * 100) / 100
    : 0

  return {
    totalRequests,
    uniqueEndpoints: uniqueEndpoints.size,
    avgLatency,
    p95Latency,
    requestsPerSecond
  }
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
