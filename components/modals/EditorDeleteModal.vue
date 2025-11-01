<template>
  <div v-if="modelValue" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
      <div class="mt-3">
        <div class="flex items-center justify-center mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900">
          <Icon name="alertTriangle" class="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <div class="mt-4 text-center">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Confirm Deletion</h3>
          <div class="mt-2 px-7 py-3">
            <p class="text-sm text-gray-500 dark:text-gray-300">
              Are you sure you want to delete the following {{ items.length === 1 ? 'item' : 'items' }}?
            </p>
            <div class="mt-3 max-h-32 overflow-y-auto">
              <ul class="text-sm text-gray-700 dark:text-gray-300">
                <li v-for="item in items" :key="item.id" class="py-1">
                  <span class="font-medium">{{ item.type === 'node' ? '🔷' : '🔗' }}</span>
                  {{ item.label }}
                </li>
              </ul>
            </div>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">
              This action cannot be undone.
            </p>
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
          @click="handleConfirm"
          class="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import Icon from '~/components/Icon.vue'
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  items: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
}
</script>
