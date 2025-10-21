import { getBuildStatsManager } from '../../../../server/utils/buildStatsManager.js'

/**
 * GET /api/projects/[projectId]/retention
 * Get project retention settings
 */
export default defineEventHandler(async (event) => {
  const { projectId } = getRouterParams(event)
  
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  try {
    const buildStatsManager = await getBuildStatsManager()
    const stats = await buildStatsManager.getProjectStats(projectId)
    
    return {
      success: true,
      retention: {
        maxBuildsToKeep: stats.maxBuildsToKeep,
        maxLogDays: stats.maxLogDays
      }
    }
  } catch (error) {
    console.error('Error getting project retention settings:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get retention settings'
    })
  }
})