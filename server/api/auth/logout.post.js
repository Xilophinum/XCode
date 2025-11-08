import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Get current session
    const session = await getUserSession(event)
    
    if (session?.user) {
      logger.info(`User ${session.user.email} logged out`)
    }

    // Clear user session using nuxt-auth-utils
    await clearUserSession(event)

    return {
      success: true,
      message: 'Logged out successfully'
    }
  } catch (error) {
    logger.error('Logout error:', error)
    // Still clear session even if error occurs
    await clearUserSession(event)
    return { success: true }
  }
})