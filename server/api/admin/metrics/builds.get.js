/**
 * GET /api/admin/metrics/builds
 * Retrieve build metrics and statistics
 *
 * Query params:
 *   from: ISO timestamp (default: 7 days ago)
 *   to: ISO timestamp (default: now)
 *   interval: 1h, 6h, 1d (default: 1h)
 */

import { getDB, builds as buildsSchema } from '~/server/utils/database.js'
import logger from '~/server/utils/logger.js'
import { and, gte, lte } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event)
    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago

    const from = query.from ? new Date(query.from) : defaultFrom
    const to = query.to ? new Date(query.to) : now
    const interval = query.interval || '1h'

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

    // Fetch builds in the time range
    const builds = await db
      .select()
      .from(buildsSchema)
      .where(
        and(
          gte(buildsSchema.startedAt, from.toISOString()),
          lte(buildsSchema.startedAt, to.toISOString())
        )
      )
      .orderBy(buildsSchema.startedAt, 'asc')
      .all()

    // Aggregate build metrics
    const aggregated = aggregateBuildMetrics(builds, interval)

    // Calculate summary statistics
    const summary = calculateBuildSummary(builds)

    return {
      success: true,
      data: {
        timeSeries: aggregated,
        summary
      },
      meta: {
        from: from.toISOString(),
        to: to.toISOString(),
        interval,
        totalBuilds: builds.length
      }
    }

  } catch (error) {
    logger.error('Error fetching build metrics:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

/**
 * Aggregate build metrics by time interval
 */
function aggregateBuildMetrics(builds, interval) {
  const intervalMs = parseInterval(interval)
  const grouped = new Map()

  builds.forEach(build => {
    const timestamp = new Date(build.startedAt)
    const bucketTime = Math.floor(timestamp.getTime() / intervalMs) * intervalMs
    const bucketKey = bucketTime.toString()

    if (!grouped.has(bucketKey)) {
      grouped.set(bucketKey, {
        timestamp: new Date(bucketTime).toISOString(),
        total: 0,
        success: 0,
        failure: 0,
        running: 0,
        cancelled: 0,
        durations: []
      })
    }

    const bucket = grouped.get(bucketKey)
    bucket.total++

    switch (build.status) {
      case 'success':
        bucket.success++
        break
      case 'failure':
        bucket.failure++
        break
      case 'running':
        bucket.running++
        break
      case 'cancelled':
        bucket.cancelled++
        break
    }

    // Track durations for completed builds
    if (build.duration) {
      bucket.durations.push(build.duration)
    }
  })

  // Calculate averages and convert to array
  const result = []
  grouped.forEach(bucket => {
    const avgDuration = bucket.durations.length > 0
      ? Math.round(bucket.durations.reduce((sum, d) => sum + d, 0) / bucket.durations.length)
      : 0

    const successRate = bucket.total > 0
      ? Math.round((bucket.success / bucket.total) * 100 * 100) / 100
      : 0

    result.push({
      timestamp: bucket.timestamp,
      total: bucket.total,
      success: bucket.success,
      failure: bucket.failure,
      running: bucket.running,
      cancelled: bucket.cancelled,
      avgDuration,
      successRate
    })
  })

  return result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

/**
 * Calculate summary statistics for builds
 */
function calculateBuildSummary(builds) {
  const summary = {
    total: builds.length,
    success: 0,
    failure: 0,
    running: 0,
    cancelled: 0,
    successRate: 0,
    avgDuration: 0,
    medianDuration: 0,
    minDuration: Infinity,
    maxDuration: 0,
    totalDuration: 0,
    byProject: {},
    byAgent: {},
    byTrigger: {}
  }

  const durations = []

  builds.forEach(build => {
    // Status counts
    switch (build.status) {
      case 'success':
        summary.success++
        break
      case 'failure':
        summary.failure++
        break
      case 'running':
        summary.running++
        break
      case 'cancelled':
        summary.cancelled++
        break
    }

    // Duration stats
    if (build.duration) {
      durations.push(build.duration)
      summary.totalDuration += build.duration
      summary.minDuration = Math.min(summary.minDuration, build.duration)
      summary.maxDuration = Math.max(summary.maxDuration, build.duration)
    }

    // By project
    if (!summary.byProject[build.projectId]) {
      summary.byProject[build.projectId] = {
        projectName: build.projectName,
        total: 0,
        success: 0,
        failure: 0
      }
    }
    summary.byProject[build.projectId].total++
    if (build.status === 'success') summary.byProject[build.projectId].success++
    if (build.status === 'failure') summary.byProject[build.projectId].failure++

    // By agent
    if (build.agentId) {
      if (!summary.byAgent[build.agentId]) {
        summary.byAgent[build.agentId] = {
          agentName: build.agentName,
          total: 0,
          success: 0,
          failure: 0
        }
      }
      summary.byAgent[build.agentId].total++
      if (build.status === 'success') summary.byAgent[build.agentId].success++
      if (build.status === 'failure') summary.byAgent[build.agentId].failure++
    }

    // By trigger
    if (!summary.byTrigger[build.trigger]) {
      summary.byTrigger[build.trigger] = 0
    }
    summary.byTrigger[build.trigger]++
  })

  // Calculate rates and averages
  summary.successRate = summary.total > 0
    ? Math.round((summary.success / summary.total) * 100 * 100) / 100
    : 0

  summary.avgDuration = durations.length > 0
    ? Math.round(summary.totalDuration / durations.length)
    : 0

  // Calculate median duration
  if (durations.length > 0) {
    durations.sort((a, b) => a - b)
    const mid = Math.floor(durations.length / 2)
    summary.medianDuration = durations.length % 2 === 0
      ? Math.round((durations[mid - 1] + durations[mid]) / 2)
      : durations[mid]
  }

  // Fix infinity if no durations
  if (summary.minDuration === Infinity) {
    summary.minDuration = 0
  }

  return summary
}

/**
 * Parse interval string to milliseconds
 */
function parseInterval(interval) {
  const units = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  }
  return units[interval] || units['1h']
}
