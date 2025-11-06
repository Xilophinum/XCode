/**
 * POST /api/templates
 * Create or update a project template
 */

import { getDB, projectTemplates } from '../../utils/database.js'
import { eq } from 'drizzle-orm'
import logger from '../../utils/logger.js'
import { v4 as uuidv4 } from 'uuid'
import { getAuthenticatedUser } from '../../utils/auth.js'

export default defineEventHandler(async (event) => {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const body = await readBody(event)
    const { id, name, description, diagramData } = body

    if (!name || !diagramData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: name, diagramData'
      })
    }

    const db = await getDB()
    const now = new Date().toISOString()
    const userId = user.userId

    if (id) {
      // Update existing template
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

      await db
        .update(projectTemplates)
        .set({
          name,
          description: description || null,
          diagramData: JSON.stringify(diagramData),
          updatedAt: now
        })
        .where(eq(projectTemplates.id, id))

      logger.info(`Template updated: ${name} (${id})`)

      return {
        success: true,
        message: 'Template updated successfully',
        templateId: id
      }
    } else {
      // Create new template
      const templateId = uuidv4()

      await db.insert(projectTemplates).values({
        id: templateId,
        name,
        description: description || null,
        diagramData: JSON.stringify(diagramData),
        userId,
        createdAt: now,
        updatedAt: now
      })

      logger.info(`Template created: ${name} (${templateId})`)

      return {
        success: true,
        message: 'Template created successfully',
        templateId
      }
    }

  } catch (error) {
    logger.error('Error saving template:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to save template'
    })
  }
})
