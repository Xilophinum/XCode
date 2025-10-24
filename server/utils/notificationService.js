/**
 * Notification Service
 * Handles sending notifications via Email, Slack, and Webhooks
 */

import nodemailer from 'nodemailer'
import { getDataService } from './dataService.js'

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
    console.log(`📋 Context data:`, context)

    // Resolve context variables in notification command
    const resolvedCommand = await this.resolveContextVariables(notificationCommand, context)

    try {
      let result

      switch (notificationType) {
        case 'email':
          result = await this.sendEmail(resolvedCommand, context)
          break
        case 'slack':
          result = await this.sendSlack(resolvedCommand, context)
          break
        case 'webhook':
          result = await this.sendWebhook(resolvedCommand, context)
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
   * Resolve context variables in notification fields
   * Supports: $BuildNumber, $JobId, $ProjectId, $ProjectName, $ExitCode, $Output, $Timestamp, $TimestampHuman, $FailedNodeLabel, $DefaultEmailFrom, $DefaultEmailTo, $AdminEmail
   * @param {Object} command - Notification command
   * @param {Object} context - Context data
   * @returns {Object} Command with resolved variables
   */
  async resolveContextVariables(command, context) {
    const resolved = { ...command }

    const now = new Date()
    const humanReadableTimestamp = now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })

    // Get default email settings from database
    const dataService = await getDataService()
    const notificationSettings = await dataService.getSystemSettings('notifications')
    
    const getSetting = (key) => {
      const setting = notificationSettings.find(s => s.key === key)
      return setting?.value || setting?.defaultValue || ''
    }

    // Build variable map
    const variables = {
      BuildNumber: context.buildNumber || 'N/A',
      JobId: context.jobId || 'N/A',
      ProjectId: context.projectId || 'N/A',
      ProjectName: context.projectName || 'N/A',
      ExitCode: context.exitCode !== undefined ? String(context.exitCode) : 'N/A',
      Output: context.output || '',
      Timestamp: now.toISOString(),
      TimestampHuman: humanReadableTimestamp,
      Status: context.exitCode === 0 ? 'Success' : 'Failed',
      FailedNodeLabel: context.failedNodeLabel || (context.exitCode !== 0 ? 'Unknown' : 'N/A'),
      DefaultEmailFrom: getSetting('default_email_from'),
      DefaultEmailTo: getSetting('default_email_to'),
      AdminEmail: getSetting('admin_email'),
      CurrentAttempt: context.currentAttempt !== undefined ? String(context.currentAttempt) : 'N/A',
      MaxAttempts: context.maxAttempts !== undefined ? String(context.maxAttempts) : 'N/A',
      IsRetrying: context.isRetrying ? 'Yes' : 'No',
      WillRetry: context.isRetrying ? 'Yes' : 'No'
    }

    console.log(`🔧 Available context variables:`, variables)

    // Helper function to replace variables in a string
    const replaceVariables = (text) => {
      if (!text || typeof text !== 'string') return text

      let result = text

      // Replace each variable (supports both ${VarName} and $VarName formats)
      Object.entries(variables).forEach(([key, value]) => {
        const bracedPattern = new RegExp(`\\$\\{${key}\\}`, 'g')
        const unbracedPattern = new RegExp(`\\$${key}\\b`, 'g')

        result = result.replace(bracedPattern, value)
        result = result.replace(unbracedPattern, value)
      })

      return result
    }

    // Resolve variables in all relevant fields
    if (resolved.emailFrom) resolved.emailFrom = replaceVariables(resolved.emailFrom)
    if (resolved.emailTo) resolved.emailTo = replaceVariables(resolved.emailTo)
    if (resolved.emailSubject) resolved.emailSubject = replaceVariables(resolved.emailSubject)
    if (resolved.emailBody) resolved.emailBody = replaceVariables(resolved.emailBody)
    if (resolved.slackMessage) resolved.slackMessage = replaceVariables(resolved.slackMessage)
    if (resolved.slackChannel) resolved.slackChannel = replaceVariables(resolved.slackChannel)
    if (resolved.webhookBody) resolved.webhookBody = replaceVariables(resolved.webhookBody)
    if (resolved.webhookUrl) resolved.webhookUrl = replaceVariables(resolved.webhookUrl)

    return resolved
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

    // Get SMTP configuration from database settings
    const dataService = await getDataService()
    const notificationSettings = await dataService.getSystemSettings('notifications')

    // Helper to get setting value by key
    const getSetting = (key) => {
      const setting = notificationSettings.find(s => s.key === key)
      return setting?.value || setting?.defaultValue || null
    }

    let smtpHost = getSetting('smtp_server')
    let smtpPort = getSetting('smtp_port')
    let smtpUser = getSetting('smtp_username')
    let smtpPass = getSetting('smtp_password')
    let smtpSecure = getSetting('smtp_secure')

    // Fallback to environment variables if not in database
    smtpHost = smtpHost || process.env.SMTP_HOST
    smtpPort = smtpPort || process.env.SMTP_PORT
    smtpUser = smtpUser || process.env.SMTP_USER
    smtpPass = smtpPass || process.env.SMTP_PASS
    smtpSecure = smtpSecure || process.env.SMTP_SECURE

    if (!smtpHost) {
      console.warn('⚠️ SMTP_HOST not configured - email will not be sent')
      console.log('📧 Email notification (not sent - SMTP not configured):')
      console.log({
        from: emailFrom,
        to: recipients,
        subject: emailSubject,
        body: emailBody,
        html: emailHtml
      })
      return {
        recipients: recipients.length,
        message: 'Email logged (SMTP not configured)'
      }
    }

    // Build transporter config
    const transportConfig = {
      host: smtpHost,
      port: parseInt(smtpPort) || 25,
      secure: smtpSecure === 'true' || smtpSecure === true || false
    }

    // Only add auth if user and pass are provided (MailHog doesn't need auth)
    if (smtpUser && smtpPass) {
      transportConfig.auth = {
        user: smtpUser,
        pass: smtpPass
      }
      console.log(`📧 Using authenticated SMTP: ${smtpHost}:${transportConfig.port}`)
    } else {
      console.log(`📧 Using unauthenticated SMTP: ${smtpHost}:${transportConfig.port} (e.g., MailHog)`)
    }

    const transporter = nodemailer.createTransport(transportConfig)

    const mailOptions = {
      from: emailFrom,
      to: recipients.join(', '),
      subject: emailSubject,
      [emailHtml ? 'html' : 'text']: emailBody
    }

    console.log(`📧 Sending email via ${smtpHost}:${transportConfig.port}...`)
    const info = await transporter.sendMail(mailOptions)
    console.log(`✅ Email sent! Message ID: ${info.messageId}`)

    return {
      messageId: info.messageId,
      recipients: recipients.length,
      message: 'Email sent successfully'
    }
  }

  /**
   * Send Slack notification via OAuth (chat.postMessage API)
   * @param {Object} notification - Slack notification config
   * @param {Object} context - Context data
   */
  async sendSlack(notification, context) {
    const {
      slackChannel,
      slackMessage,
      slackBlocks,
      slackMode = 'simple'
    } = notification

    // Get Slack Bot Token from environment variables
    const slackBotToken = process.env.SLACK_BOT_TOKEN
    const defaultChannel = process.env.SLACK_DEFAULT_CHANNEL

    // Validate configuration
    if (!slackBotToken) {
      throw new Error('Slack Bot Token not configured. Please set SLACK_BOT_TOKEN environment variable, or use the Webhook notification type for Slack Incoming Webhooks.')
    }

    const channel = slackChannel || defaultChannel
    if (!channel) {
      throw new Error('Slack channel is required. Specify it in the notification or set SLACK_DEFAULT_CHANNEL environment variable.')
    }

    if (!slackMessage && !slackBlocks) {
      throw new Error('Missing required Slack content: Either message or blocks must be provided')
    }

    console.log(`💬 Sending Slack message via OAuth (Bot Token)...`)
    console.log(`   Channel: ${channel}`)
    console.log(`   Bot Token: ${slackBotToken.substring(0, 15)}...`)

    // Build Slack API payload
    const payload = {
      channel: channel
    }

    // Add message text (required as fallback even with blocks)
    if (slackMessage) {
      payload.text = slackMessage
    }

    // Add blocks if using blocks mode
    if (slackMode === 'blocks' && slackBlocks) {
      try {
        payload.blocks = typeof slackBlocks === 'string' ? JSON.parse(slackBlocks) : slackBlocks
      } catch (error) {
        console.warn('⚠️  Failed to parse Slack blocks, falling back to simple message:', error.message)
      }
    }

    // Call Slack chat.postMessage API
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${slackBotToken}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Slack API request failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`)
    }

    console.log(`✅ Slack message sent to channel ${result.channel}`)

    return {
      status: response.status,
      response: result,
      messageTs: result.ts,
      channel: result.channel
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
