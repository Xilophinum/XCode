<template>
  <div class="space-y-4">
    <UAlert color="primary" variant="soft" icon="i-lucide-globe">
      <template #title>API Request Configuration</template>
      <template #description>
        Make HTTP requests to external APIs. Response data is available via the Output socket.
      </template>
    </UAlert>

    <!-- URL -->
    <UFormField label="URL" required>
      <UInput
        v-model="nodeData.data.url"
        type="url"
        size="md"
        class="w-full font-mono"
        placeholder="https://api.example.com/endpoint"
      />
      <template #help>
        The API endpoint URL. Supports parameter placeholders like ${'{INPUT_1}'}
      </template>
    </UFormField>

    <!-- HTTP Method -->
    <UFormField label="HTTP Method">
      <USelect
        v-model="nodeData.data.method"
        :items="httpMethodOptions"
        size="md"
        class="w-full"
      />
    </UFormField>

    <!-- Custom Headers -->
    <UFormField label="Custom Headers">
      <template #label>
        <div class="flex items-center justify-between w-full">
          <span>Custom Headers</span>
          <UButton
            @click="addHeader"
            size="xs"
            variant="ghost"
            label="+ Add Header"
          />
        </div>
      </template>
      <div v-if="nodeData.data.headers && nodeData.data.headers.length > 0" class="space-y-2">
        <div
          v-for="(header, index) in nodeData.data.headers"
          :key="index"
          class="flex gap-2 items-end"
        >
          <UInput
            v-model="header.key"
            type="text"
            placeholder="Header Name"
            size="md"
            class="flex-1"
          />
          <UInput
            v-model="header.value"
            type="text"
            placeholder="Header Value"
            size="md"
            class="flex-1 font-mono"
          />
          <UButton
            @click="removeHeader(index)"
            size="md"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            square
          />
        </div>
      </div>
      <template #help>
        Add custom HTTP headers. Supports parameter placeholders.
      </template>
    </UFormField>

    <!-- Request Body (for POST/PUT/PATCH) -->
    <UFormField v-if="['POST', 'PUT', 'PATCH'].includes(nodeData.data.method)" label="Request Body">
      <UTextarea
        v-model="nodeData.data.body"
        v-auto-resize
        size="md"
        class="w-full font-mono"
        placeholder='{"key": "value"} or plain text'
      />
      <template #help>
        Request body (JSON or plain text). Supports parameter placeholders like $INPUT_1
      </template>
    </UFormField>

    <!-- Timeout -->
    <UFormField label="Timeout (seconds)" help="Maximum time to wait for response (default: 30 seconds)">
      <UInput
        v-model.number="nodeData.data.timeout"
        type="number"
        :min="1"
        :max="300"
        size="md"
        class="w-full"
      />
    </UFormField>

    <!-- Success/Failure Routing Help -->
    <UAlert color="secondary" variant="soft">
      <template #title>Execution Flow</template>
      <template #description>
        <strong>Success Socket:</strong> Triggered on HTTP 2xx status codes (200-299)<br/>
        <strong>Failure Socket:</strong> Triggered on errors or non-2xx status codes
      </template>
    </UAlert>

    <!-- Parameter substitution help -->
    <UAlert v-if="nodeData.data.inputSockets && nodeData.data.inputSockets.length > 0" color="primary" variant="soft">
      <template #title>Available placeholders:</template>
      <template #description>
        <div class="space-y-1">
          <div v-for="(socket, index) in nodeData.data.inputSockets" :key="socket.id">
            <code>${{ socket.label }}</code>
          </div>
        </div>
        <p class="mt-2">
          Use these in URL, headers, or body to pass data from connected nodes
        </p>
      </template>
    </UAlert>
  </div>
</template>

<script setup>
const props = defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})

const httpMethodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' }
]

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
