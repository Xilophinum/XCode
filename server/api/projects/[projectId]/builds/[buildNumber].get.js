/**
 * GET /api/projects/[projectId]/builds/[buildNumber]
 * Get specific build details
 */

import { getBuildStatsManager } from '../../../../utils/buildStatsManager.js'
import logger from '../../../../utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    const projectId = getRouterParam(event, 'projectId')
    const buildNumber = getRouterParam(event, 'buildNumber')

    if (!projectId || !buildNumber) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing projectId or buildNumber'
      })
    }

    const buildStatsManager = await getBuildStatsManager()
    const build = await buildStatsManager.getBuild(projectId, parseInt(buildNumber))

    if (!build) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Build not found'
      })
    }

    return {
      success: true,
      build: build
    }

  } catch (error) {
    logger.error('Error getting build:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get build'
    })
  }
})