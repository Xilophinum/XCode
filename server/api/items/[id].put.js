import { getDataService } from '../../utils/dataService.js'
import { getAuthenticatedUser } from '../../utils/auth.js'
import { AccessControl } from '../../utils/accessControl.js'
import logger from '../../utils/logger.js'

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

    // Check if user has access to this item (includes owner, admin, and group permissions)
    const hasAccess = await AccessControl.checkItemAccess(itemId, userAuth.userId)
    if (!hasAccess) {
      logger.warn(`User ${userAuth.email} (${userAuth.userId}) denied access to modify item ${itemId}`)
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    logger.info(`User ${userAuth.email} updating item ${existingItem.name} (${itemId})`)
    const item = await dataService.updateItem(itemId, body, userInfo)
    return item
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update item'
    })
  }
})