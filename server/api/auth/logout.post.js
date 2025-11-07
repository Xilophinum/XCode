import { revokeRefreshToken, revokeAllUserTokens } from '~/server/utils/jwtAuth.js'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Get refresh token from cookie
    const refreshToken = getCookie(event, 'refresh-token')
    const logoutAll = event.node.req.url?.includes('?all=true')

    // If authenticated, get user ID from context (set by auth middleware)
    const userId = event.context.auth?.userId

    // Revoke refresh token(s)
    if (logoutAll && userId) {
      // Logout from all devices
      await revokeAllUserTokens(userId, 'user_logout_all')
      logger.info(`User ${userId} logged out from all devices`)
    } else if (refreshToken) {
      // Logout from current device only
      await revokeRefreshToken(refreshToken, 'user_logout')
      logger.info(`User logged out (refresh token revoked)`)
    }

    // Clear both cookies
    setCookie(event, 'auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0
    })

    setCookie(event, 'refresh-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0
    })

    return {
      success: true,
      message: logoutAll ? 'Logged out from all devices' : 'Logged out successfully'
    }
  } catch (error) {
    logger.error('Logout error:', error)
    // Still clear cookies even if DB operations fail
    setCookie(event, 'auth-token', '', { maxAge: 0 })
    setCookie(event, 'refresh-token', '', { maxAge: 0 })
    return { success: true }
  }
})