import { getAuthenticatedUser } from '../../../utils/auth'
import { DataService } from '../../../utils/dataService'

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
  const agentId = getRouterParam(event, 'id')
  const dataService = new DataService()
  await dataService.initialize()

  try {
    if (method === 'GET') {
      // Get specific agent
      const agent = await dataService.getAgentById(agentId)
      if (!agent) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Agent not found'
        })
      }
      return agent
    } else if (method === 'PUT') {
      // Update agent (admin only)
      if (user.role !== 'admin') {
        throw createError({
          statusCode: 403,
          statusMessage: 'Admin access required'
        })
      }

      const body = await readBody(event)
      const agent = await dataService.updateAgent(agentId, body)
      if (!agent) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Agent not found'
        })
      }
      return agent
    } else if (method === 'DELETE') {
      // Delete agent (admin only)
      if (user.role !== 'admin') {
        throw createError({
          statusCode: 403,
          statusMessage: 'Admin access required'
        })
      }

      const success = await dataService.deleteAgent(agentId)
      if (!success) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Agent not found'
        })
      }
      return { success: true }
    }
  } catch (error) {
    console.error('Agent API error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})