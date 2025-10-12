import { getBuildStatsManager } from '~/server/utils/buildStatsManager.js'

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
      stats
    }
  } catch (error) {
    console.error('Error getting project build stats:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get build stats'
    })
  }
})