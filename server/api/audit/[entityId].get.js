import { getDataService } from '../../utils/dataService.js'
import { getAuthenticatedUser } from '../../utils/auth.js'
import logger from '~/server/utils/logger.js'

/**
 * Get audit logs for a specific entity (folder or project)
 * GET /api/audit/:entityId?limit=50
 */
export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    await getAuthenticatedUser(event)

    const entityId = getRouterParam(event, 'entityId')
    const query = getQuery(event)
    const limit = parseInt(query.limit) || 50

    const dataService = await getDataService()
    const logs = await dataService.auditLogger.getEntityLogs(entityId, limit)

    return {
      success: true,
      entityId,
      logs,
      total: logs.length
    }
  } catch (error) {
    logger.error('Error fetching audit logs:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch audit logs'
    })
  }
})
