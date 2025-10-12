/**
 * POST /api/jobs/[jobId]/cancel
 * Cancels a specific job by sending cancellation to the agent
 */

import { jobManager } from '../../../utils/jobManager.js'
import { getAgentManager } from '../../../utils/agentManager.js'

export default defineEventHandler(async (event) => {
  try {
    const jobId = getRouterParam(event, 'jobId')
    const body = await readBody(event)
    const { projectId, agentId, reason } = body
    
    if (!jobId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Job ID is required'
      })
    }

    const job = await jobManager.getJob(jobId)
    
    if (!job) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Job not found'
      })
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return {
        success: false,
        message: `Job is already ${job.status} and cannot be cancelled`
      }
    }

    // Get agent manager instance
    const agentManager = await getAgentManager()

    // Send cancellation request to the agent
    const cancellationSent = agentManager.cancelJob(job.agentId, {
      jobId,
      reason: reason || 'Cancelled by user'
    })

    if (!cancellationSent) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Failed to send cancellation request to agent'
      })
    }

    // Update job status to cancelling
    await jobManager.updateJob(jobId, {
      status: 'cancelling',
      cancelledAt: new Date().toISOString(),
      cancelReason: reason || 'Cancelled by user'
    })

    // Add cancellation message to job output
    await jobManager.addJobOutput(jobId, {
      type: 'warning',
      message: `Job cancellation requested: ${reason || 'Cancelled by user'}`,
      timestamp: new Date().toISOString(),
      source: 'system'
    })

    console.log(`🛑 Cancellation sent for job ${jobId} on agent ${job.agentId}`)

    return {
      success: true,
      message: 'Cancellation request sent to agent',
      jobId,
      agentId: job.agentId,
      status: 'cancelling'
    }

  } catch (error) {
    console.error('❌ Error cancelling job:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to cancel job'
    })
  }
})