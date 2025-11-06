/**
 * GET /api/templates
 * Get all project templates
 */

import { getDB, projectTemplates } from '../../utils/database.js'
import { desc } from 'drizzle-orm'
import logger from '../../utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    const db = await getDB()

    const templates = await db
      .select()
      .from(projectTemplates)
      .orderBy(desc(projectTemplates.createdAt))

    return {
      success: true,
      templates
    }

  } catch (error) {
    logger.error('Error getting templates:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get templates'
    })
  }
})
