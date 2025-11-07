/**
 * DELETE /api/auth/sessions/[sessionId]
 * Revoke a specific session
 *
 * Requires authentication
 */

import { revokeSession } from '~/server/utils/jwtAuth.js'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    const sessionId = getRouterParam(event, 'sessionId')
    const userId = event.context.auth?.userId

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    if (!sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID is required'
      })
    }

    // Revoke the session
    const success = await revokeSession(sessionId, userId)

    if (!success) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to revoke session'
      })
    }

    logger.info(`User ${userId} revoked session ${sessionId}`)

    return {
      success: true,
      message: 'Session revoked successfully'
    }
  } catch (error) {
    logger.error('Revoke session error:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to revoke session'
    })
  }
})
