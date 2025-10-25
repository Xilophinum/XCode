import { getBuildStatsManager } from "~/server/utils/buildStatsManager"
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    const user = await getAuthenticatedUser(event)
    if (!user.userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
    const buildStatsManager = await getBuildStatsManager()
    const stats = await buildStatsManager.getAllBuildStats()
    return stats
  } catch (error) {
    logger.error('Error in /api/projects/stats:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch project stats: ' + error.message
    })
  }
})