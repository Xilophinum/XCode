import { getDataService } from '../../../server/utils/dataService.js'

export default defineEventHandler(async (event) => {
  try {
    const dataService = await getDataService()
    const credentials = await dataService.getCredentials()
    
    // Filter out sensitive data for frontend
    const safeCredentials = credentials.map(cred => ({
      id: cred.id,
      name: cred.name,
      type: cred.type,
      description: cred.description,
      environment: cred.environment,
      tags: cred.tags,
      isActive: cred.isActive,
      expiresAt: cred.expiresAt,
      lastUsed: cred.lastUsed,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt
    }))
    
    return {
      success: true,
      credentials: safeCredentials
    }
  } catch (error) {
    console.error('Error fetching credentials:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch credentials'
    })
  }
})