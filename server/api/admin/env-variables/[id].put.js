import { getDataService } from '../../../utils/dataService.js'
import { getAuthenticatedUser } from '../../../utils/auth.js'
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

    const id = getRouterParam(event, 'id')
    const body = await readBody(event)

    const variable = await dataService.updateEnvVariable(id, body)

    return variable
  } catch (error) {
    logger.error('Error updating environment variable:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update environment variable'
    })
  }
})