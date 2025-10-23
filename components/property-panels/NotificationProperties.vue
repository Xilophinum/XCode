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

    <!-- Notification Type Selection -->
    <div class="mt-3">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Notification Type <span class="text-red-500">*</span>
      </label>
      <select
        v-model="nodeData.data.notificationType"
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
          Use ${'{'}SocketName{'}'} to reference input socket values
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
      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Webhook URL <span class="text-red-500">*</span>
        </label>
        <input
          v-model="nodeData.data.slackWebhookUrl"
          type="url"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
          placeholder="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
          :class="{ 'border-red-500 dark:border-red-400': !nodeData.data.slackWebhookUrl }"
        />
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Slack Incoming Webhook URL from your workspace settings
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Channel (Optional)
        </label>
        <input
          v-model="nodeData.data.slackChannel"
          type="text"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
          placeholder="#general or @username"
        />
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Override default channel (use #channel or @user)
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Username (Optional)
        </label>
        <input
          v-model="nodeData.data.slackUsername"
          type="text"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
          placeholder="Workflow Bot"
        />
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Display name for the bot
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Message <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="nodeData.data.slackMessage"
          rows="6"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
          placeholder="Enter Slack message..."
          :class="{ 'border-red-500 dark:border-red-400': !nodeData.data.slackMessage }"
        ></textarea>
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Use ${'{'}SocketName{'}'} to reference input socket values. Supports Slack markdown.
        </p>
      </div>
    </div>

    <!-- Webhook Configuration -->
    <div v-if="nodeData.data.notificationType === 'webhook'" class="mt-4 space-y-3">
      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Webhook URL <span class="text-red-500">*</span>
        </label>
        <input
          v-model="nodeData.data.webhookUrl"
          type="url"
          class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
          placeholder="https://api.example.com/notify"
          :class="{ 'border-red-500 dark:border-red-400': !nodeData.data.webhookUrl }"
        />
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          The HTTP endpoint to send the webhook to
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
          Request body as JSON. Use ${'{'}SocketName{'}'} to reference input socket values.
        </p>
      </div>
    </div>

    <!-- Input Socket Variables Help -->
    <div v-if="nodeData.data.inputSockets && nodeData.data.inputSockets.length > 0" class="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded text-xs">
      <div class="font-medium text-green-800 dark:text-green-200 mb-2">Available Input Variables:</div>
      <div class="text-green-700 dark:text-green-300 space-y-1">
        <div v-for="socket in nodeData.data.inputSockets" :key="socket.id" class="font-mono">
          ${'{'}{{ socket.label }}{'}'}
        </div>
      </div>
      <p class="mt-2 text-green-700 dark:text-green-300">
        Use these variables in your messages to include data from previous nodes
      </p>
    </div>

    <!-- Usage Examples -->
    <div class="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded text-xs">
      <div class="font-medium text-amber-800 dark:text-amber-200 mb-2">Usage Examples:</div>
      <div class="text-amber-700 dark:text-amber-300 space-y-2">
        <div v-if="nodeData.data.notificationType === 'email'">
          <div class="font-medium">Email Notification:</div>
          <div class="pl-2 space-y-1">
            <div>Subject: "Build ${'{'}BuildNumber{'}'} completed"</div>
            <div>Body: "Build completed successfully at ${'{'}Timestamp{'}'}"</div>
          </div>
        </div>
        <div v-if="nodeData.data.notificationType === 'slack'">
          <div class="font-medium">Slack Notification:</div>
          <div class="pl-2 space-y-1">
            <div>":white_check_mark: Build ${'{'}BuildNumber{'}'} deployed to production"</div>
            <div>"*Status:* Success | *Time:* ${'{'}Timestamp{'}'}"</div>
          </div>
        </div>
        <div v-if="nodeData.data.notificationType === 'webhook'">
          <div class="font-medium">Webhook Payload:</div>
          <div class="pl-2 font-mono bg-amber-100 dark:bg-amber-900 p-2 rounded mt-1">
            {<br/>
            &nbsp;&nbsp;"event": "build_complete",<br/>
            &nbsp;&nbsp;"build": "${'{'}BuildNumber{'}'}",<br/>
            &nbsp;&nbsp;"status": "${'{'}Status{'}'}"<br/>
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
</script>
