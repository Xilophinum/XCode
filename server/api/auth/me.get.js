import logger from '~/server/utils/logger.js'

/**
 * Get current user session
 * Uses nuxt-auth-utils session management
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  
  if (!session || !session.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No active session'
    })
  }

  logger.debug(`Session check for user: ${session.user.email}`)
  
  return session.user
})
 
