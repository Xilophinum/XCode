import { getDataService } from '../../../utils/dataService.js'
import { getAuthenticatedUser } from '../../../utils/auth.js'
import logger from '~/server/utils/logger.js'
/**
 * Get all snapshots for a project
 * GET /api/projects/:projectId/snapshots?limit=20
 */
export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    await getAuthenticatedUser(event)

    const projectId = getRouterParam(event, 'projectId')
    const query = getQuery(event)
    const limit = parseInt(query.limit) || 20

    const dataService = await getDataService()
    const snapshots = await dataService.auditLogger.getProjectSnapshots(projectId, limit)

    return {
      success: true,
      projectId,
      snapshots,
      total: snapshots.length
    }
  } catch (error) {
    logger.error('Error fetching project snapshots:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch project snapshots'
    })
  }
})
