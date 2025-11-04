/**
 * Metrics Collector Plugin
 * Initializes the metrics buffer system and API request tracking
 */

import logger from '~/server/utils/logger.js'

export default defineNitroPlugin(async (nitroApp) => {
  try {
    logger.info('Initializing API metrics tracking...')

    // In-memory API request tracking (similar to old collector)
    const apiMetrics = new Map()

    // Add request/response hooks for API tracking
    nitroApp.hooks.hook('request', (event) => {
      // Only track API endpoints
      const path = event.node.req.url
      if (!path || !path.startsWith('/api/')) {
        return
      }

      // Record start time and path in event context
      event.context.metricsStartTime = Date.now()
      event.context.metricsPath = path
    })

    nitroApp.hooks.hook('afterResponse', (event) => {
      // Track completed requests
      if (event.context.metricsStartTime && event.context.metricsPath) {
        const latency = Date.now() - event.context.metricsStartTime
        const endpoint = normalizeEndpoint(event.context.metricsPath)

        // Track in-memory
        if (!apiMetrics.has(endpoint)) {
          apiMetrics.set(endpoint, {
            count: 0,
            totalLatency: 0,
            minLatency: Infinity,
            maxLatency: 0
          })
        }

        const data = apiMetrics.get(endpoint)
        data.count++
        data.totalLatency += latency
        data.minLatency = Math.min(data.minLatency, latency)
        data.maxLatency = Math.max(data.maxLatency, latency)
      }
    })

    // Periodically flush to MetricsBuffer (every 30 seconds)
    setInterval(() => {
      if (globalThis.metricsBuffer && apiMetrics.size > 0) {
        // Calculate aggregated stats
        let totalRequests = 0
        const endpoints = {}

        apiMetrics.forEach((data, endpoint) => {
          totalRequests += data.count
          endpoints[endpoint] = {
            count: data.count,
            avgLatency: data.totalLatency / data.count,
            minLatency: data.minLatency === Infinity ? 0 : data.minLatency,
            maxLatency: data.maxLatency
          }
        })

        const avgLatency = totalRequests > 0
          ? Array.from(apiMetrics.values()).reduce((sum, d) => sum + d.totalLatency, 0) / totalRequests
          : 0

        // Add to buffer
        globalThis.metricsBuffer.addAPIMetrics(totalRequests, avgLatency, endpoints)

        // Clear the map for next interval
        apiMetrics.clear()
      }
    }, 30000) // 30 seconds

    logger.info('API metrics tracking initialized successfully')

  } catch (error) {
    logger.error('Error initializing API metrics tracking:', error)
  }
})

/**
 * Normalize endpoint path for better aggregation
 * Examples:
 *   /api/projects/abc-123/builds -> /api/projects/:id/builds
 *   /api/admin/agents/xyz-456 -> /api/admin/agents/:id
 *   /api/builds/failed?page=2 -> /api/builds/failed
 */
function normalizeEndpoint(path) {
  try {
    // Remove query parameters
    const cleanPath = path.split('?')[0]

    // Replace UUIDs and numeric IDs with :id
    const normalized = cleanPath
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:id') // Long alphanumeric strings

    return normalized
  } catch (error) {
    return path
  }
}
