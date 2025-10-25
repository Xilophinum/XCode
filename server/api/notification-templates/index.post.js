import { v4 as uuidv4 } from 'uuid'
import { getRawDB } from '../../utils/database.js'
import logger from '~/server/utils/logger.js'
/**
 * POST /api/notification-templates
 * Create a new custom notification template
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const {
      name,
      description,
      type,
      email_subject,
      email_body,
      email_html,
      slack_message,
      slack_blocks,
      slack_mode,
      webhook_method,
      webhook_headers,
      webhook_body
    } = body

    if (!name || !type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: name, type'
      })
    }

    if (!['email', 'slack', 'webhook'].includes(type)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid type. Must be email, slack, or webhook'
      })
    }

    const { db, type: dbType } = await getRawDB()

    const template = {
      id: `template_${uuidv4()}`,
      name,
      description: description || null,
      type,
      is_built_in: false,
      email_subject: email_subject || null,
      email_body: email_body || null,
      email_html: email_html || false,
      slack_message: slack_message || null,
      slack_blocks: slack_blocks || null,
      slack_mode: slack_mode || 'simple',
      webhook_method: webhook_method || 'POST',
      webhook_headers: webhook_headers || null,
      webhook_body: webhook_body || null,
      created_by: event.context.user?.id || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (dbType === 'sqlite') {
      db.prepare(`
        INSERT INTO notification_templates (
          id, name, description, type, is_built_in, email_subject, email_body, email_html,
          slack_message, slack_blocks, slack_mode, webhook_method, webhook_headers, webhook_body,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        template.id, template.name, template.description, template.type, template.is_built_in ? 1 : 0,
        template.email_subject, template.email_body, template.email_html ? 1 : 0, template.slack_message,
        template.slack_blocks, template.slack_mode,
        template.webhook_method, template.webhook_headers, template.webhook_body,
        template.created_by, template.created_at, template.updated_at
      )
    } else {
      await db`
        INSERT INTO notification_templates ${db(template)}
      `
    }

    return {
      success: true,
      template
    }
  } catch (error) {
    logger.error('Error creating notification template:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create notification template'
    })
  }
})
