import { getDataService } from '../utils/dataService.js'
import { getAuthenticatedUser } from '../utils/auth.js'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user from JWT
    const userAuth = await getAuthenticatedUser(event)
    
    const body = await readBody(event)
    
    // Ensure the item is created for the authenticated user
    body.userId = userAuth.userId
    
    const dataService = await getDataService()
    const item = await dataService.createItem(body)
    return item
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create item'
    })
  }
})