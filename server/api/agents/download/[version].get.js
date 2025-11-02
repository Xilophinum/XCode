/**
 * Agent Download Endpoint
 * Serves the agent.js file for agent updates
 */

import { getDB, agents } from '~/server/utils/database.js'
import { eq } from 'drizzle-orm'
import logger from '~/server/utils/logger.js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
  try {
    // Get authorization token from header
    const authHeader = getRequestHeader(event, 'authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Missing or invalid token'
      })
    }

    const token = authHeader.substring(7)

    // Verify agent token
    const db = await getDB()

    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.token, token))
      .get()

    if (!agent) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Invalid agent token'
      })
    }

    // Get requested version from route params
    const requestedVersion = getRouterParam(event, 'version')

    // Read the agent.js file
    const agentFilePath = path.join(process.cwd(), 'build-agent', 'agent.js')

    if (!fs.existsSync(agentFilePath)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Agent file not found'
      })
    }

    const agentCode = fs.readFileSync(agentFilePath, 'utf8')

    // Extract version from agent.js
    const versionMatch = agentCode.match(/const AGENT_VERSION = ['"]([^'"]+)['"]/)
    const currentVersion = versionMatch ? versionMatch[1] : '1.0.0'

    // For 'latest', always serve the current version
    // For specific versions, you could maintain a version archive
    if (requestedVersion !== 'latest' && requestedVersion !== currentVersion) {
      // In a more sophisticated system, you could store historical versions
      // For now, we only serve the latest version
      logger.warn(`Agent ${agent.name} requested version ${requestedVersion}, but only ${currentVersion} is available. Serving latest.`)
    }

    // Calculate SHA256 hash for validation
    const hash = crypto.createHash('sha256').update(agentCode).digest('hex')

    logger.info(`Agent ${agent.name} downloading agent.js version ${currentVersion}`)

    // Set response headers
    setHeader(event, 'Content-Type', 'application/javascript')
    setHeader(event, 'Content-Disposition', `attachment; filename="agent.js"`)
    setHeader(event, 'X-Agent-Version', currentVersion)
    setHeader(event, 'X-Agent-Hash', hash)

    return agentCode
  } catch (error) {
    logger.error('Error serving agent download:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to download agent'
    })
  }
})
