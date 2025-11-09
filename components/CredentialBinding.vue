<template>
  <div class="mt-5">
    <div class="flex items-center justify-between mb-2">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Credentials
      </label>
      <UButton
        @click="addCredentialBinding"
        size="xs"
        icon="i-lucide-plus"
      >
        Add Credential
      </UButton>
    </div>

    <div v-if="!credentials || credentials.length === 0" class="text-sm text-neutral-500 dark:text-neutral-400 italic">
      No credentials bound to this node
    </div>

    <div v-else class="space-y-3">
      <UCard
        v-for="(binding, index) in credentials"
        :key="index"
        class="relative"
      >
        <UButton
          @click="removeCredentialBinding(index)"
          variant="ghost"
          size="xs"
          icon="i-lucide-trash-2"
          class="absolute top-2 right-2 text-gray-400 hover:text-red-500"
        />

        <div class="grid grid-cols-3 gap-3 mt-3">
          <!-- Environment Variable Name -->
          <UFormField label="Environment Variable" size="sm">
            <UInput
              v-model="binding.variable"
              :placeholder="getDefaultEnvVarName(binding)"
              size="md"
              class="w-full"
            />
          </UFormField>

          <!-- Credential Selection -->
          <UFormField label="Credential" size="sm">
            <USelect
              v-model="binding.credentialId"
              :items="credentialOptions"
              size="md"
              placeholder="Select credential..."
              class="w-full"
            />
          </UFormField>

          <!-- Field Selection -->
          <UFormField label="Field" size="sm">
            <USelect
              v-model="binding.field"
              :items="[
                ...getCredentialFields(binding.credentialId)
              ]"
              size="md"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Preview -->
        <UAlert
          v-if="binding.credentialId"
          color="secondary"
          variant="soft"
          class="mt-3"
          icon="i-lucide-info"
        >
          <template #title>
            Preview
          </template>
          <template #description>
            {{ getEnvVarPreview(binding) }}
          </template>
        </UAlert>
      </UCard>
    </div>

    <!-- Help Text -->
    <p class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
      Credentials will be injected as environment variables during job execution.
    </p>
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

// Computed property for select options
const credentialOptions = computed(() => {
  return availableCredentials.value.map(cred => ({
    value: cred.id,
    label: `${cred.name} (${cred.type})`
  }))
})

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