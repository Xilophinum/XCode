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
    const buildId = getRouterParam(event, 'buildId')

    if (!projectId || !buildId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Project ID and Build ID/Number are required'
      })
    }

    let logs = []
    console.log(`📋 Getting logs for project ${projectId}, build: ${buildId}`)

    // Try memory first (for active builds)
    let memoryLogs = await jobManager.getJobOutput(buildId)
    console.log(`📋 Memory logs for buildId ${buildId}:`, memoryLogs ? `${memoryLogs.length} logs` : 'none')
    if (memoryLogs && memoryLogs.length > 0) {
      console.log(`📋 Found ${memoryLogs.length} logs in memory`)
      // Convert memory format to normalized format
      logs = memoryLogs.map(logEntry => ({
        type: logEntry.type || 'info',
        level: logEntry.level || 'info',
        message: logEntry.message || String(logEntry),
        nodeLabel: logEntry.nodeLabel || logEntry.source || 'Agent',
        source: logEntry.source || 'agent',
        timestamp: logEntry.timestamp,
        value: logEntry.value
      }))
    } else {
      console.log(`📋 No logs in memory, checking database`)
      // Get from database using buildId
      const db = await getDB()
      let buildResults = await db.select({ outputLog: builds.outputLog })
        .from(builds)
        .where(eq(builds.id, buildId))

      console.log(`📋 Database query results for buildId ${buildId}:`, buildResults.length > 0 ? 'found' : 'not found')

      if (buildResults[0]?.outputLog) {
        try {
          const dbLogs = JSON.parse(buildResults[0].outputLog)
          console.log(`📋 Found ${dbLogs.length} logs in database`)
          // Convert database format to normalized format
          logs = dbLogs.map(logEntry => ({
            type: logEntry.type || 'info',
            level: logEntry.level || 'info',
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
        console.log(`📋 No logs found in database for buildId ${buildId}`)
      }
    }

    console.log(`📋 Returning ${logs.length} logs`)

    const result = {
      success: true,
      buildId: buildId,
      logs: logs || []
    }
    return result

  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get build logs'
    })
  }
})