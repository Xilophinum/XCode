import { getBuildStatsManager } from '~/server/utils/buildStatsManager.js'

export default defineEventHandler(async (event) => {
  const { projectId, buildId } = getRouterParams(event)
  const body = await readBody(event)
  
  if (!projectId || !buildId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID and Build ID are required'
    })
  }

  try {
    const buildStatsManager = await getBuildStatsManager()
    
    if (body.type === 'finish') {
      // Finish the build
      await buildStatsManager.finishBuild(buildId, {
        status: body.status,
        message: body.message,
        nodesExecuted: body.nodesExecuted
      })
    } else if (body.type === 'log') {
      // Add a log entry
      await buildStatsManager.addBuildLog(buildId, {
        nodeId: body.nodeId,
        level: body.level,
        message: body.message,
        command: body.command,
        output: body.output,
        source: body.source,
        timestamp: body.timestamp,
        metadata: body.metadata
      })
    }
    
    return {
      success: true
    }
  } catch (error) {
    console.error('Error updating build:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update build'
    })
  }
})