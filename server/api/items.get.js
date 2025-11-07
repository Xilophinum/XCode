import { getDataService } from '../utils/dataService.js'
import { getAuthenticatedUser } from '../utils/auth.js'
import { AccessControl } from '../utils/accessControl.js'
import logger from '../utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }
    const dataService = await getDataService()
    const allItems = await dataService.getAllItems()
    // Ensure we have an array
    const items = Array.isArray(allItems) ? allItems : []
    // Filter items based on access control
    const accessibleItems = await AccessControl.filterAccessibleItems(items, user.userId)
    return accessibleItems
  } catch (error) {
    logger.error('Error fetching items:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch items: ' + error.message
    })
  }
})