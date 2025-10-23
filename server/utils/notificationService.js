/**
 * Notification Service
 * Handles sending notifications via Email, Slack, and Webhooks
 */

export class NotificationService {
  constructor() {
    this.initialized = false
  }

  /**
   * Send a notification based on the notification command
   * @param {Object} notificationCommand - The notification command from the node
   * @param {Object} context - Context data (job status, outputs, etc.)
   */
  async sendNotification(notificationCommand, context = {}) {
    if (!notificationCommand) {
      console.error('❌ No notification command provided')
      return { success: false, error: 'No notification command' }
    }

    const { notificationType } = notificationCommand

    console.log(`📧 Sending ${notificationType} notification...`)

    try {
      let result

      switch (notificationType) {
        case 'email':
          result = await this.sendEmail(notificationCommand, context)
          break
        case 'slack':
          result = await this.sendSlack(notificationCommand, context)
          break
        case 'webhook':
          result = await this.sendWebhook(notificationCommand, context)
          break
        default:
          throw new Error(`Unknown notification type: ${notificationType}`)
      }

      console.log(`✅ ${notificationType} notification sent successfully`)
      return { success: true, ...result }
    } catch (error) {
      console.error(`❌ Failed to send ${notificationType} notification:`, error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Send email notification
   * @param {Object} notification - Email notification config
   * @param {Object} context - Context data
   */
  async sendEmail(notification, context) {
    const { emailFrom, emailTo, emailSubject, emailBody, emailHtml } = notification

    // Validate required fields
    if (!emailFrom || !emailTo || !emailSubject || !emailBody) {
      throw new Error('Missing required email fields (from, to, subject, body)')
    }

    // Parse recipients
    const recipients = emailTo.split(',').map(email => email.trim()).filter(Boolean)

    if (recipients.length === 0) {
      throw new Error('No valid email recipients found')
    }

    console.log(`📧 Sending email to ${recipients.length} recipient(s)...`)
    console.log(`   From: ${emailFrom}`)
    console.log(`   To: ${recipients.join(', ')}`)
    console.log(`   Subject: ${emailSubject}`)

    // TODO: Implement actual email sending logic
    // Options:
    // 1. Use nodemailer with SMTP configuration
    // 2. Use a service like SendGrid, AWS SES, Mailgun, etc.
    // 3. Use the built-in mail command on Linux/macOS

    // For now, log the email details
    console.log('📧 Email notification (not sent - SMTP not configured):')
    console.log({
      from: emailFrom,
      to: recipients,
      subject: emailSubject,
      body: emailBody,
      html: emailHtml
    })

    // Example using nodemailer (uncomment when SMTP is configured):
    /*
    const nodemailer = require('nodemailer')

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })

    const mailOptions = {
      from: emailFrom,
      to: recipients.join(', '),
      subject: emailSubject,
      [emailHtml ? 'html' : 'text']: emailBody
    }

    const info = await transporter.sendMail(mailOptions)
    return { messageId: info.messageId }
    */

    return {
      recipients: recipients.length,
      message: 'Email logged (SMTP not configured)'
    }
  }

  /**
   * Send Slack notification
   * @param {Object} notification - Slack notification config
   * @param {Object} context - Context data
   */
  async sendSlack(notification, context) {
    const { slackWebhookUrl, slackChannel, slackUsername, slackMessage } = notification

    // Validate required fields
    if (!slackWebhookUrl || !slackMessage) {
      throw new Error('Missing required Slack fields (webhookUrl, message)')
    }

    console.log(`💬 Sending Slack message...`)
    console.log(`   Webhook: ${slackWebhookUrl.substring(0, 40)}...`)
    if (slackChannel) console.log(`   Channel: ${slackChannel}`)
    if (slackUsername) console.log(`   Username: ${slackUsername}`)

    // Build Slack payload
    const payload = {
      text: slackMessage
    }

    if (slackChannel) {
      payload.channel = slackChannel
    }

    if (slackUsername) {
      payload.username = slackUsername
    }

    // Send to Slack webhook
    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Slack webhook failed: ${response.status} ${errorText}`)
    }

    const responseText = await response.text()
    console.log(`✅ Slack response: ${responseText}`)

    return {
      status: response.status,
      response: responseText
    }
  }

  /**
   * Send webhook notification
   * @param {Object} notification - Webhook notification config
   * @param {Object} context - Context data
   */
  async sendWebhook(notification, context) {
    const { webhookUrl, webhookMethod, webhookHeaders, webhookBody } = notification

    // Validate required fields
    if (!webhookUrl || !webhookBody) {
      throw new Error('Missing required webhook fields (url, body)')
    }

    const method = webhookMethod || 'POST'

    console.log(`🔗 Sending webhook...`)
    console.log(`   URL: ${webhookUrl}`)
    console.log(`   Method: ${method}`)

    // Parse headers
    let headers = { 'Content-Type': 'application/json' }

    if (webhookHeaders) {
      try {
        const customHeaders = typeof webhookHeaders === 'string'
          ? JSON.parse(webhookHeaders)
          : webhookHeaders
        headers = { ...headers, ...customHeaders }
      } catch (error) {
        console.warn('⚠️ Failed to parse webhook headers, using default:', error.message)
      }
    }

    // Parse body
    let body = webhookBody
    if (typeof body === 'string') {
      try {
        // Validate it's valid JSON
        JSON.parse(body)
      } catch (error) {
        console.warn('⚠️ Webhook body is not valid JSON, sending as-is')
      }
    } else {
      body = JSON.stringify(body)
    }

    console.log(`   Headers:`, headers)
    console.log(`   Body:`, body)

    // Send webhook
    const fetchOptions = {
      method,
      headers
    }

    // Only add body for methods that support it
    if (method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = body
    }

    const response = await fetch(webhookUrl, fetchOptions)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Webhook failed: ${response.status} ${errorText}`)
    }

    let responseData
    const contentType = response.headers.get('content-type')

    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json()
    } else {
      responseData = await response.text()
    }

    console.log(`✅ Webhook response:`, responseData)

    return {
      status: response.status,
      response: responseData
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
