/**
 * GET /api/projects/[projectId]/status
 * Get current execution status for a project
 */

import { jobManager } from '../../../utils/jobManager.js'

export default defineEventHandler(async (event) => {
  try {
    const projectId = getRouterParam(event, 'projectId')

    if (!projectId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Project ID is required'
      })
    }

    // Check if there are any running jobs for this project
    const runningJobs = await jobManager.getJobsForProject(projectId)
    const currentJob = runningJobs.find(job => 
      ['running', 'pending', 'queued', 'created', 'dispatched'].includes(job.status)
    )
    
    console.log(`📋 Status check for project ${projectId}: found ${runningJobs.length} jobs, current job:`, currentJob)

    return {
      success: true,
      projectId,
      isRunning: !!currentJob,
      currentJob: currentJob ? {
        jobId: currentJob.jobId,
        buildId: currentJob.buildId || currentJob.jobId,
        agentId: currentJob.agentId,
        status: currentJob.status,
        startTime: currentJob.startTime,
        nodeId: currentJob.currentNodeId,
        trigger: currentJob.trigger || 'unknown'
      } : null
    }

  } catch (error) {
    console.error('❌ Error getting project status:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get project status'
    })
  }
})