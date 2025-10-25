/**
 * PUT /api/admin/agents/[id]
 * Update an agent
 */

import { getDataService } from '../../../utils/dataService.js'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    const agentId = getRouterParam(event, 'id')
    const body = await readBody(event)
    
    if (!agentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Agent ID is required'
      })
    }

    const dataService = await getDataService()
    
    // Check if agent exists
    const existingAgent = await dataService.getAgentById(agentId)
    if (!existingAgent) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Agent not found'
      })
    }

    // Update agent
    const updatedAgent = await dataService.updateAgent(agentId, {
      name: body.name,
      maxConcurrentJobs: body.maxConcurrentJobs
    })

    return {
      success: true,
      agent: updatedAgent
    }
  } catch (error) {
    logger.error('Error updating agent:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update agent'
    })
  }
})