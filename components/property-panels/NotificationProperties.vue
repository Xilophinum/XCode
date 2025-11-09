<template>
  <div class="space-y-4">
    <UAlert color="primary" variant="soft" icon="i-lucide-bell">
      <template #title>Notification Configuration</template>
      <template #description>
        Send notifications via Email, Slack, or Webhook when this node executes.
      </template>
    </UAlert>

    <!-- Template Selector -->
    <UAlert color="secondary" variant="soft">
      <template #title>Use Template (Optional)</template>
      <template #description>
        <UFormField class="mt-2">
          <USelect
            v-model="selectedTemplateId"
            :disabled="isLoadingTemplate || templateOptions.length === 0"
            :items="templateOptions"
            size="md"
            class="w-full"
            placeholder="-- Select a template --"
          />
        </UFormField>
        <p class="mt-2 text-xs">
          {{ isLoadingTemplate ? 'Loading template...' : templateOptions.length === 0 ? 'No templates available for this notification type' : 'Choose a template to automatically fill the form fields below' }}
        </p>
      </template>
    </UAlert>

    <!-- Notification Type Selection -->
    <UFormField label="Notification Type" required>
      <USelect
        v-model="nodeData.data.notificationType"
        @change="onNotificationTypeChange"
        :items="notificationTypeOptions"
        size="md"
        class="w-full"
      />
      <template #help>
        Select the type of notification to send
      </template>
    </UFormField>

    <!-- General Options (for all notification types) -->
    <UAlert color="secondary" variant="soft">
      <template #title>General Options</template>
      <template #description>
        <UCheckbox
          v-model="nodeData.data.attachBuildLog"
          label="Attach build log file"
          help="Email: Attaches log file • Slack: Uploads file (requires files:write scope) • Discord: Attaches file • Other webhooks: Use $BuildLog variable"
        />
      </template>
    </UAlert>

    <!-- Email Configuration -->
    <div v-if="nodeData.data.notificationType === 'email'" class="space-y-4">
      <UFormField label="From Address" required>
        <UInput
          v-model="nodeData.data.emailFrom"
          type="email"
          size="md"
          class="w-full"
          placeholder="noreply@example.com"
        />
        <template #help>
          Email address to send from
        </template>
      </UFormField>

      <UFormField label="To (Recipients)" required>
        <UInput
          v-model="nodeData.data.emailTo"
          type="text"
          size="md"
          class="w-full"
          placeholder="user@example.com, admin@example.com"
        />
        <template #help>
          Comma-separated list of email addresses
        </template>
      </UFormField>

      <UFormField label="Subject" required>
        <UInput
          v-model="nodeData.data.emailSubject"
          type="text"
          size="md"
          class="w-full"
          placeholder="Workflow Notification: Job Completed"
        />
      </UFormField>

      <UFormField label="Message Body" required>
        <UTextarea
          v-model="nodeData.data.emailBody"
          size="md"
          class="w-full"
          placeholder="Enter email message body..."
        />
        <template #help>
          Use $SocketName to reference input socket values
        </template>
      </UFormField>

      <UFormField>
        <UCheckbox
          v-model="nodeData.data.emailHtml"
          label="Send as HTML"
          help="Enable to send HTML formatted emails"
        />
      </UFormField>
    </div>

    <!-- Slack Configuration -->
    <div v-if="nodeData.data.notificationType === 'slack'" class="space-y-4">
      <UAlert color="primary" variant="soft" icon="i-lucide-info">
        <template #description>
          <p><strong>Slack App Integration:</strong> Set <code class="px-1 bg-primary-100 dark:bg-primary-800 rounded">SLACK_BOT_TOKEN</code> environment variable to enable Slack notifications.</p>
          <p class="mt-1">💡 For Slack Incoming Webhooks, use the "Webhook" notification type instead.</p>
        </template>
      </UAlert>

      <UFormField label="Channel" required>
        <UInput
          v-model="nodeData.data.slackChannel"
          type="text"
          size="md"
          class="w-full"
          placeholder="#general, @username, or C1234567890"
        />
        <template #help>
          Specify the Slack channel (e.g., #general), user (e.g., @john), or channel ID
        </template>
      </UFormField>

      <UFormField label="Message Mode">
        <USelect
          v-model="nodeData.data.slackMode"
          :items="slackModeOptions"
          size="md"
          class="w-full"
        />
        <template #help>
          Block Kit enables rich, interactive messages with formatted layouts
        </template>
      </UFormField>

      <UFormField required>
        <template #label>
          <span>Message <span v-if="nodeData.data.slackMode === 'blocks'" class="text-neutral-400 font-normal">(Fallback Text)</span></span>
        </template>
        <UTextarea
          v-model="nodeData.data.slackMessage"
          v-auto-resize
          size="md"
          class="w-full font-mono"
          placeholder=":white_check_mark: Build #$BuildNumber completed successfully!"
        />
        <template #help>
          {{ nodeData.data.slackMode === 'blocks' ? 'Fallback text when blocks cannot be displayed' : 'Markdown-formatted message with emoji support' }}
        </template>
      </UFormField>

      <UFormField v-if="nodeData.data.slackMode === 'blocks'" label="Slack Blocks (JSON)">
        <UTextarea
          v-model="nodeData.data.slackBlocks"
          v-auto-resize
          size="md"
          class="w-full font-mono text-xs"
          placeholder='[{"type":"header","text":{"type":"plain_text","text":"Build #$BuildNumber"}}]'
        />
        <template #help>
          JSON array of Slack Block Kit blocks. <a href="https://app.slack.com/block-kit-builder" target="_blank" class="text-primary-600 dark:text-primary-400 hover:underline">Use Block Kit Builder →</a>
        </template>
      </UFormField>
    </div>

    <!-- Webhook Configuration -->
    <div v-if="nodeData.data.notificationType === 'webhook'" class="space-y-4">
      <UFormField label="Webhook URL">
        <UInput
          v-model="nodeData.data.webhookUrl"
          type="url"
          size="md"
          class="w-full font-mono"
          placeholder="https://discord.com/api/webhooks/... (or leave empty to use DISCORD_WEBHOOK_URL)"
        />
        <template #help>
          Optional: Specify webhook URL here, or leave empty to use <code class="px-1 bg-neutral-200 dark:bg-neutral-800 rounded">DISCORD_WEBHOOK_URL</code> environment variable
        </template>
      </UFormField>

      <UFormField label="HTTP Method">
        <USelect
          v-model="nodeData.data.webhookMethod"
          :items="webhookMethodOptions"
          size="md"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Headers (JSON)">
        <UTextarea
          v-model="nodeData.data.webhookHeaders"
          v-auto-resize
          size="md"
          class="w-full font-mono"
          placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token123"}'
        />
        <template #help>
          Optional HTTP headers as JSON object
        </template>
      </UFormField>

      <UFormField label="Body (JSON)" required>
        <UTextarea
          v-model="nodeData.data.webhookBody"
          v-auto-resize
          size="md"
          class="w-full font-mono"
          placeholder='{"status": "completed", "message": "Job finished"}'
        />
        <template #help>
          Request body as JSON. Use $SocketName to reference input socket values.
        </template>
      </UFormField>
    </div>

    <!-- Available Variables Documentation (Collapsible) -->
    <UAccordion :items="accordionItems" :multiple="true">
      <template #available-variables>
        <div class="mt-2 font-mono text-sm bg-neutral-100 dark:bg-neutral-800 p-2 rounded">
          <div><b>$ProjectName</b> - Name of the project being executed</div>
          <div><b>$ProjectId</b> - The project identifier (UUID)</div>
          <div><b>$BuildNumber</b> - The current build number</div>
          <div><b>$JobId</b> - Unique identifier for this job execution</div>
          <div><b>$Status</b> - Status text based on exit code (Success/Failed)</div>
          <div><b>$ExitCode</b> - Exit code from previous execution (0 = success)</div>
          <div><b>$FailedNodeLabel</b> - Label of the node that failed (only on failure)</div>
          <div><b>$CurrentAttempt</b> - Current failure attempt number (1, 2, 3, etc.)</div>
          <div><b>$MaxAttempts</b> - Maximum number of attempts configured</div>
          <div><b>$WillRetry</b> - Whether the job will retry after failure (Yes/No)</div>
          <div><b>$Timestamp</b> - ISO 8601 timestamp (e.g., 2025-10-23T14:30:00.000Z)</div>
          <div><b>$TimestampHuman</b> - Human-readable timestamp (e.g., Oct 23, 2025, 02:30:00 PM)</div>
          <div><b>$BuildLog</b> - Complete build log content (only when "Attach build log file" is enabled)</div>
          <div><b>$BuildLogPath</b> - Absolute path to build log file (only when "Attach build log file" is enabled)</div>
          <div><b>$DefaultEmailFrom</b> - Default from address from system settings</div>
          <div><b>$DefaultEmailTo</b> - Default to address from system settings</div>
          <div><b>$AdminEmail</b> - Administrator email from system settings</div>
        </div>
        <p class="mt-2 text-xs">
          Use $VarName format in your notification messages. To reference output from connected nodes, use input socket variables like $INPUT_1, $INPUT_2, etc. All environment variables from System Settings are also available (e.g., $MY_ENV, $API_KEY).
        </p>
      </template>

      <template #input-sockets v-if="nodeData.data.inputSockets && nodeData.data.inputSockets.length > 0">
        <div class="text-xs space-y-1 font-mono">
          <div v-for="socket in nodeData.data.inputSockets" :key="socket.id">
            ${{ socket.label }}
          </div>
        </div>
        <p class="mt-2 text-xs">
          Use these variables to include data passed from connected nodes
        </p>
      </template>

      <template #usage-examples>
        <div class="mt-2 font-mono text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded">
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
            <div class="font-medium mb-1">Webhook Payload (Basic):</div>
            <div class="pl-2 font-mono bg-neutral-100 dark:bg-neutral-800 p-2 rounded mt-1 text-xs">
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
            <div class="font-medium mb-1 mt-3">Webhook with Build Log (when "Attach build log file" is enabled):</div>
            <div class="pl-2 font-mono bg-neutral-100 dark:bg-neutral-800 p-2 rounded mt-1 text-xs">
              {<br/>
              &nbsp;&nbsp;"project": "$ProjectName",<br/>
              &nbsp;&nbsp;"buildNumber": "$BuildNumber",<br/>
              &nbsp;&nbsp;"status": "$Status",<br/>
              &nbsp;&nbsp;"buildLog": "$BuildLog",<br/>
              &nbsp;&nbsp;"logPath": "$BuildLogPath"<br/>
              }
            </div>
            <p class="mt-2 text-xs">
              Note: Discord webhooks automatically attach the log file. For other webhooks, use $BuildLog to include log content in the JSON payload.
            </p>
          </div>
        </div>
      </template>

      <template #setup-guide>
        <div class="text-xs">
          <!-- Email SMTP Setup -->
          <div v-if="nodeData.data.notificationType === 'email'">
            <div class="font-medium mb-2">SMTP Configuration Required</div>
            <div class="space-y-1">
              <div>Make sure your SMTP server settings are configured in the system environment variables or configuration file.</div>
              <div class="mt-2 font-mono text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded">
                Required environment variables (or set them in system settings):<br/>
                • SMTP_HOST<br/>
                • SMTP_PORT<br/>
                • SMTP_USER<br/>
                • SMTP_PASS
              </div>
            </div>
          </div>

          <!-- Slack Setup -->
          <div v-if="nodeData.data.notificationType === 'slack'">
            <div class="font-medium mb-2">Slack App Setup</div>
            <div class="space-y-1">
              <div>1. Go to https://api.slack.com/apps</div>
              <div>2. Create a new app or select existing</div>
              <div>3. Go to OAuth & Permissions → Scopes</div>
              <div>4. Add Bot Token Scopes: <code class="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">chat:write</code> and <code class="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">files:write</code></div>
              <div>5. Install app to workspace</div>
              <div>6. Copy Bot Token and set <code class="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">SLACK_BOT_TOKEN</code> environment variable</div>
            </div>
          </div>

          <!-- Webhook Setup -->
          <div v-if="nodeData.data.notificationType === 'webhook'">
            <div class="font-medium mb-2">Webhook Configuration</div>
            <div class="space-y-2">
              <div><strong>Discord Webhooks:</strong></div>
              <div class="pl-2 space-y-1">
                <div>1. Open Discord → Server Settings → Integrations</div>
                <div>2. Create new webhook</div>
                <div>3. Copy webhook URL</div>
                <div>4. Paste in "Webhook URL" field or set <code class="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">DISCORD_WEBHOOK_URL</code> env variable</div>
              </div>
              <div class="mt-2"><strong>Other Webhooks:</strong></div>
              <div class="pl-2">
                Configure the HTTP method, headers, and body as required by your webhook service. Use context variables like $BuildNumber in the body.
              </div>
            </div>
          </div>
        </div>
      </template>
    </UAccordion>
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
const selectedTemplateId = ref(null)
const isLoadingTemplate = ref(false)
const logger = useLogger()

// Options arrays for selects
const notificationTypeOptions = [
  { value: 'email', label: 'Email' },
  { value: 'slack', label: 'Slack' },
  { value: 'webhook', label: 'Webhook' }
]

const slackModeOptions = [
  { value: 'simple', label: 'Simple Text Message' },
  { value: 'blocks', label: 'Block Kit (Rich Formatting)' }
]

const webhookMethodOptions = [
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'GET', label: 'GET' }
]

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

// Computed: Template options for USelect
const templateOptions = computed(() => {
  return filteredTemplates.value.map(template => ({
    value: template.id,
    label: template.name
  }))
})

// Computed: Accordion items (dynamically include input sockets if they exist)
const accordionItems = computed(() => {
  const items = [
    {
      slot: 'available-variables',
      label: 'Available Context Variables',
      icon: 'i-lucide-code',
      defaultOpen: false
    }
  ]
  
  if (props.nodeData.data.inputSockets && props.nodeData.data.inputSockets.length > 0) {
    items.push({
      slot: 'input-sockets',
      label: 'Available Input Socket Variables',
      icon: 'i-lucide-plug',
      defaultOpen: false
    })
  }
  
  items.push(
    {
      slot: 'usage-examples',
      label: 'Usage Examples',
      icon: 'i-lucide-lightbulb',
      defaultOpen: false
    },
    {
      slot: 'setup-guide',
      label: 'Setup & Configuration Guide',
      icon: 'i-lucide-settings',
      defaultOpen: false
    }
  )
  
  return items
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
  selectedTemplateId.value = null
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
