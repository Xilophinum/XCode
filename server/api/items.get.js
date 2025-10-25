import { getDataService } from '../utils/dataService.js'

export default defineEventHandler(async (event) => {
  try {
    const dataService = await getDataService()
    const items = await dataService.getAllItems()
    // Ensure we always return an array
    const result = Array.isArray(items) ? items : []
    return result
  } catch (error) {
    logger.error('Error in /api/items:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch items: ' + error.message
    })
  }
})