/**
 * GET /api/admin/cron
 * Get all scheduled cron jobs across all projects
 */

import { cronManager } from '../../utils/cronManager.js'

export default defineEventHandler(async (event) => {
  try {
    // Get all scheduled cron jobs
    const scheduledJobs = cronManager.getScheduledJobs()

    return {
      success: true,
      scheduledJobs,
      totalJobs: scheduledJobs.length,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('❌ Error retrieving all cron jobs:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to retrieve cron jobs'
    })
  }
})