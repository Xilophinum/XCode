import { getDataService } from '../../utils/dataService.js'
import { getAuthenticatedUser } from '../../utils/auth.js'

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

    // Use cascade delete for both folders and projects
    await dataService.deleteItemWithCascade(itemId, userInfo)

    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete item: ' + error.message
    })
  }
})