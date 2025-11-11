<template>
  <div>
    <!-- Execution Type -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{{ t('parallelExecutionProperties.executionType') }}</label>
      <select
        v-model="nodeData.data.executionType"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
        <option 
          v-for="option in placeholderData.filter(option => option.type !== 'parallel_execution')" 
          :key="option.type" 
          :value="option.type"
        >{{ option.name }}</option>
      </select>
    </div>

    <!-- Script Editor -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{{ t('parallelExecutionProperties.script') }}</label>
      <ScriptEditor
        v-model="nodeData.data.script"
        :language="'javascript'"
        class="w-full border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
      />
    </div>

    <!-- Working Directory -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{{ t('parallelExecutionProperties.workingDirectory') }}</label>
      <input
        v-model="nodeData.data.workingDirectory"
        type="text"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
        :placeholder="t('parallelExecutionProperties.workingDirectoryPlaceholder')"
      >
    </div>

    <!-- Timeout -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        {{ t('parallelExecutionProperties.timeout') }}
      </label>
      <input
        v-model.number="nodeData.data.timeout"
        type="number"
        min="1"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
    </div>

    <!-- Info Box -->
    <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div class="flex items-start gap-2">
        <span class="text-blue-600 dark:text-blue-400 text-lg">ℹ️</span>
        <div class="text-sm text-blue-800 dark:text-blue-200">
          <p class="font-semibold mb-1">{{ t('parallelExecutionProperties.parallelExecutionNode') }}</p>
          <p>{{ t('parallelExecutionProperties.parallelExecutionDescription') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import ScriptEditor from '@/components/ScriptEditor.vue'

const { t } = useI18n()

const props = defineProps({
  nodeData: { 
    type: Object, 
    required: true 
  },
  placeholderData: {
    type: Object,
    required: true
  }
})
</script>
