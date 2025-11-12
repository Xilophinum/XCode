<template>
  <div class="space-y-4">
    <UAlert color="primary" variant="soft" icon="i-lucide-globe">
      <template #title>{{ $t('apiRequestProperties.apiRequestConfiguration') }}</template>
      <template #description>
        {{ $t('apiRequestProperties.makeHttpRequests') }}
      </template>
    </UAlert>

    <!-- URL -->
    <UFormField :label="$t('apiRequestProperties.url')" required>
      <UInput
        v-model="nodeData.data.url"
        type="url"
        size="md"
        class="w-full font-mono"
        placeholder="https://api.example.com/endpoint"
      />
      <template #help>
        {{ $t('apiRequestProperties.apiEndpointUrl') }}
      </template>
    </UFormField>

    <!-- HTTP Method -->
    <UFormField :label="$t('apiRequestProperties.httpMethod')">
      <USelect
        v-model="nodeData.data.method"
        :items="httpMethodOptions"
        size="md"
        class="w-full"
      />
    </UFormField>

    <!-- Custom Headers -->
    <UFormField :label="$t('apiRequestProperties.customHeaders')">
      <template #label>
        <div class="flex items-center justify-between w-full">
          <span>{{ $t('apiRequestProperties.customHeaders') }}</span>
          <UButton
            @click="addHeader"
            size="xs"
            variant="ghost"
            :label="$t('apiRequestProperties.addHeader')"
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
            :placeholder="$t('apiRequestProperties.headerName')"
            size="md"
            class="flex-1"
          />
          <UInput
            v-model="header.value"
            type="text"
            :placeholder="$t('apiRequestProperties.headerValue')"
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
        {{ $t('apiRequestProperties.addCustomHeaders') }}
      </template>
    </UFormField>

    <!-- Request Body (for POST/PUT/PATCH) -->
    <UFormField v-if="['POST', 'PUT', 'PATCH'].includes(nodeData.data.method)" :label="$t('apiRequestProperties.requestBody')">
      <UTextarea
        v-model="nodeData.data.body"
        v-auto-resize
        size="md"
        class="w-full font-mono"
        placeholder='{"key": "value"} or plain text'
      />
      <template #help>
        {{ $t('apiRequestProperties.requestBodyHelp') }}
      </template>
    </UFormField>

    <!-- Timeout -->
    <UFormField :label="$t('apiRequestProperties.timeoutSeconds')" :help="$t('apiRequestProperties.timeoutHelp')">
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
      <template #title>{{ $t('apiRequestProperties.executionFlow') }}</template>
      <template #description>
        <strong>{{ $t('apiRequestProperties.successSocket') }}</strong><br/>
        <strong>{{ $t('apiRequestProperties.failureSocket') }}</strong>
      </template>
    </UAlert>

    <!-- Parameter substitution help -->
    <UAlert v-if="nodeData.data.inputSockets && nodeData.data.inputSockets.length > 0" color="primary" variant="soft">
      <template #title>{{ $t('apiRequestProperties.availablePlaceholders') }}</template>
      <template #description>
        <div class="space-y-1">
          <div v-for="(socket, index) in nodeData.data.inputSockets" :key="socket.id">
            <code>${{ socket.label }}</code>
          </div>
        </div>
        <p class="mt-2">
          {{ $t('apiRequestProperties.usePlaceholders') }}
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
