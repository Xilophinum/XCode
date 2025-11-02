/**
 * Trigger Agent Update
 * Sends update notification to a specific agent via WebSocket
 */

import { getDB, agents } from '~/server/utils/database.js'
import { eq } from 'drizzle-orm'
import logger from '~/server/utils/logger.js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
  try {
    // Get agent ID from route params
    const agentId = getRouterParam(event, 'id')

    // Get agent from database
    const db = await getDB()

    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .get()

    if (!agent) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Agent not found'
      })
    }

    if (agent.status !== 'online') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Agent is not online'
      })
    }

    // Get the latest agent version
    const agentFilePath = path.join(process.cwd(), 'build-agent', 'agent.js')
    const agentCode = fs.readFileSync(agentFilePath, 'utf8')

    const versionMatch = agentCode.match(/const AGENT_VERSION = ['"]([^'"]+)['"]/)
    const latestVersion = versionMatch ? versionMatch[1] : '1.0.0'

    // Calculate SHA256 hash
    const hash = crypto.createHash('sha256').update(agentCode).digest('hex')

    // Send update notification via WebSocket
    if (globalThis.broadcastToClients) {
      // Find the agent's socket connection
      const agentManager = globalThis.agentManager
      if (agentManager) {
        const agentSocket = agentManager.connectedAgents.get(agentId)
        if (agentSocket) {
          agentSocket.emit('message', {
            type: 'update_available',
            currentVersion: agent.agentVersion || '0.0.0',
            latestVersion,
            updateUrl: '/api/agents/download/latest',
            hash,
            critical: false,
            releaseNotes: `Agent version ${latestVersion} is available.`
          })

          logger.info(`Sent update notification to agent ${agent.name} (${agentId})`)

          return {
            success: true,
            message: `Update notification sent to ${agent.name}`,
            latestVersion
          }
        }
      }
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send update notification - agent socket not found'
    })
  } catch (error) {
    logger.error('Error triggering agent update:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to trigger agent update'
    })
  }
})
