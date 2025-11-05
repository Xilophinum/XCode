/**
 * Notification Service
 * Handles sending notifications via Email, Slack, and Webhooks
 *
 * BUILD LOG ATTACHMENTS:
 *
 * When the "Attach build log file" option is enabled in a notification node,
 * build logs are handled differently depending on the notification type:
 *
 * 1. EMAIL:
 *    - Attaches the log file as an email attachment using nodemailer
 *    - Filename: build_${projectId}_${buildNumber}.log
 *
 * 2. SLACK (OAuth):
 *    - Uploads the file using Slack's files.uploadV2 API
 *    - REQUIRES: "files:write" OAuth scope on your Slack app
 *    - The file is uploaded with the message as initial_comment
 *    - To add this scope: Go to api.slack.com/apps → Your App → OAuth & Permissions → Scopes
 *
 * 3. WEBHOOK (Generic):
 *    - DISCORD: Automatically detects Discord webhooks and sends file as multipart/form-data attachment
 *    - OTHER WEBHOOKS: Log content is added to context variables for template substitution:
 *      • $BuildLog - Full build log content as string
 *      • $BuildLogPath - Absolute path to the log file
 *
 *    Example for non-Discord webhooks:
 *    {
 *      "message": "Build completed",
 *      "log": "$BuildLog",
 *      "logPath": "$BuildLogPath"
 *    }
 *
 * Log files are automatically deleted 30 seconds after build completion.
 */

