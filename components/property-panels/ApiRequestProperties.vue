<template>
  <div>
    <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
      <div class="flex items-center mb-2">
        <UIcon name="i-lucide-globe" class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
        <h4 class="text-sm font-semibold text-blue-800 dark:text-blue-200">API Request Configuration</h4>
      </div>
      <p class="text-xs text-blue-700 dark:text-blue-300">
        Make HTTP requests to external APIs. Response data is available via the Output socket.
      </p>
    </div>

    <!-- URL -->
    <div class="mt-3">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        URL <span class="text-red-500">*</span>
      </label>
      <input
        v-model="nodeData.data.url"
        type="url"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
        placeholder="https://api.example.com/endpoint"
        :class="{ 'border-red-500 dark:border-red-400': !nodeData.data.url }"
      />
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        The API endpoint URL. Supports parameter placeholders like ${'{INPUT_1}'}
      </p>
    </div>

    <!-- HTTP Method -->
    <div class="mt-3">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        HTTP Method
      </label>
      <select
        v-model="nodeData.data.method"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="PATCH">PATCH</option>
        <option value="DELETE">DELETE</option>
      </select>
    </div>

    <!-- Custom Headers -->
    <div class="mt-3">
      <div class="flex items-center justify-between mb-1">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Custom Headers
        </label>
        <button
          @click="addHeader"
          class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          + Add Header
        </button>
      </div>

      <div v-if="nodeData.data.headers && nodeData.data.headers.length > 0" class="space-y-2">
        <div
          v-for="(header, index) in nodeData.data.headers"
          :key="index"
          class="flex gap-2 items-center"
        >
          <input
            v-model="header.key"
            type="text"
            placeholder="Header Name"
            class="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white text-sm"
          />
          <input
            v-model="header.value"
            type="text"
            placeholder="Header Value"
            class="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white text-sm font-mono"
          />
          <button
            @click="removeHeader(index)"
            class="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
          >
            <UIcon name="i-lucide-trash-2" class="w-4 h-4" />
          </button>
        </div>
      </div>
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Add custom HTTP headers. Supports parameter placeholders.
      </p>
    </div>

    <!-- Request Body (for POST/PUT/PATCH) -->
    <div v-if="['POST', 'PUT', 'PATCH'].includes(nodeData.data.method)" class="mt-3">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Request Body
      </label>
      <textarea
        v-model="nodeData.data.body"
        v-auto-resize
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm resize-none overflow-hidden"
        placeholder='{"key": "value"} or plain text'
      ></textarea>
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Request body (JSON or plain text). Supports parameter placeholders like ${'{INPUT_1}'}
      </p>
    </div>

    <!-- Timeout -->
    <div class="mt-3">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        Timeout (seconds)
      </label>
      <input
        v-model.number="nodeData.data.timeout"
        type="number"
        min="1"
        max="300"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      />
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Maximum time to wait for response (default: 30 seconds)
      </p>
    </div>

    <!-- Success/Failure Routing Help -->
    <div class="mt-4 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
      <h4 class="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-2">
        Execution Flow
      </h4>
      <p class="text-xs text-purple-700 dark:text-purple-300">
        <strong>Success Socket:</strong> Triggered on HTTP 2xx status codes (200-299)<br/>
        <strong>Failure Socket:</strong> Triggered on errors or non-2xx status codes
      </p>
    </div>

    <!-- Parameter substitution help -->
    <div v-if="nodeData.data.inputSockets && nodeData.data.inputSockets.length > 0" class="mt-4 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs border border-blue-200 dark:border-blue-800">
      <div class="font-medium text-blue-800 dark:text-blue-200 mb-1">Available placeholders:</div>
      <div class="space-y-1">
        <div v-for="(socket, index) in nodeData.data.inputSockets" :key="socket.id" class="text-blue-700 dark:text-blue-300">
          <code>${{ socket.label }}</code>
        </div>
      </div>
      <p class="mt-2 text-blue-700 dark:text-blue-300">
        Use these in URL, headers, or body to pass data from connected nodes
      </p>
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

// Initialize defaults
if (!props.nodeData.data.method) {
  props.nodeData.data.method = 'GET'
}
if (!props.nodeData.data.headers) {
  props.nodeData.data.headers = []
}
if (!props.nodeData.data.body) {
  props.nodeData.data.body = ''
}
if (!props.nodeData.data.timeout) {
  props.nodeData.data.timeout = 30
}

// Header management
function addHeader() {
  if (!props.nodeData.data.headers) {
    props.nodeData.data.headers = []
  }
  props.nodeData.data.headers.push({ key: '', value: '' })
}

function removeHeader(index) {
  props.nodeData.data.headers.splice(index, 1)
}
</script>
