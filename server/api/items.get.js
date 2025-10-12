import { getDataService } from '../utils/dataService.js'
import { getAuthenticatedUser } from '../utils/auth.js'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user from JWT
    const userAuth = await getAuthenticatedUser(event)
    const userId = userAuth.userId

    const dataService = await getDataService()
    
    const items = await dataService.getItemsByUserId(userId)
    
    // Ensure we always return an array
    const result = Array.isArray(items) ? items : []
    return result
  } catch (error) {
    console.error('Error in /api/items:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch items: ' + error.message
    })
  }
})