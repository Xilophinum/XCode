/**
 * Agent Version Check Endpoint
 * Returns the latest agent version and download information
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

    // Get the latest agent version from the agent.js file
    const agentFilePath = path.join(process.cwd(), 'build-agent', 'agent.js')
    const agentCode = fs.readFileSync(agentFilePath, 'utf8')

    // Extract version from agent.js using regex
    const versionMatch = agentCode.match(/const AGENT_VERSION = ['"]([^'"]+)['"]/)
    const latestVersion = versionMatch ? versionMatch[1] : '1.0.0'

    // Calculate SHA256 hash of agent.js for validation
    const hash = crypto.createHash('sha256').update(agentCode).digest('hex')

    // Get current agent version
    const currentVersion = agent.agentVersion || '0.0.0'

    // Compare versions
    const updateAvailable = compareVersions(currentVersion, latestVersion) < 0

    // Update agent's version check timestamp
    const now = new Date().toISOString()
    await db
      .update(agents)
      .set({
        lastVersionCheck: now,
        updateAvailable: updateAvailable ? 'true' : 'false',
        updatedAt: now
      })
      .where(eq(agents.id, agent.id))

    logger.info(`Agent ${agent.name} checked for updates: current=${currentVersion}, latest=${latestVersion}, updateAvailable=${updateAvailable}`)

    return {
      currentVersion,
      latestVersion,
      updateAvailable,
      downloadUrl: updateAvailable ? '/api/agents/download/latest' : null,
      hash,
      critical: false, // Could be set to true for breaking changes
      releaseNotes: updateAvailable ? getAgentReleaseNotes(latestVersion) : null
    }
  } catch (error) {
    logger.error('Error checking agent version:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to check agent version'
    })
  }
})

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0
    const part2 = parts2[i] || 0

    if (part1 < part2) return -1
    if (part1 > part2) return 1
  }

  return 0
}

/**
 * Get release notes for a specific agent version
 * This could be enhanced to read from a CHANGELOG or external source
 */
function getAgentReleaseNotes(version) {
  // For now, return generic notes
  // In the future, this could read from AGENT_CHANGELOG.md or a database
  return `Agent version ${version} is available. Please update for the latest features and bug fixes.`
}
