import { DataService } from '../../../utils/dataService'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  
  // Only allow GET requests for public settings
  if (method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const settingKey = getRouterParam(event, 'key')
  
  // Define which settings are publicly accessible
  const publicSettings = [
    'enable_registration',
    'siteName',
    'maintenanceMode'
  ]
  
  if (!publicSettings.includes(settingKey)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Setting not publicly accessible'
    })
  }

  const dataService = new DataService()
  await dataService.initialize()

  try {
    const setting = await dataService.getSystemSettingByKey(settingKey)
    if (!setting) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Setting not found'
      })
    }
    return setting
  } catch (error) {
    logger.error('Public system setting API error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})