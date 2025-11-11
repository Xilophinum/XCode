<template>
  <ModalWrapper :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" class="max-w-md">
    <div class="mt-3">
      <div class="flex items-center justify-center mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900">
        <UIcon name="i-lucide-triangle-alert" class="w-6 h-6 text-red-600 dark:text-red-400" />
      </div>
      <div class="mt-4 text-center">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ t('editorDeleteModal.confirmDeletion') }}</h3>
        <div class="mt-2 px-7 py-3">
          <p class="text-sm text-gray-500 dark:text-gray-300">
            {{ t('editorDeleteModal.areYouSureDelete') }} {{ items.length === 1 ? t('editorDeleteModal.item') : t('editorDeleteModal.items') }}?
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
            {{ t('editorDeleteModal.cannotBeUndone') }}
          </p>
        </div>
      </div>
    </div>
    <div class="flex justify-center space-x-3 px-4 py-3">
      <button
        @click="handleCancel"
        class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        {{ t('editorDeleteModal.cancel') }}
      </button>
      <button
        @click="handleConfirm"
        class="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        {{ t('editorDeleteModal.delete') }}
      </button>
    </div>
  </ModalWrapper>
</template>

<script setup>
import ModalWrapper from '~/components/ModalWrapper.vue'
const { t } = useI18n()
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
