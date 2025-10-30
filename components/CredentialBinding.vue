<template>
  <div class="mt-5">
    <div class="flex items-center justify-between mb-2">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Credentials
      </label>
      <button
        @click="addCredentialBinding"
        class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Add Credential
      </button>
    </div>

    <div v-if="!credentials || credentials.length === 0" class="text-sm text-neutral-500 dark:text-neutral-400 italic">
      No credentials bound to this node
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(binding, index) in credentials"
        :key="index"
        class="relative p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800"
      >
        <button
          @click="removeCredentialBinding(index)"
          class="absolute top-2 right-2 p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
          v-tooltip="'Remove credential binding'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
        
        <div class="grid grid-cols-1 md:grid-cols-1 gap-3 mt-3">

          <!-- Environment Variable Name -->
          <div>
            <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Environment Variable
            </label>
            <input
              v-model="binding.variable"
              type="text"
              class="w-full px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              :placeholder="getDefaultEnvVarName(binding)"
            >
          </div>
          <!-- Credential Selection -->
          <div>
            <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Credential
            </label>
            <select
              v-model="binding.credentialId"
              class="w-full px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
            >
              <option value="">Select credential...</option>
              <option
                v-for="cred in availableCredentials"
                :key="cred.id"
                :value="cred.id"
              >
                {{ cred.name }} ({{ cred.type }})
              </option>
            </select>
          </div>

          <!-- Field Selection -->
          <div>
            <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Field
            </label>
            <select
              v-model="binding.field"
              class="w-full px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
            >
              <option value="">All fields</option>
              <option
                v-for="field in getCredentialFields(binding.credentialId)"
                :key="field.value"
                :value="field.value"
              >
                {{ field.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Preview -->
        <div v-if="binding.credentialId" class="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
          <strong>Preview:</strong> 
          {{ getEnvVarPreview(binding) }}
        </div>
      </div>
    </div>

    <!-- Help Text -->
    <div class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
      Credentials will be injected as environment variables during job execution.
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue'])
const logger = useLogger()
const credentials = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value)
})

const availableCredentials = ref([])

// Load available credentials
onMounted(async () => {
  try {
    const response = await $fetch('/api/admin/credentials')
    availableCredentials.value = response.credentials || []
  } catch (error) {
    logger.error('Failed to load credentials:', error)
  }
})

const addCredentialBinding = () => {
  const newBinding = {
    credentialId: '',
    field: '',
    variable: ''
  }
  credentials.value = [...credentials.value, newBinding]
}

const removeCredentialBinding = (index) => {
  const updated = [...credentials.value]
  updated.splice(index, 1)
  credentials.value = updated
}

const getCredentialFields = (credentialId) => {
  const credential = availableCredentials.value.find(c => c.id === credentialId)
  if (!credential) return []

  const fieldMap = {
    password: [
      { value: 'password', label: 'Password' }
    ],
    user_pass: [
      { value: 'username', label: 'Username' },
      { value: 'password', label: 'Password' }
    ],
    token: [
      { value: 'token', label: 'Token' }
    ],
    ssh_key: [
      { value: 'username', label: 'Username' },
      { value: 'private_key', label: 'Private Key' }
    ],
    certificate: [
      { value: 'certificate', label: 'Certificate' }
    ],
    file: [
      { value: 'file_data', label: 'File Data' },
      { value: 'file_name', label: 'File Name' }
    ]
  }

  return fieldMap[credential.type] || []
}

const getDefaultEnvVarName = (binding) => {
  const credential = availableCredentials.value.find(c => c.id === binding.credentialId)
  if (!credential) return ''

  const baseName = credential.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')
  return binding.field ? `${baseName}_${binding.field.toUpperCase()}` : baseName
}

const getEnvVarPreview = (binding) => {
  const envVar = binding.variable || getDefaultEnvVarName(binding)
  const credential = availableCredentials.value.find(c => c.id === binding.credentialId)
  
  if (!credential) return ''
  
  if (binding.field) {
    return `$${envVar} = [${credential.name}.${binding.field}]`
  } else {
    const fields = getCredentialFields(binding.credentialId)
    if (fields.length > 1) {
      return `$${envVar}_USERNAME, $${envVar}_PASSWORD = [${credential.name}.*]`
    } else {
      return `$${envVar} = [${credential.name}]`
    }
  }
}
</script>