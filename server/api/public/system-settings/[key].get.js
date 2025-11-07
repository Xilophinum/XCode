import { getAuthenticatedUser } from '../../../utils/auth.js'
import { getDataService } from '../../../utils/dataService.js'
import logger from '~/server/utils/logger.js'

// List of settings that are accessible without authentication (truly public)
const ANONYMOUS_PUBLIC_SETTINGS = [
  'enable_registration',
  'siteName',
  'maintenanceMode',
  'brand_name',
  'app_logo',
  'log_level'  // Client-side logging configuration
]

// List of settings that require authentication but not admin role
const AUTHENTICATED_PUBLIC_SETTINGS = [
  'session_timeout'
]

export default defineEventHandler(async (event) => {
  try {
    const key = event.context.params.key

    // Check if this setting is in either public list
    const isAnonymousPublic = ANONYMOUS_PUBLIC_SETTINGS.includes(key)
    const isAuthenticatedPublic = AUTHENTICATED_PUBLIC_SETTINGS.includes(key)

    if (!isAnonymousPublic && !isAuthenticatedPublic) {
      throw createError({
        statusCode: 403,
        statusMessage: 'This setting is not publicly accessible'
      })
    }

    // Only require authentication for authenticated public settings
    if (isAuthenticatedPublic) {
      const user = await getAuthenticatedUser(event)
      if (!user) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Authentication required'
        })
      }
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
