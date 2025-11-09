/**
 * Get projects with failed latest builds (real-time failure dashboard)
 *
 * Returns only projects where the most recent build has failed.
 * When a project's next build succeeds, it automatically falls off this list.
 * Filters results based on user's access permissions.
 */

import { getDB, builds } from '../../utils/database.js'
import { eq, desc } from 'drizzle-orm'
import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '../../utils/auth.js'
import { getDataService } from '../../utils/dataService.js'
import { AccessControl } from '../../utils/accessControl.js'
import logger from '../../utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const db = await getDB()
    // Get all unique project IDs that have builds
    const allProjectsWithBuilds = await db
      .select({ projectId: builds.projectId })
      .from(builds)
      .groupBy(builds.projectId)

    // For each project, get the latest build and check if it failed
    const projectsWithFailedBuilds = []

    for (const { projectId } of allProjectsWithBuilds) {
      // Check if user has access to this project
      const hasAccess = await AccessControl.checkItemAccess(projectId, user.userId)

      if (!hasAccess) {
        continue
      }

      // Get the most recent build for this project
      const [latestBuild] = await db
        .select()
        .from(builds)
        .where(eq(builds.projectId, projectId))
        .orderBy(desc(builds.buildNumber))
        .limit(1)

      // Check if the latest build failed (status is 'failure' in the DB)
      if (latestBuild && latestBuild.status === 'failure') {
        // Parse outputLog to get last few lines
        let lastLogLines = []
        if (latestBuild.outputLog) {
          try {
            const logs = JSON.parse(latestBuild.outputLog)
            // Get last 5 lines
            lastLogLines = logs.slice(-5).map(log => ({
              timestamp: log.timestamp,
              level: log.level,
              message: log.message,
              source: log.source
            }))
          } catch (e) {
            logger.warn(`Failed to parse outputLog for build ${latestBuild.projectId}/${latestBuild.buildNumber}`)
          }
        }

        projectsWithFailedBuilds.push({
          ...latestBuild,
          lastLogLines,
          outputLog: undefined // Remove full log to reduce payload
        })
      }
    }
    // Sort by most recent failure first
    projectsWithFailedBuilds.sort((a, b) => {
      const aTime = new Date(a.finishedAt || a.startedAt).getTime()
      const bTime = new Date(b.finishedAt || b.startedAt).getTime()
      return bTime - aTime
    })

    return {
      builds: projectsWithFailedBuilds,
      total: projectsWithFailedBuilds.length
    }
  } catch (error) {
    logger.error('Error fetching projects with failed builds:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch failed projects',
      data: { error: error.message }
    })
  }
})
