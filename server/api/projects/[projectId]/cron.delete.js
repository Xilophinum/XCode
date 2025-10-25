/**
 * DELETE /api/projects/[projectId]/cron
 * Cancel all cron jobs for a project (used when disabling project)
 */

import { cronManager } from '../../../utils/cronManager.js'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    const projectId = getRouterParam(event, 'projectId')

    if (!projectId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing projectId parameter'
      })
    }

    logger.info(`🛑 Cancelling all cron jobs for project ${projectId}`)

    // Cancel all cron jobs for this project
    cronManager.cancelProjectCronJobs(projectId)

    return {
      success: true,
      message: `All cron jobs cancelled for project ${projectId}`
    }

  } catch (error) {
    logger.error('Error cancelling cron jobs:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to cancel cron jobs'
    })
  }
})