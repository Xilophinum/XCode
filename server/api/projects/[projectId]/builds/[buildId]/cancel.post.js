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

    // Get all jobs associated with this buildId (for parallel builds)
    const allJobs = Array.from(jobManager.jobs.values())
    const jobsToCancel = allJobs.filter(j => j.buildId === buildId)

    if (jobsToCancel.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Build not found or not running'
      })
    }

    // Check if any jobs are in a cancellable state
    const cancellableJobs = jobsToCancel.filter(j =>
      ['queued', 'dispatched', 'running'].includes(j.status)
    )

    if (cancellableJobs.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Build has no jobs in a cancellable state'
      })
    }

    const agentManager = await getAgentManager()
    const cancelResults = []

    // Cancel ALL jobs associated with this buildId
    for (const job of cancellableJobs) {
      try {
        const jobId = job.jobId || job.id

        // Cancel via agent manager
        const success = await agentManager.cancelJobOnAgent(job.agentId, jobId)

        if (success) {
          // Update job status to cancelled
          await jobManager.updateJob(jobId, {
            status: 'cancelled',
            message: 'Build cancelled by user',
            completedAt: new Date().toISOString()
          })

          cancelResults.push({
            jobId: jobId,
            success: true
          })
        } else {
          cancelResults.push({
            jobId: jobId,
            success: false,
            error: 'Failed to cancel on agent'
          })
        }
      } catch (error) {
        cancelResults.push({
          jobId: job.jobId || job.id,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = cancelResults.filter(r => r.success).length
    const failCount = cancelResults.length - successCount

    return {
      success: successCount > 0,
      buildId,
      message: `Cancelled ${successCount} of ${cancellableJobs.length} jobs`,
      cancelResults,
      totalJobs: cancellableJobs.length,
      successCount,
      failCount
    }

  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to cancel build'
    })
  }
})