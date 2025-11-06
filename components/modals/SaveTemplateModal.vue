<template>
  <ModalWrapper :model-value="modelValue" class="max-w-md" @update:model-value="handleClose">
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center mb-6">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900">
          <UIcon name="i-lucide-save" class="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div class="ml-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Save as Template</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Create a reusable project template</p>
        </div>
      </div>

      <!-- Existing Templates (if overwriting) -->
      <div v-if="existingTemplates.length > 0" class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Overwrite Existing Template (Optional)
        </label>
        <select
          v-model="selectedTemplateId"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          @change="handleTemplateSelection"
        >
          <option :value="null">Create New Template</option>
          <option v-for="template in existingTemplates" :key="template.id" :value="template.id">
            {{ template.name }}
          </option>
        </select>
      </div>

      <!-- Template Name -->
      <div class="mb-4">
        <label for="template-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Template Name <span class="text-red-500">*</span>
        </label>
        <UInput
          id="template-name"
          v-model="templateName"
          placeholder="Enter template name..."
          class="w-full"
          :error="nameError"
        />
        <p v-if="nameError" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ nameError }}</p>
      </div>

      <!-- Template Description -->
      <div class="mb-6">
        <label for="template-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description (Optional)
        </label>
        <textarea
          id="template-description"
          v-model="templateDescription"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-y"
          placeholder="Describe this template..."
        />
      </div>

      <!-- Buttons -->
      <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <UButton
          @click="handleCancel"
          color="error"
        >
          Cancel
        </UButton>
        <UButton
          @click="handleSave"
          color="primary"
          :loading="isSaving"
          :disabled="!templateName.trim()"
        >
          {{ selectedTemplateId ? 'Update Template' : 'Save Template' }}
        </UButton>
      </div>
    </div>
  </ModalWrapper>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  existingTemplates: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const templateName = ref('')
const templateDescription = ref('')
const selectedTemplateId = ref(null)
const nameError = ref('')
const isSaving = ref(false)

// Watch for modal open/close to reset form
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    templateName.value = ''
    templateDescription.value = ''
    selectedTemplateId.value = null
    nameError.value = ''
  }
})

const handleTemplateSelection = () => {
  if (selectedTemplateId.value) {
    const template = props.existingTemplates.find(t => t.id === selectedTemplateId.value)
    if (template) {
      templateName.value = template.name
      templateDescription.value = template.description || ''
    }
  } else {
    templateName.value = ''
    templateDescription.value = ''
  }
  nameError.value = ''
}

const handleSave = async () => {
  // Validate
  if (!templateName.value.trim()) {
    nameError.value = 'Template name is required'
    return
  }

  isSaving.value = true

  emit('save', {
    id: selectedTemplateId.value,
    name: templateName.value.trim(),
    description: templateDescription.value.trim()
  })

  // Reset after a short delay to allow the save to complete
  setTimeout(() => {
    isSaving.value = false
  }, 500)
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
