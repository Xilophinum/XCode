/**
 * GET /api/projects/[projectId]/builds/[buildId]/status
 * Get build status and details
 */

import { getDB } from '~/server/utils/database.js'
import { jobManager } from '~/server/utils/jobManager.js'
import { eq } from 'drizzle-orm'
import { builds } from '~/server/utils/schema.js'

export default defineEventHandler(async (event) => {
  try {
    const projectId = getRouterParam(event, 'projectId')
    const buildId = getRouterParam(event, 'buildId')

    if (!projectId || !buildId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Project ID and Build ID are required'
      })
    }

    // Check memory first (for active builds)
    let job = await jobManager.getJob(buildId)
    
    if (job) {
      return {
        success: true,
        buildId,
        status: job.status,
        agentId: job.agentId,
        agentName: job.agentName,
        currentNodeId: job.currentNodeId,
        currentNodeLabel: job.currentNodeLabel,
        startTime: job.startTime,
        isActive: true
      }
    }

    // Check database for completed builds
    const db = await getDB()
    const buildResults = await db.select()
      .from(builds)
      .where(eq(builds.id, buildId))
    
    const build = buildResults[0]
    if (!build) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Build not found'
      })
    }

    return {
      success: true,
      buildId,
      status: build.status,
      agentId: build.agentId,
      agentName: build.agentName,
      startTime: build.startedAt,
      finishTime: build.finishedAt,
      duration: build.duration,
      message: build.message,
      isActive: false
    }

  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get build status'
    })
  }
})