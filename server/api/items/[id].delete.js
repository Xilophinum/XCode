import { getDataService } from '../../utils/dataService.js'
import { getAuthenticatedUser } from '../../utils/auth.js'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    await getAuthenticatedUser(event)
    
    const itemId = getRouterParam(event, 'id')
    const dataService = await getDataService()
    
    // Use cascade delete for both folders and projects
    await dataService.deleteItemWithCascade(itemId)
    
    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete item: ' + error.message
    })
  }
})