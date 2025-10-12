/**
 * GET /api/jobs/[jobId]/status
 * Returns real-time status and output for a specific job
 */

import { jobManager } from '../../../utils/jobManager.js'

export default defineEventHandler(async (event) => {
  try {
    const jobId = getRouterParam(event, 'jobId')
    
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

    // Get recent output (last 50 lines to avoid overwhelming the client)
    const recentOutput = job.output.slice(-50)
    
    console.log(`📊 Job ${jobId} status request - output lines: ${job.output.length}, recent: ${recentOutput.length}`)
    if (recentOutput.length > 0) {
      console.log(`📊 Sample output:`, recentOutput[0])
    }

    return {
      jobId: job.jobId,
      status: job.status,
      currentNodeId: job.currentNodeId,
      currentNodeLabel: job.currentNodeLabel,
      output: recentOutput,
      startTime: job.startTime,
      completedAt: job.completedAt,
      duration: job.completedAt ? 
        new Date(job.completedAt).getTime() - new Date(job.startTime).getTime() : 
        Date.now() - new Date(job.startTime).getTime(),
      agentId: job.agentId,
      agentName: job.agentName,
      exitCode: job.exitCode,
      error: job.error,
      message: job.message || getStatusMessage(job.status)
    }

  } catch (error) {
    console.error('❌ Error getting job status:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get job status'
    })
  }
})

function getStatusMessage(status) {
  const messages = {
    'queued': 'Job is queued for execution',
    'dispatched': 'Job dispatched to agent',
    'started': 'Job execution started',
    'running': 'Job is running',
    'completed': 'Job completed successfully',
    'failed': 'Job execution failed',
    'cancelled': 'Job was cancelled',
    'timeout': 'Job timed out'
  }
  
  return messages[status] || 'Unknown status'
}