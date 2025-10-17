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
      userName: userAuth.name,
      ipAddress: event.node.req.socket.remoteAddress || event.node.req.headers['x-forwarded-for'] || 'unknown',
      userAgent: event.node.req.headers['user-agent'] || 'unknown'
    }

    const dataService = await getDataService()
    const item = await dataService.updateItem(itemId, body, userInfo)
    return item
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update item'
    })
  }
})