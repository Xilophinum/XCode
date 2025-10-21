import { getBuildStatsManager } from '../../../../server/utils/buildStatsManager.js'

export default defineEventHandler(async (event) => {
  const { projectId } = getRouterParams(event)
  const query = getQuery(event)
  
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  try {
    const buildStatsManager = await getBuildStatsManager()
    
    const options = {
      page: parseInt(query.page) || 1,
      pageSize: parseInt(query.pageSize) || 20,
      status: query.status || null,
      startDate: query.startDate || null,
      endDate: query.endDate || null
    }

    const result = await buildStatsManager.getProjectBuilds(projectId, options)
    
    return {
      success: true,
      ...result
    }
  } catch (error) {
    console.error('Error getting project builds:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get builds'
    })
  }
})