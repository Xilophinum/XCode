/**
 * DELETE /api/templates/[id]
 * Delete a template
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

    // Check if template exists
    const [existing] = await db
      .select()
      .from(projectTemplates)
      .where(eq(projectTemplates.id, id))
      .limit(1)

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Template not found'
      })
    }

    // Delete the template
    await db
      .delete(projectTemplates)
      .where(eq(projectTemplates.id, id))

    logger.info(`Template deleted: ${existing.name} (${id})`)

    return {
      success: true,
      message: 'Template deleted successfully'
    }

  } catch (error) {
    logger.error('Error deleting template:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete template'
    })
  }
})
