import { getDataService } from '../../utils/dataService.js'
import { getAuthenticatedUser } from '../../utils/auth.js'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    const userAuth = await getAuthenticatedUser(event)

    const itemId = getRouterParam(event, 'id')
    const body = await readBody(event)

    // Extract user info for audit logging
    const userInfo = {
      userId: userAuth.userId,
      userName: userAuth.userName,
      ipAddress: event.node.req.socket.remoteAddress || event.node.req.headers['x-forwarded-for'] || 'unknown',
      userAgent: event.node.req.headers['user-agent'] || 'unknown'
    }

    const dataService = await getDataService()
    
    // Check if user can modify this item
    const existingItem = await dataService.getItemById(itemId)
    if (!existingItem) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Item not found'
      })
    }
    
    // Only owner or admin can modify items
    if (existingItem.userId !== userAuth.userId && userAuth.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }
    
    const item = await dataService.updateItem(itemId, body, userInfo)
    return item
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update item'
    })
  }
})