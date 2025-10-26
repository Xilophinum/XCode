import { getAuthenticatedUser } from '../../../utils/auth'
import { DataService } from '../../../utils/dataService'
import logger, { setLogLevel } from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  // Check authentication and admin role
  const user = await getAuthenticatedUser(event)
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    })
  }

  const method = getMethod(event)
  const settingKey = getRouterParam(event, 'key')
  const dataService = new DataService()
  await dataService.initialize()

  try {
    if (method === 'GET') {
      // Get specific setting by key
      const setting = await dataService.getSystemSettingByKey(settingKey)
      if (!setting) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Setting not found'
        })
      }
      return setting
    } else if (method === 'PUT') {
      // Update system setting
      const body = await readBody(event)
      const setting = await dataService.updateSystemSettingByKey(settingKey, body.value)

      // Apply log level change immediately if log_level setting was updated
      if (settingKey === 'log_level') {
        setLogLevel(body.value)
        logger.info(`Log level changed to: ${body.value}`)
      }

      return setting
    }
  } catch (error) {
    logger.error('System setting API error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})