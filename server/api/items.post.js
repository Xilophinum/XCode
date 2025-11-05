import { getDataService } from '../utils/dataService.js'
import { getAuthenticatedUser } from '../utils/auth.js'
import { AccessControl } from '../utils/accessControl.js'
import logger from '../utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user from JWT
    const userAuth = await getAuthenticatedUser(event)

    const body = await readBody(event)

    // Ensure the item is created for the authenticated user
    body.userId = userAuth.userId

    // Extract user info for audit logging
    const userInfo = {
      userId: userAuth.userId,
      userName: userAuth.userName,
      ipAddress: event.node.req.socket.remoteAddress || event.node.req.headers['x-forwarded-for'] || 'unknown',
      userAgent: event.node.req.headers['user-agent'] || 'unknown'
    }

    const dataService = await getDataService()

    // If creating item inside a folder (has a path), verify user has access to parent folder
    if (body.path && body.path.length > 0) {
      // Find the parent folder by path
      const allItems = await dataService.getAllItems()
      const parentPath = body.path.slice(0, -1)
      const parentName = body.path[body.path.length - 1]

      const parentFolder = allItems.find(item =>
        item.type === 'folder' &&
        item.name === parentName &&
        JSON.stringify(item.path) === JSON.stringify(parentPath)
      )

      if (parentFolder) {
        const hasAccess = await AccessControl.checkItemAccess(parentFolder.id, userAuth.userId)
        if (!hasAccess) {
          logger.warn(`User ${userAuth.email} (${userAuth.userId}) denied access to create item in folder ${parentFolder.name}`)
          throw createError({
            statusCode: 403,
            statusMessage: 'Access denied to parent folder'
          })
        }
      }
    }

    logger.info(`User ${userAuth.email} creating new ${body.type}: ${body.name}`)
    const item = await dataService.createItem(body, userInfo)
    return item
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create item'
    })
  }
})