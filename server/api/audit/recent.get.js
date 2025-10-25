import { getDataService } from '../../utils/dataService.js'
import { getAuthenticatedUser } from '../../utils/auth.js'
import logger from '~/server/utils/logger.js'

/**
 * Get recent audit logs across all entities
 * GET /api/audit/recent?limit=100&entityType=project
 */
export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    await getAuthenticatedUser(event)

    const query = getQuery(event)
    const limit = parseInt(query.limit) || 100
    const entityType = query.entityType || null

    const dataService = await getDataService()
    const logs = await dataService.auditLogger.getRecentLogs(limit, entityType)

    return {
      success: true,
      logs,
      total: logs.length,
      filters: {
        limit,
        entityType
      }
    }
  } catch (error) {
    logger.error('Error fetching recent audit logs:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch recent audit logs'
    })
  }
})
