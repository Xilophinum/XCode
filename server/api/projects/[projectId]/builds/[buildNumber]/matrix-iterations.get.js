/**
 * GET /api/projects/[projectId]/builds/[buildNumber]/matrix-iterations
 * Get matrix iteration details for a build (for dynamic node rendering)
 *
 * Returns all matrix sub-jobs grouped by parent job
 */

import { jobManager } from '~/server/utils/jobManager.js'
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

    logger.info(`Getting matrix iterations for project ${projectId}, build #${buildNumber}`)

    // Get all jobs for this build
    const allJobs = jobManager.getAllJobs()
    const buildJobs = allJobs.filter(job =>
      job.projectId === projectId &&
      job.buildNumber === buildNumber
    )

    // Group matrix iterations by parent job
    const matrixIterations = {}

    for (const job of buildJobs) {
      // Check if this is a matrix sub-job (has parentJobId and matrix metadata)
      if (job.parentJobId && (job.matrixIndex !== undefined || job.executionName)) {
        const parentJobId = job.parentJobId

        if (!matrixIterations[parentJobId]) {
          matrixIterations[parentJobId] = {
            parentJobId,
            iterations: []
          }
        }

        matrixIterations[parentJobId].iterations.push({
          subJobId: job.jobId,
          executionName: job.executionName,
          matrixIndex: job.matrixIndex,
          matrixItem: job.matrixItem,
          status: job.status,
          startTime: job.startTime,
          completedAt: job.completedAt,
          exitCode: job.exitCode,
          error: job.error
        })
      }
    }

    // Sort iterations by index for each parent
    Object.values(matrixIterations).forEach(group => {
      group.iterations.sort((a, b) => (a.matrixIndex || 0) - (b.matrixIndex || 0))
    })

    return {
      success: true,
      projectId,
      buildNumber,
      matrixIterations
    }

  } catch (error) {
    logger.error('Failed to get matrix iterations:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get matrix iterations'
    })
  }
})
