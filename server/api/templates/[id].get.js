/**
 * GET /api/templates/[id]
 * Get a specific template
 */

import { getDB, projectTemplates } from '../../utils/database.js'
import { eq } from 'drizzle-orm'
import logger from '../../utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing template ID'
      })
    }

    const db = await getDB()

    const [template] = await db
      .select()
      .from(projectTemplates)
      .where(eq(projectTemplates.id, id))
      .limit(1)

    if (!template) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Template not found'
      })
    }

    // Parse the diagram data
    if (template.diagramData && typeof template.diagramData === 'string') {
      template.diagramData = JSON.parse(template.diagramData)
    }

    return {
      success: true,
      template
    }

  } catch (error) {
    logger.error('Error getting template:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to get template'
    })
  }
})
