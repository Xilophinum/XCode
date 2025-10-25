/**
 * Cron Plugin - Initialize cron manager on server startup
 * This is a Nitro plugin that runs when the server starts
 */

import { cronManager } from '../utils/cronManager.js'
import logger from '~/server/utils/logger.js'

export default async function (nitroApp) {
  logger.info('Initializing Cron Manager...')
  // Restore cron jobs from database on server startup
  try {
    await cronManager.restoreCronJobsFromDatabase()
    logger.info('Cron Manager initialized successfully')
  } catch (error) {
    logger.error('Failed to initialize Cron Manager:', error)
  }
}