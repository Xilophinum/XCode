import { getAuthenticatedUser } from '../../utils/auth'
import { DataService } from '../../utils/dataService'

export default defineEventHandler(async (event) => {
  // Check authentication
  const user = await getAuthenticatedUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  const method = getMethod(event)
  const dataService = new DataService()
  await dataService.initialize()

  try {
    if (method === 'GET') {
      // Get all agents
      const agents = await dataService.getAgents()
      return agents
    } else if (method === 'POST') {
      // Create new agent (admin only)
      if (user.role !== 'admin') {
        throw createError({
          statusCode: 403,
          statusMessage: 'Admin access required'
        })
      }

      const body = await readBody(event)
      const agent = await dataService.createAgent(body)
      return agent
    }
  } catch (error) {
    console.error('Agents API error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})