import { getDataService } from '../../utils/dataService.js'
import { getAuthenticatedUser } from '../../utils/auth.js'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    await getAuthenticatedUser(event)
    
    const itemId = getRouterParam(event, 'id')
    const body = await readBody(event)
    const dataService = await getDataService()
    const item = await dataService.updateItem(itemId, body)
    return item
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update item'
    })
  }
})