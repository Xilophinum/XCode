/**
 * Cron Plugin - Initialize cron manager on server startup
 * This is a Nitro plugin that runs when the server starts
 */

import { cronManager } from '../utils/cronManager.js'

export default async function (nitroApp) {
  console.log('🕐 Initializing Cron Manager...')
  
  // Restore cron jobs from database on server startup
  try {
    await cronManager.restoreCronJobsFromDatabase()
    console.log('✅ Cron Manager initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize Cron Manager:', error)
  }
  
  nitroApp.hooks.hook('close', async () => {
    console.log('🛑 Shutting down Cron Manager...')
    // Cancel all cron jobs on server shutdown
    const scheduledJobs = cronManager.getScheduledJobs()
    for (const job of scheduledJobs) {
      cronManager.cancelCronJob(job.jobId)
    }
    console.log('✅ Cron Manager shutdown complete')
  })
}