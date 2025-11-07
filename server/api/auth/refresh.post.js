/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 *
 * This endpoint allows clients to obtain a new access token
 * without requiring the user to log in again.
 */

import { verifyRefreshToken, rotateRefreshToken, generateAccessToken } from '~/server/utils/jwtAuth.js'
import { getDataService } from '~/server/utils/dataService.js'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Get refresh token from cookie or body
    let refreshToken = getCookie(event, 'refresh-token')

    if (!refreshToken) {
      const body = await readBody(event).catch(() => ({}))
      refreshToken = body.refreshToken
    }

    if (!refreshToken) {
      throw createError({
        statusCode: 401,
        statusMessage: 'No refresh token provided'
      })
    }

    // Verify refresh token
    const tokenRecord = await verifyRefreshToken(refreshToken)
    if (!tokenRecord) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or expired refresh token'
      })
    }

    // Get user from database
    const dataService = await getDataService()
    const user = await dataService.getUserById(tokenRecord.userId)

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'User not found'
      })
    }

    // Check if user is active
    if (user.isActive === 'false') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Account is disabled'
      })
    }

    const userRole = user.role || 'user'

    // Generate new access token
    const config = useRuntimeConfig()
    const accessToken = generateAccessToken(
      { userId: user.id, userName: user.name, email: user.email, role: userRole },
      config.jwtSecret
    )

    // Rotate refresh token (revoke old, create new)
    const deviceInfo = {
      ipAddress: getRequestHeader(event, 'x-forwarded-for') || getRequestHeader(event, 'x-real-ip') || event.node.req.socket.remoteAddress,
      userAgent: getRequestHeader(event, 'user-agent'),
      deviceInfo: null
    }
    const newRefreshToken = await rotateRefreshToken(refreshToken, user.id, deviceInfo)

    if (!newRefreshToken) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to rotate refresh token'
      })
    }

    // Set new access token cookie
    setCookie(event, 'auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 // 15 minutes
    })

    // Set new refresh token cookie
    setCookie(event, 'refresh-token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    logger.info(`Refreshed access token for user ${user.email}`)

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole
      },
      accessToken,
      expiresIn: 900  // 15 minutes in seconds
    }
  } catch (error) {
    logger.error('Token refresh error:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to refresh token'
    })
  }
})
