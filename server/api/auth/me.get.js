import { getDataService } from '~/server/utils/dataService.js'
/**
 * Get current user session
 * Uses nuxt-auth-utils session management
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  
  if (!session || !session.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No active session'
    })
  }

  // Always fetch fresh user data from database to get current passwordChangeRequired status
  const dataService = await getDataService()
  const freshUser = await dataService.getUserById(session.user.id)
  
  if (!freshUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'User not found'
    })
  }

  return {
    id: freshUser.id,
    name: freshUser.name,
    email: freshUser.email,
    role: freshUser.role || 'user',
    passwordChangeRequired: freshUser.passwordChangeRequired === 'true'
  }
})
 
