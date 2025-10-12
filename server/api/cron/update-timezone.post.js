import { getDataService } from '../../utils/dataService'
import { cronManager } from '../../utils/cronManager'

export default defineEventHandler(async (event) => {
  try {
    // Update timezone for all existing cron jobs
    await cronManager.updateTimezoneForAllJobs()
    
    return {
      success: true,
      message: 'Successfully updated timezone for all cron jobs'
    }
  } catch (error) {
    console.error('Error updating cron job timezones:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update cron job timezones'
    })
  }
})