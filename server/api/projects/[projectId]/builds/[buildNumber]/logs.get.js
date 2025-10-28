/**
 * GET /api/projects/[projectId]/builds/[buildNumber]/logs
 * Get build execution logs with normalized format
 */

import { getDB, builds } from '~/server/utils/database.js'
import { jobManager } from '~/server/utils/jobManager.js'
import { eq, and } from 'drizzle-orm'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    const projectId = getRouterParam(event, 'projectId')
    const buildNumber = parseInt(getRouterParam(event, 'buildNumber'))

    if (!projectId || !buildNumber) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Project ID and Build Number are required'
      })
    }

    let logs = []
    logger.info(`Getting logs for project ${projectId}, build #${buildNumber}`)

    // Get from database using composite key
    const db = await getDB()
    let buildResults = await db.select({ outputLog: builds.outputLog })
      .from(builds)
      .where(and(
        eq(builds.projectId, projectId),
        eq(builds.buildNumber, buildNumber)
      ))

    logger.info(`Database query results for build #${buildNumber}:`, buildResults.length > 0 ? 'found' : 'not found')

    if (buildResults[0]?.outputLog) {
      try {
        const dbLogs = JSON.parse(buildResults[0].outputLog)
        logger.info(`Found ${dbLogs.length} logs in database`)
        // Convert database format to normalized format
        // Note: source now contains the nodeLabel, not nodeId
        logs = dbLogs.map(logEntry => ({
          type: logEntry.type || 'info',
          level: logEntry.level || 'info',
          message: logEntry.message || String(logEntry),
          source: logEntry.source || 'Agent', // source is the nodeLabel
          timestamp: logEntry.timestamp,
          value: logEntry.value
        }))
      } catch (e) {
        logger.info(`Error parsing database logs:`, e)
        logs = []
      }
    } else {
      logger.info(`No logs found in database for build #${buildNumber}`)
    }

    logger.info(`Returning ${logs.length} logs`)

    const result = {
      success: true,
      projectId,
      buildNumber,
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