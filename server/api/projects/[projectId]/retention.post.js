import { getBuildStatsManager } from '../../../../server/utils/buildStatsManager.js'
import logger from '~/server/utils/logger.js'

/**
 * POST /api/projects/[projectId]/retention
 * Update project retention settings
 */
export default defineEventHandler(async (event) => {
  const { projectId } = getRouterParams(event)
  
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  try {
    const body = await readBody(event)
    const { maxBuildsToKeep, maxLogDays } = body

    // Validate input
    const settings = {}
    if (maxBuildsToKeep !== undefined) {
      if (!Number.isInteger(maxBuildsToKeep) || maxBuildsToKeep < 1) {
        throw createError({
          statusCode: 400,
          statusMessage: 'maxBuildsToKeep must be a positive integer'
        })
      }
      settings.maxBuildsToKeep = maxBuildsToKeep
    }
    
    if (maxLogDays !== undefined) {
      if (!Number.isInteger(maxLogDays) || maxLogDays < 1) {
        throw createError({
          statusCode: 400,
          statusMessage: 'maxLogDays must be a positive integer'
        })
      }
      settings.maxLogDays = maxLogDays
    }

    if (Object.keys(settings).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No valid retention settings provided'
      })
    }

    const buildStatsManager = await getBuildStatsManager()
    await buildStatsManager.updateRetentionSettings(projectId, settings)
    
    // Return updated settings
    const stats = await buildStatsManager.getProjectStats(projectId)
    
    return {
      success: true,
      retention: {
        maxBuildsToKeep: stats.maxBuildsToKeep,
        maxLogDays: stats.maxLogDays
      },
      message: 'Retention settings updated successfully'
    }
  } catch (error) {
    if (error.statusCode) {
      throw error // Re-throw validation errors
    }
    
    logger.error('Error updating project retention settings:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update retention settings'
    })
  }
})