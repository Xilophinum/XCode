import { DataService } from '../../utils/dataService.js'

const dataService = new DataService()

export default defineEventHandler(async (event) => {
  try {
    const method = getMethod(event)

    if (method === 'POST') {
      // Agent registration - when agent first connects
      const body = await readBody(event)
      const { token, systemData } = body

      if (!token || !systemData) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Token and system data are required'
        })
      }

      // Register the agent with its system information
      const agent = await dataService.registerAgent(token, systemData)
      
      if (!agent) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Invalid agent token'
        })
      }

      return agent
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  } catch (error) {
    console.error('Agent register API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to register agent'
    })
  }
})