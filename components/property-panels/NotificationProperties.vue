<template>
  <div>
    <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
      <div class="flex items-center mb-2">
        <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
        <h4 class="text-sm font-semibold text-blue-800 dark:text-blue-200">Notification Configuration</h4>
      </div>
      <p class="text-xs text-blue-700 dark:text-blue-300">
        Send notifications via Email, Slack, or Webhook when this node executes.
      </p>
    </div>

    <!-- Template Selector -->
    <div class="mt-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
      <label class="block text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
        Use Template (Optional)
      </label>
      <select
        v-model="selectedTemplateId"
        :disabled="isLoadingTemplate"
        class="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white text-sm disabled:opacity-50"
      >
        <option value="">-- Select a template --</option>
        <optgroup v-if="filteredTemplates.length > 0" label="Available Templates">
          <option v-for="template in filteredTemplates" :key="template.id" :value="template.id">
            {{ template.name }}
          </option>
        </optgroup>
      </select>
      <p class="mt-2 text-xs text-purple-700 dark:text-purple-300">
        {{ isLoadingTemplate ? 'Loading template...' : 'Choose a template to automatically fill the form fields below' }}
      </p>
    </div>

    <!-- Notification Type Selection -->
    <div class="mt-3">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Notification Type <span class="text-red-500">*</span>
      </label>
      <select
        v-model="nodeData.data.notificationType"
        @change="onNotificationTypeChange"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
        <option value="email">Email</option>
        <option value="slack">Slack</option>
        <option value="webhook">Webhook</option>
      </select>
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Select the type of notification to send
      </p>
    </div>

    <!-- Email Configuration -->
    <div v-if="nodeData.data.notificationType === 'email'" class="mt-4 space-y-3">
      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          From Address <span class="text-red-500">*</span>
        </label>
        <input
          v-model="nodeData.data.emailFrom"
          type="email"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
          placeholder="noreply@example.com"
          :class="{ 'border-red-500 dark:border-red-400': !nodeData.data.emailFrom }"
        />
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Email address to send from
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          To (Recipients) <span class="text-red-500">*</span>
        </label>
        <input
          v-model="nodeData.data.emailTo"
          type="text"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
          placeholder="user@example.com, admin@example.com"
          :class="{ 'border-red-500 dark:border-red-400': !nodeData.data.emailTo }"
        />
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Comma-separated list of email addresses
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Subject <span class="text-red-500">*</span>
        </label>
        <input
          v-model="nodeData.data.emailSubject"
          type="text"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
          placeholder="Workflow Notification: Job Completed"
          :class="{ 'border-red-500 dark:border-red-400': !nodeData.data.emailSubject }"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Message Body <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="nodeData.data.emailBody"
          rows="6"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
          placeholder="Enter email message body..."
          :class="{ 'border-red-500 dark:border-red-400': !nodeData.data.emailBody }"
        ></textarea>
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Use $SocketName to reference input socket values
        </p>
      </div>

      <div>
        <label class="flex items-center">
          <input
            v-model="nodeData.data.emailHtml"
            type="checkbox"
            class="w-4 h-4 text-blue-600 bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span class="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Send as HTML</span>
        </label>
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Enable to send HTML formatted emails
        </p>
      </div>
    </div>

    <!-- Slack Configuration -->
    <div v-if="nodeData.data.notificationType === 'slack'" class="mt-4 space-y-3">
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p class="text-sm text-blue-800 dark:text-blue-200">
          <strong>Slack App Integration:</strong> Set <code class="px-1 bg-blue-100 dark:bg-blue-800 rounded">SLACK_BOT_TOKEN</code> environment variable to enable Slack notifications.
        </p>
        <p class="text-xs text-blue-700 dark:text-blue-300 mt-1">
          💡 For Slack Incoming Webhooks, use the "Webhook" notification type instead.
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Channel <span class="text-red-500">*</span>
        </label>
        <input
          v-model="nodeData.data.slackChannel"
          type="text"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
          placeholder="#general, @username, or C1234567890"
          :class="{ 'border-red-500 dark:border-red-400': !nodeData.data.slackChannel }"
        />
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Specify the Slack channel (e.g., #general), user (e.g., @john), or channel ID
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Message Mode
        </label>
        <select
          v-model="nodeData.data.slackMode"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
        >
          <option value="simple">Simple Text Message</option>
          <option value="blocks">Block Kit (Rich Formatting)</option>
        </select>
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Block Kit enables rich, interactive messages with formatted layouts
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Message <span class="text-red-500">*</span>
          <span v-if="nodeData.data.slackMode === 'blocks'" class="text-neutral-400 font-normal">(Fallback Text)</span>
        </label>
        <textarea
          v-model="nodeData.data.slackMessage"
          rows="4"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
          placeholder=":white_check_mark: Build #$BuildNumber completed successfully!"
          :class="{ 'border-red-500 dark:border-red-400': !nodeData.data.slackMessage }"
        ></textarea>
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {{ nodeData.data.slackMode === 'blocks' ? 'Fallback text when blocks cannot be displayed' : 'Markdown-formatted message with emoji support' }}
        </p>
      </div>

      <div v-if="nodeData.data.slackMode === 'blocks'">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Slack Blocks (JSON)
        </label>
        <textarea
          v-model="nodeData.data.slackBlocks"
          rows="10"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-xs"
          placeholder='[{"type":"header","text":{"type":"plain_text","text":"Build #$BuildNumber"}}]'
        ></textarea>
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          JSON array of Slack Block Kit blocks. <a href="https://app.slack.com/block-kit-builder" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">Use Block Kit Builder →</a>
        </p>
      </div>
    </div>

    <!-- Webhook Configuration -->
    <div v-if="nodeData.data.notificationType === 'webhook'" class="mt-4 space-y-3">
      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Webhook URL
        </label>
        <input
          v-model="nodeData.data.webhookUrl"
          type="url"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
          placeholder="https://discord.com/api/webhooks/... (or leave empty to use DISCORD_WEBHOOK_URL)"
        />
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Optional: Specify webhook URL here, or leave empty to use <code class="px-1 bg-neutral-200 dark:bg-neutral-800 rounded">DISCORD_WEBHOOK_URL</code> environment variable
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          HTTP Method
        </label>
        <select
          v-model="nodeData.data.webhookMethod"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
        >
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="GET">GET</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Headers (JSON)
        </label>
        <textarea
          v-model="nodeData.data.webhookHeaders"
          rows="4"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
          placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token123"}'
        ></textarea>
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Optional HTTP headers as JSON object
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Body (JSON) <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="nodeData.data.webhookBody"
          rows="6"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
          placeholder='{"status": "completed", "message": "Job finished"}'
          :class="{ 'border-red-500 dark:border-red-400': !nodeData.data.webhookBody }"
        ></textarea>
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Request body as JSON. Use $SocketName to reference input socket values.
        </p>
      </div>
    </div>

    <!-- Available Variables Documentation -->
    <div class="mt-4 p-3 bg-purple-50 dark:bg-purple-950 rounded text-xs">
      <div class="font-medium text-purple-800 dark:text-purple-200 mb-2">Available Context Variables:</div>
      <div class="text-purple-700 dark:text-purple-300 space-y-1">
        <div class="font-mono">$ProjectName - Name of the project being executed</div>
        <div class="font-mono">$ProjectId - The project identifier (UUID)</div>
        <div class="font-mono">$BuildNumber - The current build number</div>
        <div class="font-mono">$JobId - Unique identifier for this job execution</div>
        <div class="font-mono">$Status - Status text based on exit code (Success/Failed)</div>
        <div class="font-mono">$ExitCode - Exit code from previous execution (0 = success)</div>
        <div class="font-mono">$FailedNodeLabel - Label of the node that failed (only on failure)</div>
        <div class="font-mono">$CurrentAttempt - Current failure attempt number (1, 2, 3, etc.)</div>
        <div class="font-mono">$MaxAttempts - Maximum number of attempts configured</div>
        <div class="font-mono">$IsRetrying - Whether the job will retry (Yes/No)</div>
        <div class="font-mono">$WillRetry - Same as IsRetrying (Yes/No)</div>
        <div class="font-mono">$Output - Output from the previous node</div>
        <div class="font-mono">$Timestamp - ISO 8601 timestamp (e.g., 2025-10-23T14:30:00.000Z)</div>
        <div class="font-mono">$TimestampHuman - Human-readable timestamp (e.g., Oct 23, 2025, 02:30:00 PM)</div>
        <div class="font-mono">$DefaultEmailFrom - Default from address from system settings</div>
        <div class="font-mono">$DefaultEmailTo - Default to address from system settings</div>
        <div class="font-mono">$AdminEmail - Administrator email from system settings</div>
      </div>
      <p class="mt-2 text-purple-700 dark:text-purple-300">
        Use both ${'{VarName}'} or $VarName format in your notification messages
      </p>
    </div>

    <!-- Input Socket Variables Help -->
    <div v-if="nodeData.data.inputSockets && nodeData.data.inputSockets.length > 0" class="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded text-xs">
      <div class="font-medium text-green-800 dark:text-green-200 mb-2">Available Input Socket Variables:</div>
      <div class="text-green-700 dark:text-green-300 space-y-1">
        <div v-for="socket in nodeData.data.inputSockets" :key="socket.id" class="font-mono">
          ${{ socket.label }}
        </div>
      </div>
      <p class="mt-2 text-green-700 dark:text-green-300">
        Use these variables to include data passed from connected nodes
      </p>
    </div>

    <!-- Usage Examples -->
    <div class="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded text-xs">
      <div class="font-medium text-amber-800 dark:text-amber-200 mb-2">Usage Examples:</div>
      <div class="text-amber-700 dark:text-amber-300 space-y-2">
        <div v-if="nodeData.data.notificationType === 'email'">
          <div class="font-medium mb-1">Email Notification (Success):</div>
          <div class="pl-2 space-y-1 font-mono text-xs">
            <div>Subject: "[$ProjectName] Build #$BuildNumber - $Status"</div>
            <div>Body: "Build $BuildNumber completed at $TimestampHuman"</div>
          </div>
          <div class="font-medium mb-1 mt-2">Email Notification (Failure with Retry):</div>
          <div class="pl-2 space-y-1 font-mono text-xs">
            <div>Subject: "[$ProjectName] Build #$BuildNumber - Attempt $CurrentAttempt Failed"</div>
            <div>Body: "Node '$FailedNodeLabel' failed (attempt $CurrentAttempt/$MaxAttempts). Will retry: $WillRetry"</div>
          </div>
        </div>
        <div v-if="nodeData.data.notificationType === 'slack'">
          <div class="font-medium mb-1">Slack Notification:</div>
          <div class="pl-2 space-y-1 font-mono text-xs">
            <div>":x: *$ProjectName* - Build #$BuildNumber Failed"</div>
            <div>"*Failed Node:* $FailedNodeLabel"</div>
            <div>"*Time:* $TimestampHuman | *Exit Code:* $ExitCode"</div>
          </div>
        </div>
        <div v-if="nodeData.data.notificationType === 'webhook'">
          <div class="font-medium mb-1">Webhook Payload:</div>
          <div class="pl-2 font-mono bg-amber-100 dark:bg-amber-900 p-2 rounded mt-1 text-xs">
            {<br/>
            &nbsp;&nbsp;"event": "build_failed",<br/>
            &nbsp;&nbsp;"project": "$ProjectName",<br/>
            &nbsp;&nbsp;"buildNumber": "$BuildNumber",<br/>
            &nbsp;&nbsp;"failedNode": "$FailedNodeLabel",<br/>
            &nbsp;&nbsp;"status": "$Status",<br/>
            &nbsp;&nbsp;"exitCode": $ExitCode,<br/>
            &nbsp;&nbsp;"timestamp": "$Timestamp"<br/>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- SMTP Configuration Notice (for email) -->
    <div v-if="nodeData.data.notificationType === 'email'" class="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded text-xs">
      <div class="font-medium text-blue-800 dark:text-blue-200 mb-1">SMTP Configuration Required</div>
      <div class="text-blue-700 dark:text-blue-300">
        Make sure your SMTP server settings are configured in the system environment variables or configuration file.
      </div>
    </div>

    <!-- Slack Setup Guide -->
    <div v-if="nodeData.data.notificationType === 'slack'" class="mt-4 p-3 bg-purple-50 dark:bg-purple-950 rounded text-xs">
      <div class="font-medium text-purple-800 dark:text-purple-200 mb-2">Slack Webhook Setup:</div>
      <div class="text-purple-700 dark:text-purple-300 space-y-1">
        <div>1. Go to https://api.slack.com/apps</div>
        <div>2. Create a new app or select existing</div>
        <div>3. Enable "Incoming Webhooks"</div>
        <div>4. Add webhook to workspace</div>
        <div>5. Copy the webhook URL and paste above</div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})

