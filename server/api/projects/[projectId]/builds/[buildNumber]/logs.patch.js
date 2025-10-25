import { getBuildStatsManager } from '~/server/utils/buildStatsManager.js'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  const { projectId, buildNumber: buildNumberStr } = getRouterParams(event)
  const buildNumber = parseInt(buildNumberStr)
  const body = await readBody(event)

  if (!projectId || !buildNumber) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID and Build Number are required'
    })
  }

  try {
    const buildStatsManager = await getBuildStatsManager()

    if (body.type === 'finish') {
      // Finish the build
      await buildStatsManager.finishBuild(projectId, buildNumber, {
        status: body.status,
        message: body.message,
        nodesExecuted: body.nodesExecuted
      })
    } else if (body.type === 'log') {
      // Add a log entry
      await buildStatsManager.addBuildLog(projectId, buildNumber, {
        nodeId: body.nodeId,
        nodeLabel: body.nodeLabel,
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
    logger.error('Error updating build:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update build'
    })
  }
})