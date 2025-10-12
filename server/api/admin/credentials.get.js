import { getDataService } from '../../utils/dataService.js'
import { getAuthenticatedUser } from '../../utils/auth.js'

export default defineEventHandler(async (event) => {
  try {
    // Check authentication and admin role
    const user = await getAuthenticatedUser(event)
    if (user.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Admin access required'
      })
    }

    const dataService = await getDataService()
    const credentials = await dataService.getCredentials()

    return credentials
  } catch (error) {
    console.error('Error fetching credentials:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch credentials'
    })
  }
})