import nodemailer from 'nodemailer'
import { getDataService } from './dataService.js'
import logger, { getBuildLogPath } from './logger.js'
import fs from 'fs'
import FormData from 'form-data'

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
      logger.error('No notification command provided')
      return { success: false, error: 'No notification command' }
    }

    const { notificationType } = notificationCommand

    logger.info(`Sending ${notificationType} notification...`)
    logger.info(`Context data:`, context)

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

      logger.info(`${notificationType} notification sent successfully`)
      return { success: true, ...result }
    } catch (error) {
      logger.error(`Failed to send ${notificationType} notification:`, error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Resolve context variables in notification fields
   * System Variables: $BuildNumber, $JobId, $ProjectId, $ProjectName, $ExitCode, $Timestamp, $TimestampHuman, $FailedNodeLabel, $DefaultEmailFrom, $DefaultEmailTo, $AdminEmail, $BuildLog, $BuildLogPath
   * Environment Variables: Any custom environment variables from system settings (e.g., $MY_ENV, $API_KEY)
   * Note: Use input sockets ($INPUT_1, $INPUT_2, etc.) to reference output from connected nodes
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

    // Get build log content if attachBuildLog is enabled
    let buildLogContent = ''
    let buildLogPath = ''

    if (command.attachBuildLog && context.projectId && context.buildNumber) {
      const logPath = getBuildLogPath(context.projectId, context.buildNumber)
      if (logPath) {
        buildLogPath = logPath
        try {
          buildLogContent = fs.readFileSync(logPath, 'utf-8')
        } catch (error) {
          logger.warn(`Failed to read build log for context variables: ${error.message}`)
          buildLogContent = '[Build log unavailable]'
        }
      }
    }

    // Get environment variables from system settings
    const envVariables = await dataService.getEnvVariables()
    const envVarMap = {}
    for (const envVar of envVariables) {
      envVarMap[envVar.key] = envVar.value
    }

    // Build variable map (includes system context variables + environment variables)
    const variables = {
      // System context variables
      BuildNumber: context.buildNumber || 'N/A',
      JobId: context.jobId || 'N/A',
      ProjectId: context.projectId || 'N/A',
      ProjectName: context.projectName || 'N/A',
      ExitCode: context.exitCode !== undefined ? String(context.exitCode) : 'N/A',
      Timestamp: now.toISOString(),
      TimestampHuman: humanReadableTimestamp,
      Status: context.exitCode === 0 ? 'Success' : 'Failed',
      FailedNodeLabel: context.failedNodeLabel || (context.exitCode !== 0 ? 'Unknown' : 'N/A'),
      DefaultEmailFrom: getSetting('default_email_from'),
      DefaultEmailTo: getSetting('default_email_to'),
      AdminEmail: getSetting('admin_email'),
      CurrentAttempt: context.currentAttempt !== undefined ? String(context.currentAttempt) : 'N/A',
      MaxAttempts: context.maxAttempts !== undefined ? String(context.maxAttempts) : 'N/A',
      WillRetry: context.isRetrying ? 'Yes' : 'No',
      BuildLog: buildLogContent,
      BuildLogPath: buildLogPath,
      // Environment variables from system settings (e.g., $MY_ENV, $API_KEY, etc.)
      ...envVarMap
    }
    
    // Helper function to escape a value for safe inclusion in JSON strings
    const escapeJsonValue = (value) => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      return str
        .replace(/\\/g, '\\\\')   // Escape backslashes
        .replace(/"/g, '\\"')     // Escape double quotes
        .replace(/\n/g, '\\n')    // Escape newlines
        .replace(/\r/g, '\\r')    // Escape carriage returns
        .replace(/\t/g, '\\t')    // Escape tabs
    }

    // Helper function to replace variables in a string
    const replaceVariables = (text, escapeForJson = false) => {
      if (!text || typeof text !== 'string') return text

      let result = text

      // Replace each variable (supports both ${VarName} and $VarName formats)
      Object.entries(variables).forEach(([key, value]) => {
        const bracedPattern = new RegExp(`\\$\\{${key}\\}`, 'g')
        const unbracedPattern = new RegExp(`\\$${key}\\b`, 'g')

        const replacementValue = escapeForJson ? escapeJsonValue(value) : value

        result = result.replace(bracedPattern, replacementValue)
        result = result.replace(unbracedPattern, replacementValue)
      })

      return result
    }

    // Helper function to recursively replace variables in a JSON object/array
    const replaceVariablesInObject = (obj) => {
      if (typeof obj === 'string') {
        return replaceVariables(obj)
      } else if (Array.isArray(obj)) {
        return obj.map(replaceVariablesInObject)
      } else if (obj !== null && typeof obj === 'object') {
        const result = {}
        for (const [key, value] of Object.entries(obj)) {
          result[key] = replaceVariablesInObject(value)
        }
        return result
      }
      return obj
    }

    // Resolve variables in all relevant fields
    if (resolved.emailFrom) resolved.emailFrom = replaceVariables(resolved.emailFrom)
    if (resolved.emailTo) resolved.emailTo = replaceVariables(resolved.emailTo)
    if (resolved.emailSubject) resolved.emailSubject = replaceVariables(resolved.emailSubject)
    if (resolved.emailBody) resolved.emailBody = replaceVariables(resolved.emailBody)
    if (resolved.slackMessage) resolved.slackMessage = replaceVariables(resolved.slackMessage)
    if (resolved.slackChannel) resolved.slackChannel = replaceVariables(resolved.slackChannel)

    // Webhook body - parse JSON, replace context variables in object structure, re-stringify
    // Note: Input placeholders ($Input_1, etc.) are already resolved in execute.post.js
    // This handles context variables ($BuildNumber, $ProjectName, etc.)
    if (resolved.webhookBody) {
      try {
        // Try to parse as JSON
        const parsedBody = JSON.parse(resolved.webhookBody)
        // Replace context variables in the parsed object structure
        const resolvedBody = replaceVariablesInObject(parsedBody)
        // Re-stringify to ensure valid JSON
        resolved.webhookBody = JSON.stringify(resolvedBody)
      } catch (error) {
        // Not valid JSON, fall back to simple string replacement with escaping
        logger.warn('Webhook body is not JSON, using simple string replacement:', error.message)
        resolved.webhookBody = replaceVariables(resolved.webhookBody, true)
      }
    }

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

    logger.info(`Sending email to ${recipients.length} recipient(s)...`)
    logger.info(`   From: ${emailFrom}`)
    logger.info(`   To: ${recipients.join(', ')}`)
    logger.info(`   Subject: ${emailSubject}`)

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
      logger.warn('SMTP_HOST not configured - email will not be sent')
      logger.info('Email notification (not sent - SMTP not configured):')
      logger.info({
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
      logger.info(`Using authenticated SMTP: ${smtpHost}:${transportConfig.port}`)
    } else {
      logger.info(`Using unauthenticated SMTP: ${smtpHost}:${transportConfig.port} (e.g., MailHog)`)
    }

    const transporter = nodemailer.createTransport(transportConfig)

    const mailOptions = {
      from: emailFrom,
      to: recipients.join(', '),
      subject: emailSubject,
      [emailHtml ? 'html' : 'text']: emailBody
    }

    // Attach build log file if requested and available
    if (notification.attachBuildLog && context.projectId && context.buildNumber) {
      const logPath = getBuildLogPath(context.projectId, context.buildNumber)
      if (logPath) {
        mailOptions.attachments = [{
          filename: `build_${context.projectId}_${context.buildNumber}.log`,
          path: logPath
        }]
        logger.info(`Attaching build log: ${logPath}`)
      } else {
        logger.warn(`Build log requested but not found for build #${context.buildNumber}`)
      }
    }

    logger.info(`Sending email via ${smtpHost}:${transportConfig.port}...`)
    const info = await transporter.sendMail(mailOptions)
    logger.info(`Email sent! Message ID: ${info.messageId}`)

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

    logger.info(`Sending Slack message via OAuth (Bot Token)...`)
    logger.info(`Channel: ${channel}`)
    logger.info(`Bot Token: ${slackBotToken.substring(0, 15)}...`)

    // Upload build log file if requested
    let fileId = null
    if (notification.attachBuildLog && context.projectId && context.buildNumber) {
      const logPath = getBuildLogPath(context.projectId, context.buildNumber)
      if (logPath) {
        try {
          logger.info(`Uploading build log to Slack: ${logPath}`)
          const fileContent = fs.readFileSync(logPath)
          const fileName = `build_${context.projectId}_${context.buildNumber}.log`

          // Use Slack files.uploadV2 API
          const formData = new FormData()
          formData.append('file', fileContent, fileName)
          formData.append('filename', fileName)
          formData.append('channels', channel)
          formData.append('initial_comment', slackMessage || 'Build log file')

          const uploadResponse = await fetch('https://slack.com/api/files.uploadV2', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${slackBotToken}`,
              ...formData.getHeaders()
            },
            body: formData
          })

          const uploadResult = await uploadResponse.json()

          if (!uploadResult.ok) {
            logger.warn(`Failed to upload build log to Slack: ${uploadResult.error}`)
          } else {
            fileId = uploadResult.file?.id
            // If we uploaded the file with a message, we're done
            return {
              status: uploadResponse.status,
              response: uploadResult,
              fileId: fileId,
              channel: channel
            }
          }
        } catch (error) {
          logger.warn(`Error uploading build log to Slack: ${error.message}`)
        }
      } else {
        logger.warn(`Build log requested but not found for build #${context.buildNumber}`)
      }
    }

    // Build Slack API payload for message
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
        logger.warn('Failed to parse Slack blocks, falling back to simple message:', error.message)
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

    logger.info(`Slack message sent to channel ${result.channel}`)

    return {
      status: response.status,
      response: result,
      messageTs: result.ts,
      channel: result.channel,
      fileId: fileId
    }
  }

  /**
   * Send webhook notification
   * @param {Object} notification - Webhook notification config
   * @param {Object} context - Context data
   */
  async sendWebhook(notification, context) {
    let { webhookUrl, webhookMethod, webhookHeaders, webhookBody } = notification

    // Use DISCORD_WEBHOOK_URL environment variable as fallback if no URL provided
    if (!webhookUrl && process.env.DISCORD_WEBHOOK_URL) {
      webhookUrl = process.env.DISCORD_WEBHOOK_URL
      logger.info(`Using DISCORD_WEBHOOK_URL from environment variable`)
    }

    // Validate required fields
    if (!webhookUrl || !webhookBody) {
      throw new Error('Missing required webhook fields (url, body). Provide a webhook URL in the notification node or set DISCORD_WEBHOOK_URL environment variable.')
    }

    const method = webhookMethod || 'POST'

    logger.info(`Sending webhook...`)
    logger.info(`URL: ${webhookUrl}`)
    logger.info(`Method: ${method}`)

    // Detect if this is a Discord webhook (supports file uploads via multipart/form-data)
    const isDiscordWebhook = webhookUrl && webhookUrl.includes('discord.com/api/webhooks')

    // Check if we need to attach a build log file to Discord
    const shouldAttachFile = notification.attachBuildLog && context.projectId && context.buildNumber
    let logPath = null

    if (shouldAttachFile) {
      logPath = getBuildLogPath(context.projectId, context.buildNumber)
      if (!logPath) {
        logger.warn(`Build log requested but not found for build #${context.buildNumber}`)
      }
    }

    // If attaching a file to Discord webhook, use multipart/form-data
    if (logPath && isDiscordWebhook) {
      logger.info(`Attaching build log to Discord webhook: ${logPath}`)
      const formData = new FormData()

      // Parse the JSON body and add as payload_json for Discord
      let parsedBody
      if (typeof webhookBody === 'string') {
        try {
          parsedBody = JSON.parse(webhookBody)
        } catch (error) {
          logger.warn('Webhook body is not valid JSON, sending as-is:', error.message)
          parsedBody = { content: webhookBody }
        }
      } else {
        parsedBody = webhookBody
      }

      // Add JSON payload
      formData.append('payload_json', JSON.stringify(parsedBody))

      // Add the build log file
      const fileName = `build_${context.projectId}_${context.buildNumber}.log`
      formData.append('file', fs.createReadStream(logPath), fileName)

      // Parse custom headers
      let customHeaders = {}
      if (webhookHeaders) {
        try {
          customHeaders = typeof webhookHeaders === 'string'
            ? JSON.parse(webhookHeaders)
            : webhookHeaders
        } catch (error) {
          logger.warn('Failed to parse webhook headers, using default:', error.message)
        }
      }

      logger.info('Sending Discord webhook with file attachment via multipart/form-data')

      // Send multipart form data
      const response = await fetch(webhookUrl, {
        method,
        headers: {
          ...customHeaders,
          ...formData.getHeaders()
        },
        body: formData
      })

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

      logger.info(`Discord webhook response:`, responseData)

      return {
        status: response.status,
        response: responseData,
        fileAttached: true
      }
    }

    // Standard JSON webhook (no file attachment)
    // Parse headers
    let headers = { 'Content-Type': 'application/json' }

    if (webhookHeaders) {
      try {
        const customHeaders = typeof webhookHeaders === 'string'
          ? JSON.parse(webhookHeaders)
          : webhookHeaders
        headers = { ...headers, ...customHeaders }
      } catch (error) {
        logger.warn('Failed to parse webhook headers, using default:', error.message)
      }
    }

    // Parse body and ensure valid JSON
    let body = webhookBody
    if (typeof body === 'string') {
      try {
        // Parse and re-stringify to ensure valid JSON
        const parsed = JSON.parse(body)
        body = JSON.stringify(parsed)
      } catch (error) {
        logger.warn('Webhook body is not valid JSON:', error.message)
      }
    } else {
      body = JSON.stringify(body)
    }

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

    logger.info(`Webhook response:`, responseData)

    return {
      status: response.status,
      response: responseData
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
