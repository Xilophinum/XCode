import { getDataService } from '../../utils/dataService.js'

/**
 * DELETE /api/notification-templates/:id
 * Delete a custom notification template (built-in templates cannot be deleted)
 */
export default defineEventHandler(async (event) => {
  try {
    const templateId = getRouterParam(event, 'id')

    if (!templateId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Template ID is required'
      })
    }

    const dataService = await getDataService()
    const db = dataService.getDb()

    // Check if template exists and is not built-in
    let template
    if (dataService.dbType === 'sqlite') {
      template = db.prepare('SELECT * FROM notification_templates WHERE id = ?').get(templateId)
    } else {
      const result = await db`SELECT * FROM notification_templates WHERE id = ${templateId}`
      template = result[0]
    }

    if (!template) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Template not found'
      })
    }

    if (template.is_built_in) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Cannot delete built-in templates'
      })
    }

    // Delete template
    if (dataService.dbType === 'sqlite') {
      db.prepare('DELETE FROM notification_templates WHERE id = ?').run(templateId)
    } else {
      await db`DELETE FROM notification_templates WHERE id = ${templateId}`
    }

    return {
      success: true,
      message: 'Template deleted successfully'
    }
  } catch (error) {
    console.error('Error deleting notification template:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Failed to delete notification template'
    })
  }
})
