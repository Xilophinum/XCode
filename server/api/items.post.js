import { getDataService } from '../utils/dataService.js'
import { getAuthenticatedUser } from '../utils/auth.js'

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
    const item = await dataService.createItem(body, userInfo)
    return item
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create item'
    })
  }
})