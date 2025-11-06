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

          <!-- Array Parameter (Grid Toggles) -->
          <div v-else-if="param.type === 'array-param'">
            <div class="mb-2 flex items-center justify-between">
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Select values to include in this build ({{ getSelectedArrayCount(param.id) }} / {{ getParsedArrayItems(param).length }})
              </p>
              <div class="flex gap-2">
                <button
                  @click="selectAllArrayItems(param)"
                  class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select All
                </button>
                <button
                  @click="deselectAllArrayItems(param)"
                  class="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
              <label
                v-for="(item, index) in getParsedArrayItems(param)"
                :key="index"
                class="flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :class="{
                  'bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700': isArrayItemSelected(param.id, index),
                  'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600': !isArrayItemSelected(param.id, index)
                }"
              >
                <input
                  type="checkbox"
                  :checked="isArrayItemSelected(param.id, index)"
                  @change="toggleArrayItem(param.id, index)"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600"
                >
                <span class="text-sm text-gray-700 dark:text-gray-300 font-mono truncate" :title="formatArrayItem(item)">
                  {{ formatArrayItem(item) }}
                </span>
              </label>
            </div>

            <div v-if="getParsedArrayItems(param).length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
              No values defined in array parameter
            </div>
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
import { ref, watch } from 'vue'
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

// Track selected indices for array parameters
const arraySelections = ref({})

// Watch for parameters changes to initialize values
watch(() => props.parameters, (newParams) => {
  const values = {}
  const selections = {}

  newParams.forEach(param => {
    values[param.id] = param.defaultValue

    // For array parameters, initialize with all items selected
    if (param.type === 'array-param') {
      const items = parseArrayParam(param)
      selections[param.id] = items.map((_, index) => index)
    }
  })

  parameterValues.value = values
  arraySelections.value = selections
}, { immediate: true, deep: true })

// Parse array parameter value
const parseArrayParam = (param) => {
  try {
    const value = param.defaultValue
    if (!value || value.trim() === '') return []

    if (param.arrayFormat === 'json') {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } else if (param.arrayFormat === 'lines') {
      return value.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    }
  } catch (error) {
    console.warn('Failed to parse array parameter:', error)
    return []
  }
  return []
}

// Get parsed array items for display
const getParsedArrayItems = (param) => {
  return parseArrayParam(param)
}

// Format array item for display
const formatArrayItem = (item) => {
  if (typeof item === 'object') {
    return JSON.stringify(item)
  }
  return String(item)
}

// Check if array item is selected
const isArrayItemSelected = (paramId, index) => {
  return arraySelections.value[paramId]?.includes(index) || false
}

// Toggle array item selection
const toggleArrayItem = (paramId, index) => {
  if (!arraySelections.value[paramId]) {
    arraySelections.value[paramId] = []
  }

  const selections = arraySelections.value[paramId]
  const indexPos = selections.indexOf(index)

  if (indexPos > -1) {
    selections.splice(indexPos, 1)
  } else {
    selections.push(index)
  }

  // Sort to maintain order
  arraySelections.value[paramId] = selections.sort((a, b) => a - b)
}

// Select all array items
const selectAllArrayItems = (param) => {
  const items = getParsedArrayItems(param)
  arraySelections.value[param.id] = items.map((_, index) => index)
}

// Deselect all array items
const deselectAllArrayItems = (param) => {
  arraySelections.value[param.id] = []
}

// Get selected array count
const getSelectedArrayCount = (paramId) => {
  return arraySelections.value[paramId]?.length || 0
}

const getLanguageForParam = (param) => {
  return props.parameters.find(p => p.id === param.id)?.language || 'plaintext'
}

const handleConfirm = () => {
  // Build final parameter values with filtered arrays
  const finalValues = { ...parameterValues.value }

  props.parameters.forEach(param => {
    if (param.type === 'array-param') {
      const allItems = parseArrayParam(param)
      const selectedIndices = arraySelections.value[param.id] || []
      const selectedItems = selectedIndices.map(index => allItems[index])

      // Convert back to original format
      if (param.arrayFormat === 'json') {
        finalValues[param.id] = JSON.stringify(selectedItems)
      } else if (param.arrayFormat === 'lines') {
        finalValues[param.id] = selectedItems.map(item => String(item)).join('\n')
      }
    }
  })

  emit('confirm', finalValues)
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
