import { getDataService } from '../../utils/dataService.js'
import { getAuthenticatedUser } from '../../utils/auth.js'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Check authentication and admin role
    const userAuth = await getAuthenticatedUser(event)
    const dataService = await getDataService()
    const user = await dataService.getUserById(userAuth.userId)

    if (!user || user.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Admin access required'
      })
    }

    const variables = await dataService.getEnvVariables()

    // Mask secret values in response
    const maskedVariables = variables.map(variable => ({
      ...variable,
      value: variable.isSecret === 'true' ? '***HIDDEN***' : variable.value
    }))

    return maskedVariables
  } catch (error) {
    logger.error('Error fetching environment variables:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch environment variables'
    })
  }
})