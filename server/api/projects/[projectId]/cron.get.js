/**
 * GET /api/projects/[projectId]/cron
 * Get scheduled cron jobs for a project
 */

import { cronManager } from '../../../utils/cronManager.js'

export default defineEventHandler(async (event) => {
  try {
    const projectId = getRouterParam(event, 'projectId')

    if (!projectId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing projectId parameter'
      })
    }

    // Get all scheduled jobs for this project
    const allScheduledJobs = cronManager.getScheduledJobs()
    const projectJobs = allScheduledJobs.filter(job => job.projectId === projectId)

    return {
      success: true,
      projectId,
      scheduledJobs: projectJobs,
      totalJobs: projectJobs.length
    }

  } catch (error) {
    console.error('❌ Error retrieving cron jobs:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to retrieve cron jobs'
    })
  }
})