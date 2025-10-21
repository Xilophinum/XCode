/**
 * GET /api/projects/[projectId]/builds/[buildNumber]/status
 * Get build status and details
 */

import { getDB, builds } from '~/server/utils/database.js'
import { jobManager } from '~/server/utils/jobManager.js'
import { eq, and } from 'drizzle-orm'

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

    // Check database for build
    const db = await getDB()
    const buildResults = await db.select()
      .from(builds)
      .where(and(
        eq(builds.projectId, projectId),
        eq(builds.buildNumber, buildNumber)
      ))

    const build = buildResults[0]
    if (!build) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Build not found'
      })
    }

    // Check if there's an active job for this build
    const allJobs = await jobManager.getAllJobs()
    const activeJob = allJobs.find(j => j.projectId === projectId && j.buildNumber === buildNumber)

    return {
      success: true,
      projectId,
      buildNumber,
      status: activeJob?.status || build.status,
      agentId: activeJob?.agentId || build.agentId,
      agentName: activeJob?.agentName || build.agentName,
      currentNodeId: activeJob?.currentNodeId,
      currentNodeLabel: activeJob?.currentNodeLabel,
      startTime: build.startedAt,
      finishTime: build.finishedAt,
      duration: build.duration,
      message: build.message,
      isActive: !!activeJob
    }

  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get build status'
    })
  }
})