import { getBuildStatsManager } from '../../../../server/utils/buildStatsManager.js'

export default defineEventHandler(async (event) => {
  const { projectId } = getRouterParams(event)
  const body = await readBody(event)
  
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  try {
    const buildStatsManager = await getBuildStatsManager()
    
    const buildData = {
      projectId,
      agentId: body.agentId,
      agentName: body.agentName,
      jobId: body.jobId,
      trigger: body.trigger || 'manual',
      message: body.message,
      nodeCount: body.nodeCount,
      branch: body.branch,
      commit: body.commit,
      metadata: body.metadata
    }

    const buildResult = await buildStatsManager.startBuild(buildData)

    return {
      success: true,
      projectId: buildResult.projectId,
      buildNumber: buildResult.buildNumber
    }
  } catch (error) {
    console.error('Error starting build:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to start build'
    })
  }
})