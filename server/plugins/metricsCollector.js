/**
 * Metrics Collector Plugin
 * Initializes the metrics collection system
 */

import { MetricsCollector } from '~/server/utils/metricsCollector.js'
import { getAgentManager } from '~/server/utils/agentManager.js'
import { getDB } from '~/server/utils/database.js'
import logger from '~/server/utils/logger.js'

let metricsCollectorInstance = null

export default defineNitroPlugin(async (nitroApp) => {
  try {
    logger.info('Initializing metrics collector...')

    // Wait for database and websocket to be ready
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Get dependencies
    const db = await getDB()
    const agentManager = await getAgentManager()
    const io = globalThis.socketIO

    if (!db) {
      logger.error('Database manager not available - metrics collection disabled')
      return
    }

    if (!io) {
      logger.warn('WebSocket server not available - metrics will not broadcast real-time updates')
    }

    // Create metrics collector instance
    metricsCollectorInstance = new MetricsCollector(db, agentManager, io)

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
        metricsCollectorInstance.trackAPIRequest(endpoint, latency)
      }
    })

    // Start collection
    metricsCollectorInstance.start()

    // Store globally for access from API endpoints
    globalThis.metricsCollector = metricsCollectorInstance

    logger.info('Metrics collector initialized and started successfully')

    // Handle shutdown
    nitroApp.hooks.hook('close', () => {
      if (metricsCollectorInstance) {
        logger.info('Stopping metrics collector...')
        metricsCollectorInstance.stop()
      }
    })

  } catch (error) {
    logger.error('Error initializing metrics collector:', error)
  }
})

/**
 * Get metrics collector instance
 */
export function getMetricsCollector() {
  return metricsCollectorInstance || globalThis.metricsCollector
}

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
