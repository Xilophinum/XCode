import logger from './logger.js'

/**
 * Get authenticated user from session or middleware context
 * Uses nuxt-auth-utils session management
 */
export async function getAuthenticatedUser(event) {
  // First check if middleware already authenticated the user
  if (event.context.auth) {
    return event.context.auth
  }

  // Fallback: check session directly (for endpoints that bypass middleware)
  try {
    const session = await getUserSession(event)
    
    if (!session || !session.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    // Return in same format as middleware sets
    return {
      userId: session.user.id,
      userName: session.user.name,
      email: session.user.email,
      role: session.user.role
    }
  } catch (error) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid session'
    })
  }
}