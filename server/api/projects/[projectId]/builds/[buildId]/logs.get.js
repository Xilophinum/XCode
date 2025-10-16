/**
 * GET /api/projects/[projectId]/builds/[buildId]/logs
 * Get build execution logs with normalized format
 */

import { getDB } from '~/server/utils/database.js'
import { jobManager } from '~/server/utils/jobManager.js'
import { eq, and } from 'drizzle-orm'
import { builds } from '~/server/utils/schema.js'

export default defineEventHandler(async (event) => {
  try {
    const projectId = getRouterParam(event, 'projectId')
    const buildIdOrNumber = getRouterParam(event, 'buildId') // Can be buildId (UUID) or buildNumber (integer)

    if (!projectId || !buildIdOrNumber) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Project ID and Build ID/Number are required'
      })
    }

    let logs = []
    let actualBuildId = buildIdOrNumber

    console.log(`📋 Getting logs for project ${projectId}, build: ${buildIdOrNumber}`)

    // If buildIdOrNumber is a number, look up the buildId from buildNumber
    const db = await getDB()
    if (!isNaN(buildIdOrNumber)) {
      const buildNumber = parseInt(buildIdOrNumber)
      console.log(`📋 Looking up buildId for buildNumber ${buildNumber}`)

      const buildResults = await db.select({ id: builds.id })
        .from(builds)
        .where(and(
          eq(builds.projectId, projectId),
          eq(builds.buildNumber, buildNumber)
        ))
        .limit(1)

      if (buildResults[0]?.id) {
        actualBuildId = buildResults[0].id
        console.log(`📋 Found buildId ${actualBuildId} for buildNumber ${buildNumber}`)
      } else {
        console.log(`📋 No build found for buildNumber ${buildNumber}`)
        return {
          success: true,
          buildNumber,
          logs: []
        }
      }
    }

    // Try memory first (for active builds)
    let memoryLogs = await jobManager.getJobOutput(actualBuildId)
    console.log(`📋 Memory logs for buildId ${actualBuildId}:`, memoryLogs ? `${memoryLogs.length} logs` : 'none')

    if (memoryLogs && memoryLogs.length > 0) {
      console.log(`📋 Found ${memoryLogs.length} logs in memory`)
      // Convert memory format to normalized format
      logs = memoryLogs.map(logEntry => ({
        type: logEntry.type || 'info',
        message: logEntry.message || String(logEntry),
        nodeLabel: logEntry.nodeLabel || logEntry.source || 'Agent',
        source: logEntry.source || 'agent',
        timestamp: logEntry.timestamp,
        value: logEntry.value
      }))
    } else {
      console.log(`📋 No logs in memory, checking database`)
      // Get from database using actualBuildId
      let buildResults = await db.select({ outputLog: builds.outputLog, buildNumber: builds.buildNumber })
        .from(builds)
        .where(eq(builds.id, actualBuildId))

      console.log(`📋 Database query results for buildId ${actualBuildId}:`, buildResults.length > 0 ? 'found' : 'not found')

      if (buildResults[0]?.outputLog) {
        try {
          const dbLogs = JSON.parse(buildResults[0].outputLog)
          console.log(`📋 Found ${dbLogs.length} logs in database`)
          // Convert database format to normalized format
          logs = dbLogs.map(logEntry => ({
            type: logEntry.type || 'info',
            message: logEntry.message || String(logEntry),
            nodeLabel: logEntry.nodeLabel || logEntry.source || 'Agent',
            source: logEntry.source || 'agent',
            timestamp: logEntry.timestamp,
            value: logEntry.value
          }))
        } catch (e) {
          console.log(`📋 Error parsing database logs:`, e)
          logs = []
        }
      } else {
        console.log(`📋 No logs found in database for buildId ${actualBuildId}`)
      }
    }

    console.log(`📋 Returning ${logs.length} logs`)

    const result = {
      success: true,
      buildId: actualBuildId,
      buildNumber: !isNaN(buildIdOrNumber) ? parseInt(buildIdOrNumber) : null,
      logs: logs || []
    }
    
    console.log(`📋 Returning logs response:`, result)
    return result

  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get build logs'
    })
  }
})