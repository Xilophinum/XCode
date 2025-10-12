import { getDataService } from '../../utils/dataService.js'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  try {
    // Get token from cookie
    const token = getCookie(event, 'auth-token')
    
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'No authentication token'
      })
    }

    // Verify JWT token
    const config = useRuntimeConfig()
    const decoded = jwt.verify(token, config.jwtSecret)
    
    // Get user from database
    const dataService = await getDataService()
    const user = await dataService.getUserById(decoded.userId)
    
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'User not found'
      })
    }

    // Ensure user has a role (for backward compatibility)
    const userRole = user.role || 'user'

    return { id: user.id, name: user.name, email: user.email, role: userRole }
  } catch (error) {
    if (error.statusCode) {
      throw error
    }
    // JWT verification failed or other error
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid authentication token'
    })
  }
})