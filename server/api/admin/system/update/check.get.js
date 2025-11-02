/**
 * API Endpoint: Check for system updates
 * GET /api/admin/system/update/check
 */

import { getUpdateService } from '~/server/utils/updateService.js'
import { getAuthenticatedUser } from '~/server/utils/auth.js'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const user = await getAuthenticatedUser(event)
    if (user.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Admin access required'
      })
    }

    const updateService = getUpdateService()

    // Check for updates from GitHub
    const updateInfo = await updateService.checkForUpdates()

    return {
      success: true,
      ...updateInfo
    }
  } catch (error) {
    logger.error('Failed to check for updates:', error)

    return {
      success: false,
      error: error.message || 'Failed to check for updates',
      currentVersion: await getUpdateService().getCurrentVersion(),
      updateAvailable: false
    }
  }
})
