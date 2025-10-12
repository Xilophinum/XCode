import { getAuthenticatedUser } from '../../../utils/auth'
import { DataService } from '../../../utils/dataService'

export default defineEventHandler(async (event) => {
  // Check authentication and admin role
  const user = await getAuthenticatedUser(event)
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    })
  }

  const method = getMethod(event)
  const dataService = new DataService()
  await dataService.initialize()

  try {
    if (method === 'GET') {
      // Get all system settings
      const settings = await dataService.getSystemSettings()
      
      // Group by category for easier frontend handling
      const groupedSettings = settings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = []
        }
        acc[setting.category].push(setting)
        return acc
      }, {})
      
      return groupedSettings
    } else if (method === 'POST') {
      // Initialize system settings (first time setup)
      await dataService.initializeSystemSettings()
      const settings = await dataService.getSystemSettings()
      return { success: true, settings }
    }
  } catch (error) {
    console.error('System settings API error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})