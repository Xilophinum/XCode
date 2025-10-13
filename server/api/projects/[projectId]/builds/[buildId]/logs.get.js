import { getBuildStatsManager } from '../../../../../../server/utils/buildStatsManager.js'

export default defineEventHandler(async (event) => {
  const { projectId, buildId } = getRouterParams(event)
  
  if (!projectId || !buildId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID and Build ID are required'
    })
  }

  try {
    const buildStatsManager = await getBuildStatsManager()
    const logs = await buildStatsManager.getBuildLogs(buildId)
    
    return {
      success: true,
      logs
    }
  } catch (error) {
    console.error('Error getting build logs:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get build logs'
    })
  }
})