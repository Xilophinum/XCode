<template>
  <ModalWrapper :model-value="modelValue" class="max-w-2xl" @update:model-value="handleClose">
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center mb-6">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900">
          <UIcon name="i-lucide-settings" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div class="ml-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Build Parameters</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Configure parameters for this build</p>
        </div>
      </div>

      <!-- No Parameters Message -->
      <div v-if="parameters.length === 0" class="text-center py-8">
        <p class="text-sm text-gray-500 dark:text-gray-400">No parameters found in this project</p>
      </div>

      <!-- Parameter Inputs -->
      <div v-else class="space-y-6 max-h-96 overflow-y-auto pr-2">
        <div v-for="param in parameters" :key="param.id" class="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
          <!-- Parameter Label -->
          <label :for="param.id" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ param.label }}
            <span v-if="param.description" class="text-xs text-gray-500 dark:text-gray-400 font-normal ml-2">
              ({{ param.description }})
            </span>
          </label>

          <!-- String Parameter -->
          <UInput
            v-if="param.type === 'string-param'"
            :id="param.id"
            v-model="parameterValues[param.id]"
            :placeholder="param.defaultValue || 'Enter value...'"
            class="w-full"
          />

          <!-- Text Parameter -->
          <ScriptEditor
            v-else-if="param.type === 'text-param'"
            :id="param.id"
            v-model="parameterValues[param.id]"
            :language="getLanguageForParam(param)"
          />

          <!-- Choice Parameter -->
          <select
            v-else-if="param.type === 'choice-param'"
            :id="param.id"
            v-model="parameterValues[param.id]"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option v-for="choice in param.choices" :key="choice" :value="choice">
              {{ choice }}
            </option>
          </select>

          <!-- Boolean Parameter -->
          <div v-else-if="param.type === 'boolean-param'" class="flex items-center">
            <input
              :id="param.id"
              v-model="parameterValues[param.id]"
              type="checkbox"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <label :for="param.id" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {{ parameterValues[param.id] ? 'True' : 'False' }}
            </label>
          </div>
        </div>
      </div>

      <!-- Buttons -->
      <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <UButton
          @click="handleCancel"
          color="error"
        >
          Cancel
        </UButton>
        <UButton
          @click="handleConfirm"
          color="primary"
        >
          Start Build
        </UButton>
      </div>
    </div>
  </ModalWrapper>
</template>

<script setup>
import ScriptEditor from '@/components/ScriptEditor.vue'
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  parameters: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

// Initialize parameter values with defaults
const parameterValues = ref({})

// Watch for parameters changes to initialize values
watch(() => props.parameters, (newParams) => {
  const values = {}
  newParams.forEach(param => {
    values[param.id] = param.defaultValue
  })
  parameterValues.value = values
}, { immediate: true, deep: true })

const getLanguageForParam = (param) => {
  return props.parameters.find(p => p.id === param.id)?.language || 'plaintext'
}

const handleConfirm = () => {
  emit('confirm', parameterValues.value)
  emit('update:modelValue', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}

const handleClose = (value) => {
  if (!value) {
    emit('cancel')
  }
  emit('update:modelValue', value)
}
</script>
