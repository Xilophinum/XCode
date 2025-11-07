/**
 * GET /api/auth/sessions
 * Get all active sessions for the current user
 *
 * Requires authentication
 */

import { getUserActiveSessions } from '~/server/utils/jwtAuth.js'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Get user ID from auth context (set by middleware)
    const userId = event.context.auth?.userId

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Get all active sessions
    const sessions = await getUserActiveSessions(userId)

    // Format sessions for display
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      deviceInfo: session.deviceInfo || 'Unknown device',
      ipAddress: session.ipAddress || 'Unknown IP',
      userAgent: session.userAgent || 'Unknown browser',
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt || session.createdAt,
      expiresAt: session.expiresAt
    }))

    return {
      success: true,
      sessions: formattedSessions
    }
  } catch (error) {
    logger.error('Get sessions error:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get sessions'
    })
  }
})
