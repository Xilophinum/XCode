<template>
  <div class="space-y-4">
    <UAlert color="primary" variant="soft" icon="i-lucide-bell">
      <template #title>{{ $t('notificationProperties.notificationConfiguration') }}</template>
      <template #description>
        {{ $t('notificationProperties.notificationDescription') }}
      </template>
    </UAlert>

    <!-- Template Selector -->
    <UAlert color="secondary" variant="soft">
      <template #title>{{ $t('notificationProperties.useTemplate') }}</template>
      <template #description>
        <UFormField class="mt-2">
          <USelect
            v-model="selectedTemplateId"
            :disabled="isLoadingTemplate || templateOptions.length === 0"
            :items="templateOptions"
            size="md"
            class="w-full"
            :placeholder="$t('notificationProperties.selectTemplate')"
          />
        </UFormField>
        <p class="mt-2 text-xs">
          {{ isLoadingTemplate ? $t('notificationProperties.loadingTemplate') : templateOptions.length === 0 ? $t('notificationProperties.noTemplatesAvailable') : $t('notificationProperties.chooseTemplate') }}
        </p>
      </template>
    </UAlert>

    <!-- Notification Type Selection -->
    <UFormField :label="$t('notificationProperties.notificationType')" required>
      <USelect
        v-model="nodeData.data.notificationType"
        @change="onNotificationTypeChange"
        :items="notificationTypeOptions"
        size="md"
        class="w-full"
      />
      <template #help>
        {{ $t('notificationProperties.selectNotificationType') }}
      </template>
    </UFormField>

    <!-- General Options (for all notification types) -->
    <UAlert color="secondary" variant="soft">
      <template #title>{{ $t('notificationProperties.generalOptions') }}</template>
      <template #description>
        <UCheckbox
          v-model="nodeData.data.attachBuildLog"
          :label="$t('notificationProperties.attachBuildLog')"
          :help="$t('notificationProperties.attachBuildLogHelp')"
        />
      </template>
    </UAlert>

    <!-- Email Configuration -->
    <div v-if="nodeData.data.notificationType === 'email'" class="space-y-4">
      <UFormField :label="$t('notificationProperties.fromAddress')" required>
        <UInput
          v-model="nodeData.data.emailFrom"
          type="email"
          size="md"
          class="w-full"
          placeholder="noreply@example.com"
        />
        <template #help>
          {{ $t('notificationProperties.fromAddressHelp') }}
        </template>
      </UFormField>

      <UFormField :label="$t('notificationProperties.toRecipients')" required>
        <UInput
          v-model="nodeData.data.emailTo"
          type="text"
          size="md"
          class="w-full"
          placeholder="user@example.com, admin@example.com"
        />
        <template #help>
          {{ $t('notificationProperties.toRecipientsHelp') }}
        </template>
      </UFormField>

      <UFormField :label="$t('notificationProperties.subject')" required>
        <UInput
          v-model="nodeData.data.emailSubject"
          type="text"
          size="md"
          class="w-full"
          placeholder="Workflow Notification: Job Completed"
        />
      </UFormField>

      <UFormField :label="$t('notificationProperties.messageBody')" required>
        <UTextarea
          v-model="nodeData.data.emailBody"
          size="md"
          class="w-full"
          placeholder="Enter email message body..."
        />
        <template #help>
          {{ $t('notificationProperties.messageBodyHelp') }}
        </template>
      </UFormField>

      <UFormField>
        <UCheckbox
          v-model="nodeData.data.emailHtml"
          :label="$t('notificationProperties.sendAsHtml')"
          :help="$t('notificationProperties.sendAsHtmlHelp')"
        />
      </UFormField>
    </div>

    <!-- Slack Configuration -->
    <div v-if="nodeData.data.notificationType === 'slack'" class="space-y-4">
      <UAlert color="primary" variant="soft" icon="i-lucide-info">
        <template #description>
          <p><strong>{{ $t('notificationProperties.slackAppIntegration') }}</strong> {{ $t('notificationProperties.slackBotTokenHelp') }}</p>
          <p class="mt-1">💡 {{ $t('notificationProperties.slackWebhookTip') }}</p>
        </template>
      </UAlert>

      <UFormField :label="$t('notificationProperties.channel')" required>
        <UInput
          v-model="nodeData.data.slackChannel"
          type="text"
          size="md"
          class="w-full"
          placeholder="#general, @username, or C1234567890"
        />
        <template #help>
          {{ $t('notificationProperties.channelHelp') }}
        </template>
      </UFormField>

      <UFormField :label="$t('notificationProperties.messageMode')">
        <USelect
          v-model="nodeData.data.slackMode"
          :items="slackModeOptions"
          size="md"
          class="w-full"
        />
        <template #help>
          {{ $t('notificationProperties.messageModeHelp') }}
        </template>
      </UFormField>

      <UFormField required>
        <template #label>
          <span>{{ $t('notificationProperties.message') }} <span v-if="nodeData.data.slackMode === 'blocks'" class="text-neutral-400 font-normal">{{ $t('notificationProperties.fallbackText') }}</span></span>
        </template>
        <UTextarea
          v-model="nodeData.data.slackMessage"
          v-auto-resize
          size="md"
          class="w-full font-mono"
          :placeholder="`:white_check_mark: Build #$BuildNumber ${$t('notificationProperties.completedSuccessfully')}`"
        />
        <template #help>
          {{ nodeData.data.slackMode === 'blocks' ? $t('notificationProperties.fallbackTextHelp') : $t('notificationProperties.markdownMessageHelp') }}
        </template>
      </UFormField>

      <UFormField v-if="nodeData.data.slackMode === 'blocks'" :label="$t('notificationProperties.slackBlocks')">
        <UTextarea
          v-model="nodeData.data.slackBlocks"
          v-auto-resize
          size="md"
          class="w-full font-mono text-xs"
          placeholder='[{"type":"header","text":{"type":"plain_text","text":"Build #$BuildNumber"}}]'
        />
        <template #help>
          {{ $t('notificationProperties.slackBlocksHelp') }} <a href="https://app.slack.com/block-kit-builder" target="_blank" class="text-primary-600 dark:text-primary-400 hover:underline">{{ $t('notificationProperties.blockKitBuilder') }}</a>
        </template>
      </UFormField>
    </div>

    <!-- Webhook Configuration -->
    <div v-if="nodeData.data.notificationType === 'webhook'" class="space-y-4">
      <UFormField :label="$t('notificationProperties.webhookUrl')">
        <UInput
          v-model="nodeData.data.webhookUrl"
          type="url"
          size="md"
          class="w-full font-mono"
          placeholder="https://discord.com/api/webhooks/... (or leave empty to use DISCORD_WEBHOOK_URL)"
        />
        <template #help>
          {{ $t('notificationProperties.webhookUrlHelp') }}
        </template>
      </UFormField>

      <UFormField :label="$t('notificationProperties.httpMethod')">
        <USelect
          v-model="nodeData.data.webhookMethod"
          :items="webhookMethodOptions"
          size="md"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('notificationProperties.headers')">
        <UTextarea
          v-model="nodeData.data.webhookHeaders"
          v-auto-resize
          size="md"
          class="w-full font-mono"
          placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token123"}'
        />
        <template #help>
          {{ $t('notificationProperties.headersHelp') }}
        </template>
      </UFormField>

      <UFormField :label="$t('notificationProperties.body')" required>
        <UTextarea
          v-model="nodeData.data.webhookBody"
          v-auto-resize
          size="md"
          class="w-full font-mono"
          placeholder='{"status": "completed", "message": "Job finished"}'
        />
        <template #help>
          {{ $t('notificationProperties.bodyHelp') }}
        </template>
      </UFormField>
    </div>

    <!-- Available Variables Documentation (Collapsible) -->
    <UAccordion :items="accordionItems" :multiple="true">
      <template #available-variables>
        <div class="mt-2 font-mono text-sm bg-neutral-100 dark:bg-neutral-800 p-2 rounded">
          <div><b>$ProjectName</b> - {{ $t('notificationProperties.projectNameDesc') }}</div>
          <div><b>$ProjectId</b> - {{ $t('notificationProperties.projectIdDesc') }}</div>
          <div><b>$BuildNumber</b> - {{ $t('notificationProperties.buildNumberDesc') }}</div>
          <div><b>$JobId</b> - {{ $t('notificationProperties.jobIdDesc') }}</div>
          <div><b>$Status</b> - {{ $t('notificationProperties.statusDesc') }}</div>
          <div><b>$ExitCode</b> - {{ $t('notificationProperties.exitCodeDesc') }}</div>
          <div><b>$FailedNodeLabel</b> - {{ $t('notificationProperties.failedNodeLabelDesc') }}</div>
          <div><b>$CurrentAttempt</b> - {{ $t('notificationProperties.currentAttemptDesc') }}</div>
          <div><b>$MaxAttempts</b> - {{ $t('notificationProperties.maxAttemptsDesc') }}</div>
          <div><b>$WillRetry</b> - {{ $t('notificationProperties.willRetryDesc') }}</div>
          <div><b>$Timestamp</b> - {{ $t('notificationProperties.timestampDesc') }}</div>
          <div><b>$TimestampHuman</b> - {{ $t('notificationProperties.timestampHumanDesc') }}</div>
          <div><b>$BuildLog</b> - {{ $t('notificationProperties.buildLogDesc') }}</div>
          <div><b>$BuildLogPath</b> - {{ $t('notificationProperties.buildLogPathDesc') }}</div>
          <div><b>$DefaultEmailFrom</b> - {{ $t('notificationProperties.defaultEmailFromDesc') }}</div>
          <div><b>$DefaultEmailTo</b> - {{ $t('notificationProperties.defaultEmailToDesc') }}</div>
          <div><b>$AdminEmail</b> - {{ $t('notificationProperties.adminEmailDesc') }}</div>
        </div>
        <p class="mt-2 text-xs">
          {{ $t('notificationProperties.variableUsageHelp') }}
        </p>
      </template>

      <template #input-sockets v-if="nodeData.data.inputSockets && nodeData.data.inputSockets.length > 0">
        <div class="text-xs space-y-1 font-mono">
          <div v-for="socket in nodeData.data.inputSockets" :key="socket.id">
            ${{ socket.label }}
          </div>
        </div>
        <p class="mt-2 text-xs">
          {{ $t('notificationProperties.inputSocketsHelp') }}
        </p>
      </template>

      <template #usage-examples>
        <div class="mt-2 font-mono text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded">
          <div v-if="nodeData.data.notificationType === 'email'">
            <div class="font-medium mb-1">{{ $t('notificationProperties.emailNotificationSuccess') }}</div>
            <div class="pl-2 space-y-1 font-mono text-xs">
              <div>Subject: "[$ProjectName] Build #$BuildNumber - $Status"</div>
              <div>Body: "Build $BuildNumber {{ $t('notificationProperties.completedAt') }} $TimestampHuman"</div>
            </div>
            <div class="font-medium mb-1 mt-2">{{ $t('notificationProperties.emailNotificationFailure') }}</div>
            <div class="pl-2 space-y-1 font-mono text-xs">
              <div>Subject: "[$ProjectName] Build #$BuildNumber - {{ $t('notificationProperties.attemptFailed') }}"</div>
              <div>Body: "{{ $t('notificationProperties.nodeFailed') }}"</div>
            </div>
          </div>
          <div v-if="nodeData.data.notificationType === 'slack'">
            <div class="font-medium mb-1">{{ $t('notificationProperties.slackNotification') }}</div>
            <div class="pl-2 space-y-1 font-mono text-xs">
              <div>":x: *$ProjectName* - Build #$BuildNumber {{ $t('notificationProperties.failed') }}"</div>
              <div>"{{ $t('notificationProperties.failedNode') }} $FailedNodeLabel"</div>
              <div>"{{ $t('notificationProperties.time') }} $TimestampHuman | {{ $t('notificationProperties.exitCode') }} $ExitCode"</div>
            </div>
          </div>
          <div v-if="nodeData.data.notificationType === 'webhook'">
            <div class="font-medium mb-1">{{ $t('notificationProperties.webhookPayloadBasic') }}</div>
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
            <div class="font-medium mb-1 mt-3">{{ $t('notificationProperties.webhookWithBuildLog') }}</div>
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
              {{ $t('notificationProperties.discordWebhookNote') }}
            </p>
          </div>
        </div>
      </template>

      <template #setup-guide>
        <div class="text-xs">
          <!-- Email SMTP Setup -->
          <div v-if="nodeData.data.notificationType === 'email'">
            <div class="font-medium mb-2">{{ $t('notificationProperties.smtpConfigurationRequired') }}</div>
            <div class="space-y-1">
              <div>{{ $t('notificationProperties.smtpConfigurationHelp') }}</div>
              <div class="mt-2 font-mono text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded">
                {{ $t('notificationProperties.requiredEnvironmentVariables') }}<br/>
                • SMTP_HOST<br/>
                • SMTP_PORT<br/>
                • SMTP_USER<br/>
                • SMTP_PASS
              </div>
            </div>
          </div>

          <!-- Slack Setup -->
          <div v-if="nodeData.data.notificationType === 'slack'">
            <div class="font-medium mb-2">{{ $t('notificationProperties.slackAppSetup') }}</div>
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
            <div class="font-medium mb-2">{{ $t('notificationProperties.webhookConfiguration') }}</div>
            <div class="space-y-2">
              <div><strong>{{ $t('notificationProperties.discordWebhooks') }}</strong></div>
              <div class="pl-2 space-y-1">
                <div>1. Open Discord → Server Settings → Integrations</div>
                <div>2. Create new webhook</div>
                <div>3. Copy webhook URL</div>
                <div>4. Paste in "Webhook URL" field or set <code class="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">DISCORD_WEBHOOK_URL</code> env variable</div>
              </div>
              <div class="mt-2"><strong>{{ $t('notificationProperties.otherWebhooks') }}</strong></div>
              <div class="pl-2">
                {{ $t('notificationProperties.webhookConfigurationHelp') }}
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
const notificationTypeOptions = computed(() => [
  { value: 'email', label: $t('notificationProperties.email') },
  { value: 'slack', label: $t('notificationProperties.slack') },
  { value: 'webhook', label: $t('notificationProperties.webhook') }
])

const slackModeOptions = computed(() => [
  { value: 'simple', label: $t('notificationProperties.simpleTextMessage') },
  { value: 'blocks', label: $t('notificationProperties.blockKitRichFormatting') }
])

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
      label: $t('notificationProperties.availableContextVariables'),
      icon: 'i-lucide-code',
      defaultOpen: false
    }
  ]
  
  if (props.nodeData.data.inputSockets && props.nodeData.data.inputSockets.length > 0) {
    items.push({
      slot: 'input-sockets',
      label: $t('notificationProperties.availableInputSocketVariables'),
      icon: 'i-lucide-plug',
      defaultOpen: false
    })
  }
  
  items.push(
    {
      slot: 'usage-examples',
      label: $t('notificationProperties.usageExamples'),
      icon: 'i-lucide-lightbulb',
      defaultOpen: false
    },
    {
      slot: 'setup-guide',
      label: $t('notificationProperties.setupConfigurationGuide'),
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
