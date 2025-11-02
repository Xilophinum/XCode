/**
 * Update Agent Settings
 * Updates auto-update and other settings for a specific agent
 */

import { getDB, agents } from '~/server/utils/database.js'
import { eq } from 'drizzle-orm'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Get agent ID from route params
    const agentId = getRouterParam(event, 'id')

    // Get request body
    const body = await readBody(event)

    if (!body || typeof body.autoUpdate === 'undefined') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing autoUpdate parameter'
      })
    }

    // Update agent settings in database
    const db = await getDB()

    const now = new Date().toISOString()

    await db
      .update(agents)
      .set({
        autoUpdate: body.autoUpdate,
        updatedAt: now
      })
      .where(eq(agents.id, agentId))

    logger.info(`Agent ${agentId} auto-update setting changed to: ${body.autoUpdate}`)

    return {
      success: true,
      message: 'Agent settings updated successfully'
    }
  } catch (error) {
    logger.error('Error updating agent settings:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update agent settings'
    })
  }
})
