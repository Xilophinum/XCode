import jwt from 'jsonwebtoken'

export async function getAuthenticatedUser(event) {
  // First check if middleware already authenticated the user
  if (event.context.auth) {
    return event.context.auth
  }

  // Fallback: verify token directly (for endpoints that bypass middleware)
  try {
    // Get token from cookie
    const token = getCookie(event, 'auth-token')
    
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    // Verify JWT token
    const config = useRuntimeConfig()
    const decoded = jwt.verify(token, config.jwtSecret)
    return decoded
  } catch (error) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid authentication token'
    })
  }
}