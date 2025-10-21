import { getDataService } from '../../../utils/dataService.js'
import { getAuthenticatedUser } from '../../../utils/auth.js'

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
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update environment variable'
    })
  }
})