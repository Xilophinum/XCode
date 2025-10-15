/**
 * POST /api/projects/[projectId]/builds/[buildId]/cancel
 * Cancel a running build
 */

import { getAgentManager } from '~/server/utils/agentManager.js'
import { jobManager } from '~/server/utils/jobManager.js'

export default defineEventHandler(async (event) => {
  try {
    const projectId = getRouterParam(event, 'projectId')
    const buildId = getRouterParam(event, 'buildId')

    if (!projectId || !buildId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Project ID and Build ID are required'
      })
    }

    // Get running job for this build
    const job = await jobManager.getJob(buildId)
    if (!job) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Build not found or not running'
      })
    }

    if (!['queued', 'dispatched', 'running'].includes(job.status)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Build is not in a cancellable state'
      })
    }

    // Cancel via agent manager
    const agentManager = await getAgentManager()
    const success = await agentManager.cancelJobOnAgent(job.agentId, buildId)

    if (!success) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to cancel build'
      })
    }

    // Update job status to cancelled
    await jobManager.updateJob(buildId, {
      status: 'cancelled',
      message: 'Build cancelled by user',
      completedAt: new Date().toISOString()
    })

    return {
      success: true,
      buildId,
      message: 'Build cancellation requested'
    }

  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to cancel build'
    })
  }
})