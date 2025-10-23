import { getRawDB } from '../../utils/database.js'

/**
 * GET /api/notification-templates
 * Get all notification templates (built-in and custom)
 */
export default defineEventHandler(async (event) => {
  try {
    const { db, type } = await getRawDB()

    let templates
    if (type === 'sqlite') {
      templates = db.prepare('SELECT * FROM notification_templates ORDER BY is_built_in DESC, name ASC').all()
    } else {
      templates = await db`SELECT * FROM notification_templates ORDER BY is_built_in DESC, name ASC`
    }

    return {
      success: true,
      templates
    }
  } catch (error) {
    console.error('Error fetching notification templates:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch notification templates'
    })
  }
})
