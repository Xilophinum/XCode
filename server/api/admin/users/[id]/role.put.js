import { getDataService } from '../../../../utils/dataService.js'
import { getAuthenticatedUser } from '../../../../utils/auth.js'

export default defineEventHandler(async (event) => {
  try {
    // Check authentication and admin role
    const userAuth = await getAuthenticatedUser(event)
    const dataService = await getDataService()
    const adminUser = await dataService.getUserById(userAuth.userId)
    
    if (!adminUser || adminUser.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Admin access required'
      })
    }

    const userId = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    // Prevent admin from removing their own admin role
    if (userId === userAuth.userId && body.role !== 'admin') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot remove your own admin privileges'
      })
    }
    
    const updatedUser = await dataService.updateUserRole(userId, body.role)
    
    // Don't return password hash
    const { passwordHash, ...userWithoutPassword } = updatedUser
    return userWithoutPassword
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update user role'
    })
  }
})