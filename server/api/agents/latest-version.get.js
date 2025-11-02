/**
 * Get Latest Agent Version
 * Returns the latest agent version from agent.js
 */

import fs from 'fs'
import path from 'path'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Read the agent.js file
    const agentFilePath = path.join(process.cwd(), 'build-agent', 'agent.js')
    const agentCode = fs.readFileSync(agentFilePath, 'utf8')

    // Extract version from agent.js using regex
    const versionMatch = agentCode.match(/const AGENT_VERSION = ['"]([^'"]+)['"]/)
    const version = versionMatch ? versionMatch[1] : '1.0.0'

    return { version }
  } catch (error) {
    logger.error('Error getting latest agent version:', error)
    return { version: '1.0.0' }
  }
})
