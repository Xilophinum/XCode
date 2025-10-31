/**
 * GET /api/projects/[projectId]/builds/[buildNumber]/logs
 * Get build execution logs - from memory for running builds, from DB for completed builds
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
    let fromMemory = false
    logger.info(`Getting logs for project ${projectId}, build #${buildNumber}`)

    // First, check build status to determine if we should read from memory or DB
    const db = await getDB()
    const buildResults = await db.select({ status: builds.status, outputLog: builds.outputLog })
      .from(builds)
      .where(and(
        eq(builds.projectId, projectId),
        eq(builds.buildNumber, buildNumber)
      ))

    if (buildResults.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Build not found'
      })
    }

    const build = buildResults[0]
    const isRunning = build.status === 'running'

    if (isRunning) {
      // Build is running - get logs from in-memory job storage
      logger.info(`Build #${buildNumber} is running - fetching logs from memory`)
      const memoryLogs = await jobManager.getBuildLogsFromMemory(projectId, buildNumber)
      logs = memoryLogs.map(logEntry => ({
        type: logEntry.type || 'info',
        level: logEntry.level || 'info',
        message: logEntry.message || String(logEntry),
        source: logEntry.source || 'Agent',
        timestamp: logEntry.timestamp,
        nanotime: logEntry.nanotime,
        value: logEntry.value,
        command: logEntry.command
      }))
      fromMemory = true
      logger.info(`Found ${logs.length} logs in memory`)
    } else {
      // Build is completed - get logs from database
      logger.info(`Build #${buildNumber} is ${build.status} - fetching logs from database`)
      if (build.outputLog) {
        try {
          const dbLogs = JSON.parse(build.outputLog)
          logger.info(`Found ${dbLogs.length} logs in database`)
          // Convert database format to normalized format
          logs = dbLogs.map(logEntry => ({
            type: logEntry.type || 'info',
            level: logEntry.level || 'info',
            message: logEntry.message || String(logEntry),
            source: logEntry.source || 'Agent', // source is the nodeLabel
            timestamp: logEntry.timestamp,
            nanotime: logEntry.nanotime,
            value: logEntry.value,
            command: logEntry.command
          }))

          // Sort logs by nanotime to ensure correct order
          logs.sort((a, b) => {
            const aNano = a.nanotime || '0'
            const bNano = b.nanotime || '0'
            // Use string comparison for BigInt strings to avoid conversion overhead
            if (aNano.length !== bNano.length) {
              return aNano.length - bNano.length
            }
            return aNano < bNano ? -1 : aNano > bNano ? 1 : 0
          })
        } catch (e) {
          logger.info(`Error parsing database logs:`, e)
          logs = []
        }
      } else {
        logger.info(`No logs found in database for build #${buildNumber}`)
      }
    }

    logger.info(`Returning ${logs.length} logs (from ${fromMemory ? 'memory' : 'database'})`)

    const result = {
      success: true,
      projectId,
      buildNumber,
      logs: logs || [],
      fromMemory,
      buildStatus: build.status
    }
    return result

  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get build logs'
    })
  }
})