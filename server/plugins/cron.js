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
}