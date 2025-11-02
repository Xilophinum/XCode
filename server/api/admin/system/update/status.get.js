/**
 * API Endpoint: Get update status
 * GET /api/admin/system/update/status
 */

import { getUpdateService } from '~/server/utils/updateService.js'
import { getAuthenticatedUser } from '~/server/utils/auth.js'
import { getDB, systemUpdates } from '~/server/utils/database.js'
import { desc } from 'drizzle-orm'
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
    const serviceStatus = updateService.getStatus()

    // Get latest update record from database
    const db = await getDB()
    const latestUpdate = await db
      .select()
      .from(systemUpdates)
      .orderBy(desc(systemUpdates.createdAt))
      .limit(1)

    return {
      success: true,
      status: serviceStatus,
      latestUpdate: latestUpdate[0] || null
    }
  } catch (error) {
    logger.error('Failed to get update status:', error)

    return {
      success: false,
      error: error.message || 'Failed to get update status'
    }
  }
})
