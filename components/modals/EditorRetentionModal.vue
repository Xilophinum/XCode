<template>
  <div v-if="modelValue" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
      <div class="mt-3">
        <div class="flex items-center justify-center mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900">
          <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15c1.66 0 3-1.34 3-3V9c0-1.66-1.34-3-3-3s-3 1.34-3 3v3c0 1.66 1.34 3 3 3z M9 9a3 3 0 1 1 6 0v3a3 3 0 1 1-6 0V9z M7 21h10"></path>
          </svg>
        </div>
        <div class="mt-4 text-center">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Build Retention Settings</h3>
          <div class="mt-2 px-7 py-3">
            <p class="text-sm text-gray-500 dark:text-gray-300 mb-4">
              Configure how long builds and logs are kept for this project.
            </p>

            <div class="space-y-4 text-left">
              <div>
                <label for="maxBuildsToKeep" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maximum Builds to Keep
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
                  Older builds will be automatically deleted
                </p>
              </div>

              <div>
                <label for="maxLogDays" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Log Retention (Days)
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
                  Build logs older than this will be deleted
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
          Cancel
        </button>
        <button
          @click="handleSave"
          :disabled="isSaving"
          class="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <span v-if="isSaving">Saving...</span>
          <span v-else>Save Settings</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
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
