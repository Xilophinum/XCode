<template>
  <div class="mt-5">
    <div class="flex items-center justify-between mb-2">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {{ t('credentials.credentials') }}
      </label>
      <UButton
        @click="addCredentialBinding"
        size="xs"
        icon="i-lucide-plus"
      >
        {{ t('credentials.addCredential') }}
      </UButton>
    </div>

    <div v-if="!credentials || credentials.length === 0" class="text-sm text-neutral-500 dark:text-neutral-400 italic">
      {{ t('credentials.noCredentialsBound') }}
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(binding, index) in credentials"
        :key="index"
        class="relative"
      >
        <div class="flex gap-2 items-end mt-3">
          <!-- Environment Variable Name -->
          <UFormField :label="t('credentials.environmentVariable')" size="sm" class="flex-1">
            <UInput
              v-model="binding.variable"
              :placeholder="getDefaultEnvVarName(binding)"
              size="sm"
              class="w-full"
            />
          </UFormField>

          <!-- Credential Selection -->
          <UFormField :label="t('credentials.credential')" size="sm" class="flex-1">
            <USelect
              v-model="binding.credentialId"
              :items="credentialOptions"
              size="sm"
              :placeholder="t('credentials.selectCredential')"
              class="w-full"
            />
          </UFormField>

          <!-- Field Selection -->
          <UFormField :label="t('credentials.field')" size="sm" class="flex-1">
            <USelect
              v-model="binding.field"
              :items="[
                ...getCredentialFields(binding.credentialId)
              ]"
              size="sm"
              class="w-full"
            />
          </UFormField>
          
          <!-- Delete Button -->
          <UButton
            @click="removeCredentialBinding(index)"
            size="sm"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            square
          />
        </div>
      </div>
      
      <!-- Preview -->
      <UAlert
        v-if="credentials.some(b => b.credentialId)"
        color="secondary"
        variant="soft"
        class="mt-3"
        icon="i-lucide-info"
      >
        <template #title>
          {{ t('credentials.preview') }}
        </template>
        <template #description>
          <div class="space-y-1">
            <div v-for="(binding, index) in credentials.filter(b => b.credentialId)" :key="index">
              {{ getEnvVarPreview(binding) }}
            </div>
          </div>
        </template>
      </UAlert>
    </div>

    <!-- Help Text -->
    <p class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
      {{ t('credentials.helpText') }}
    </p>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()
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
      { value: 'password', label: t('credentials.password') }
    ],
    user_pass: [
      { value: 'username', label: t('credentials.username') },
      { value: 'password', label: t('credentials.password') }
    ],
    token: [
      { value: 'token', label: t('credentials.token') }
    ],
    ssh_key: [
      { value: 'username', label: t('credentials.username') },
      { value: 'private_key', label: t('credentials.privateKey') }
    ],
    certificate: [
      { value: 'certificate', label: t('credentials.certificate') }
    ],
    file: [
      { value: 'file_data', label: t('credentials.fileData') },
      { value: 'file_name', label: t('credentials.fileName') }
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