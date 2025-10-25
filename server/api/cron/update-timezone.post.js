import { cronManager } from '../../utils/cronManager'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Update timezone for all existing cron jobs
    await cronManager.updateTimezoneForAllJobs()
    
    return {
      success: true,
      message: 'Successfully updated timezone for all cron jobs'
    }
  } catch (error) {
    logger.error('Error updating cron job timezones:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update cron job timezones'
    })
  }
})