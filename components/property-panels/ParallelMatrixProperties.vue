<template>
  <div>
    <!-- JavaScript Code Editor -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        JavaScript Code
        <span class="text-xs font-normal text-neutral-500 dark:text-neutral-400 ml-2">(must return an array)</span>
      </label>
      <ScriptEditor
        v-model="nodeData.data.script"
        :language="'javascript'"
        :langSelectionEnabled="false"
        class="w-full border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
      />
      <div class="mt-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-xs">
        <div class="font-medium text-blue-800 dark:text-blue-200 mb-1">Examples:</div>
        <div class="space-y-2 text-blue-700 dark:text-blue-300">
          <div>
            <code class="block bg-white dark:bg-neutral-800 p-2 rounded">return ['node-18', 'node-20', 'node-22']</code>
            <span class="text-neutral-600 dark:text-neutral-400">Simple array of strings</span>
          </div>
          <div>
            <code class="block bg-white dark:bg-neutral-800 p-2 rounded">return [1, 2, 3, 4, 5]</code>
            <span class="text-neutral-600 dark:text-neutral-400">Array of numbers</span>
          </div>
          <div>
            <code class="block bg-white dark:bg-neutral-800 p-2 rounded">return [
  { version: 'node-18', os: 'ubuntu' },
  { version: 'node-20', os: 'windows' }
]</code>
            <span class="text-neutral-600 dark:text-neutral-400">Array of objects</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Item Variable Name -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        Item Variable Name
      </label>
      <input
        v-model="nodeData.data.itemVariableName"
        type="text"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono"
        placeholder="ITEM"
      >
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Variable name to use in downstream nodes. For objects, use dot notation: ${ITEM.version}
      </p>
    </div>

    <!-- Max Concurrency -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        Max Concurrent Executions
      </label>
      <input
        v-model.number="nodeData.data.maxConcurrency"
        type="number"
        min="1"
        placeholder="Unlimited"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Leave empty for unlimited parallel execution
      </p>
    </div>

    <!-- Fail Fast -->
    <div class="mb-4">
      <label class="flex items-center cursor-pointer">
        <input
          v-model="nodeData.data.failFast"
          type="checkbox"
          class="w-4 h-4 text-blue-600 border-neutral-300 dark:border-neutral-600 rounded focus:ring-blue-500"
        >
        <span class="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Fail Fast</span>
      </label>
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400 ml-6">
        Stop all iterations if any iteration fails
      </p>
    </div>

    <!-- Continue on Error -->
    <div class="mb-4">
      <label class="flex items-center cursor-pointer">
        <input
          v-model="nodeData.data.continueOnError"
          type="checkbox"
          class="w-4 h-4 text-blue-600 border-neutral-300 dark:border-neutral-600 rounded focus:ring-blue-500"
        >
        <span class="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Continue on Error</span>
      </label>
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400 ml-6">
        Continue executing remaining items even if some fail
      </p>
    </div>

    <!-- Info Box -->
    <div class="mt-6 p-4 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
      <div class="flex items-start gap-2">
        <span class="text-purple-600 dark:text-purple-400 text-lg">ℹ️</span>
        <div class="text-sm text-purple-800 dark:text-purple-200">
          <p class="font-semibold mb-1">How it works:</p>
          <ol class="list-decimal list-inside space-y-1">
            <li>Your JavaScript code runs on the server and must return an array</li>
            <li>For each item in the array, the connected job is executed once</li>
            <li>Each item is available as <code class="bg-purple-100 dark:bg-purple-900 px-1 rounded">${{nodeData.data.itemVariableName}}</code> in downstream nodes</li>
            <li>Results are aggregated in the output socket</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import ScriptEditor from '@/components/ScriptEditor.vue'
const props = defineProps({
  nodeData: { type: Object, required: true }
})
</script>
