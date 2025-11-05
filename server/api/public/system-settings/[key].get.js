import { getAuthenticatedUser } from '../../../utils/auth.js'
import { getDataService } from '../../../utils/dataService.js'
import logger from '~/server/utils/logger.js'

// List of settings that are publicly accessible to all authenticated users
const PUBLIC_SETTINGS = [
  'log_level',
  'brand_name',
  'app_logo',
  'session_timeout'
]

export default defineEventHandler(async (event) => {
  try {
    // Require authentication but not admin role
    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const key = event.context.params.key

    // Check if this setting is publicly accessible
    if (!PUBLIC_SETTINGS.includes(key)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'This setting is not publicly accessible'
      })
    }

    const dataService = await getDataService()
    const setting = await dataService.getSystemSetting(key)

    if (!setting) {
      return { key, value: null }
    }

    return setting
  } catch (error) {
    logger.error(`Failed to fetch public system setting ${event.context.params.key}:`, error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch system setting'
    })
  }
})
