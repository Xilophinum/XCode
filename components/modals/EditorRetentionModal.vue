<template>
  <ModalWrapper :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" class="max-w-md">
    <div class="mt-3">
      <div class="flex items-center justify-center mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900">
        <UIcon name="i-lucide-lock" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      <div class="mt-4 text-center">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ $t('editorRetentionModal.buildRetentionSettings') }}</h3>
        <div class="mt-2 px-7 py-3">
          <p class="text-sm text-gray-500 dark:text-gray-300 mb-4">
            {{ $t('editorRetentionModal.configureRetention') }}
          </p>

          <div class="space-y-4 text-left">
            <div>
              <label for="maxBuildsToKeep" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ $t('editorRetentionModal.maxBuildsToKeep') }}
              </label>
              <input
                id="maxBuildsToKeep"
                v-model.number="settings.maxBuildsToKeep"
                type="number"
                min="1"
                max="1000"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ $t('editorRetentionModal.olderBuildsDeleted') }}
              </p>
            </div>

            <div>
              <label for="maxLogDays" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ $t('editorRetentionModal.logRetentionDays') }}
              </label>
              <input
                id="maxLogDays"
                v-model.number="settings.maxLogDays"
                type="number"
                min="1"
                max="365"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ $t('editorRetentionModal.buildLogsDeleted') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="flex justify-center space-x-3 px-4 py-3">
      <button
        @click="handleCancel"
        class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        {{ $t('editorRetentionModal.cancel') }}
      </button>
      <button
        @click="handleSave"
        :disabled="isSaving"
        class="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <span v-if="isSaving">{{ $t('editorRetentionModal.saving') }}</span>
        <span v-else>{{ $t('editorRetentionModal.saveSettings') }}</span>
      </button>
    </div>
  </ModalWrapper>
</template>

<script setup>
import ModalWrapper from '~/components/ModalWrapper.vue'
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  settings: {
    type: Object,
    default: () => ({
      maxBuildsToKeep: 50,
      maxLogDays: 30
    })
  },
  isSaving: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const handleSave = () => {
  emit('save')
}

const handleCancel = () => {
  emit('cancel')
}
</script>
