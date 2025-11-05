import { getDataService } from '../../utils/dataService.js'
import { getAuthenticatedUser } from '../../utils/auth.js'
import { AccessControl } from '../../utils/accessControl.js'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    const userAuth = await getAuthenticatedUser(event)

    const itemId = getRouterParam(event, 'id')

    // Extract user info for audit logging
    const userInfo = {
      userId: userAuth.userId,
      userName: userAuth.userName,
      ipAddress: event.node.req.socket.remoteAddress || event.node.req.headers['x-forwarded-for'] || 'unknown',
      userAgent: event.node.req.headers['user-agent'] || 'unknown'
    }

    const dataService = await getDataService()

    // Check if user can delete this item
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
      logger.warn(`User ${userAuth.email} (${userAuth.userId}) denied access to delete item ${itemId}`)
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    logger.info(`User ${userAuth.email} deleting item ${existingItem.name} (${itemId})`)

    // Use cascade delete for both folders and projects
    await dataService.deleteItemWithCascade(itemId, userInfo)

    return { success: true }
  } catch (error) {
    logger.error('Delete error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete item: ' + error.message
    })
  }
})