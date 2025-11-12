/**
 * PUT /api/admin/agents/[id]
 * Update an agent
 */

import { getDataService } from '../../../utils/dataService.js'
import { getAgentManager } from '../../../utils/agentManager.js'
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

    // Update agent in database
    const updatedAgent = await dataService.updateAgent(agentId, {
      name: body.name,
      maxConcurrentJobs: body.maxConcurrentJobs
    })

    // Update agent manager's in-memory cache
    const agentManager = await getAgentManager()
    const agentInfo = agentManager.agentData.get(agentId)
    if (agentInfo) {
      agentInfo.maxConcurrentJobs = updatedAgent.maxConcurrentJobs
      agentInfo.name = updatedAgent.name
      logger.info(`Updated in-memory agent data for ${agentId}: maxConcurrentJobs=${updatedAgent.maxConcurrentJobs}, name="${updatedAgent.name}"`)
    } else {
      logger.warn(`Agent ${agentId} not found in agent manager cache - may not be connected`)
    }

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