// Template management
const templates = ref([])
const selectedTemplateId = ref('')
const isLoadingTemplate = ref(false)
const logger = useLogger()

// Initialize default values if not set
if (!props.nodeData.data.notificationType) {
  props.nodeData.data.notificationType = 'email'
}
if (!props.nodeData.data.webhookMethod) {
  props.nodeData.data.webhookMethod = 'POST'
}
if (props.nodeData.data.emailHtml === undefined) {
  props.nodeData.data.emailHtml = false
}

// Initialize email fields with default values if empty
if (!props.nodeData.data.emailFrom) {
  props.nodeData.data.emailFrom = '$DefaultEmailFrom'
}
if (!props.nodeData.data.emailTo) {
  props.nodeData.data.emailTo = '$DefaultEmailTo'
}

// Fetch templates on mount
onMounted(async () => {
  await fetchTemplates()
})

// Computed: Filter templates by current notification type
const filteredTemplates = computed(() => {
  return templates.value.filter(t => t.type === props.nodeData.data.notificationType)
})

// Fetch all templates from API
async function fetchTemplates() {
  try {
    const response = await $fetch('/api/notification-templates')
    if (response.success) {
      templates.value = response.templates
    }
  } catch (error) {
    logger.error('Failed to fetch notification templates:', error)
  }
}

