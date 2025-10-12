/**
 * GET /api/projects/[projectId]/status
 * Checks if a project has any running jobs (from cron, webhook, or manual execution)
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

    // Find any running jobs for this project
    const runningJob = await jobManager.getRunningJobForProject(projectId)
    
    if (!runningJob) {
      return {
        isRunning: false,
        projectId,
        message: 'No active jobs for this project'
      }
    }

    return {
      isRunning: true,
      projectId,
      jobId: runningJob.jobId,
      agentId: runningJob.agentId,
      agentName: runningJob.agentName,
      status: runningJob.status,
      startTime: runningJob.startTime,
      currentNodeId: runningJob.currentNodeId,
      currentNodeLabel: runningJob.currentNodeLabel,
      duration: Date.now() - new Date(runningJob.startTime).getTime(),
      message: `Project is currently running on agent ${runningJob.agentName || runningJob.agentId}`
    }

  } catch (error) {
    console.error('❌ Error checking project status:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to check project status'
    })
  }
})