/**
 * GET /api/projects/[projectId]/builds/[buildNumber]/state
 * Get node execution state for a build
 *
 * Returns execution state from:
 * - Memory (for active builds)
 * - Database (for completed builds)
 */

import { executionStateManager } from '~/server/utils/executionStateManager.js'
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

    logger.info(`Getting execution state for project ${projectId}, build #${buildNumber}`)

    // Try to get from memory first (active builds)
    let nodeStates = executionStateManager.getBuildState(projectId, buildNumber)

    if (nodeStates) {
      logger.info(`Found active execution state in memory for build #${buildNumber}`)
      return {
        success: true,
        projectId,
        buildNumber,
        nodeStates,
        source: 'memory'
      }
    }

    // Not in memory, try loading from database (completed builds)
    nodeStates = await executionStateManager.loadBuildState(projectId, buildNumber)

    if (nodeStates) {
      return {
        success: true,
        projectId,
        buildNumber,
        nodeStates,
        source: 'database'
      }
    }

    // No state found
    logger.warn(`No execution state found for build #${buildNumber}`)
    return {
      success: true,
      projectId,
      buildNumber,
      nodeStates: null,
      source: 'none'
    }

  } catch (error) {
    logger.error('Failed to get build execution state:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get build execution state'
    })
  }
})
