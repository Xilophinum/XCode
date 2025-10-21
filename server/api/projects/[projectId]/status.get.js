/**
 * GET /api/projects/[projectId]/status
 * Get current execution status for a project
 */

import { jobManager } from '../../../utils/jobManager.js'
import { getBuildStatsManager } from '../../../utils/buildStatsManager.js'
import { getDB, builds } from '../../../utils/database.js'
import { eq } from 'drizzle-orm'

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

    // Get build number from current job
    let buildNumber = currentJob?.buildNumber || null

    // Get build stats for progress calculation
    let buildStats = null
    try {
      const buildStatsManager = await getBuildStatsManager()
      buildStats = await buildStatsManager.getProjectStats(projectId)
    } catch (error) {
      console.warn('Failed to get build stats:', error)
    }

    return {
      success: true,
      projectId,
      isRunning: !!currentJob,
      currentJob: currentJob ? {
        jobId: currentJob.jobId,
        buildNumber: buildNumber,
        agentId: currentJob.agentId,
        status: currentJob.status,
        startTime: currentJob.startTime,
        nodeId: currentJob.currentNodeId,
        trigger: currentJob.trigger || 'unknown'
      } : null,
      buildStats
    }

  } catch (error) {
    console.error('❌ Error getting project status:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get project status'
    })
  }
})