// When notification type changes, reset template selection
function onNotificationTypeChange() {
  selectedTemplateId.value = ''
}

// Load selected template and auto-fill fields
async function loadTemplate() {
  if (!selectedTemplateId.value) return

  isLoadingTemplate.value = true

  try {
    const template = templates.value.find(t => t.id === selectedTemplateId.value)

    if (!template) {
      logger.error('Template not found')
      return
    }

    // Auto-fill fields based on template type
    if (template.type === 'email') {
      props.nodeData.data.emailSubject = template.email_subject || ''
      props.nodeData.data.emailBody = template.email_body || ''
      props.nodeData.data.emailHtml = template.email_html || false
    } else if (template.type === 'slack') {
      props.nodeData.data.slackMessage = template.slack_message || ''
      props.nodeData.data.slackBlocks = template.slack_blocks || ''
      props.nodeData.data.slackMode = template.slack_mode || 'simple'
    } else if (template.type === 'webhook') {
      props.nodeData.data.webhookMethod = template.webhook_method || 'POST'
      props.nodeData.data.webhookHeaders = template.webhook_headers || '{}'
      props.nodeData.data.webhookBody = template.webhook_body || ''
    }

    logger.info(`Template "${template.name}" loaded successfully`)
  } catch (error) {
    logger.error('Failed to load template:', error)
  } finally {
    isLoadingTemplate.value = false
  }
}

// Watch for template selection changes and auto-load
watch(selectedTemplateId, (newTemplateId) => {
  if (newTemplateId) {
    loadTemplate()
  }
})
</script>
