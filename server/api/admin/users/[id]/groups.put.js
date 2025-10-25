import { getDataService } from '../../../../utils/dataService.js'
import { getAuthenticatedUser } from '../../../../utils/auth.js'
import logger from '~/server/utils/logger.js'

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
    const { groups } = await readBody(event)
    
    // Check if user exists
    const user = await dataService.getUserById(userId)
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }
    
    // Update user groups
    await dataService.updateUser(userId, { groups: groups || '' })
    
    return { 
      success: true, 
      message: 'User groups updated successfully' 
    }
  } catch (error) {
    logger.error('Failed to update user groups:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update user groups'
    })
  }
})