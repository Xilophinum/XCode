<template>
  <div>
    <!-- Array Parameter Instructions -->
    <div class="mb-4">
      <div class="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div class="flex items-start gap-2">
          <span class="text-blue-600 dark:text-blue-400 text-lg">📥</span>
          <div class="text-sm text-blue-800 dark:text-blue-200">
            <p class="font-semibold mb-2">Array Parameter Input Required:</p>
            <ol class="list-decimal list-inside space-y-1">
              <li>Create an <strong>Array Parameter</strong> node</li>
              <li>Connect it to this node's <code class="bg-blue-100 dark:bg-blue-900 px-1 rounded">Array Values</code> input socket</li>
              <li>The array values will be used to execute the connected job multiple times</li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <!-- Execution Name Template -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        Execution Name Template
        <span class="text-xs font-normal text-neutral-500 dark:text-neutral-400 ml-2">(optional)</span>
      </label>
      <input
        v-model="nodeData.data.nameTemplate"
        type="text"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono"
        placeholder="Matrix-$INDEX"
      >
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Template for naming each execution. Available: $INDEX, $ITEM_VALUE
      </p>
      <div class="mt-2 p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-xs">
        <div class="font-medium text-neutral-700 dark:text-neutral-300 mb-1">Examples:</div>
        <div class="space-y-1 text-neutral-600 dark:text-neutral-400">
          <div><code class="bg-white dark:bg-neutral-700 px-1 rounded">Build-$ITEM_VALUE</code> → Build-production</div>
          <div><code class="bg-white dark:bg-neutral-700 px-1 rounded">Deploy-$INDEX-$ITEM_VALUE</code> → Deploy-1-us-east</div>
        </div>
      </div>
    </div>

    <!-- Additional Parameters -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        Additional Parameters
        <span class="text-xs font-normal text-neutral-500 dark:text-neutral-400 ml-2">(JSON object, optional)</span>
      </label>
      <ScriptEditor
        v-model="nodeData.data.additionalParams"
        :language="'json'"
        :langSelectionEnabled="false"
        class="w-full border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
      />
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Static parameters passed to all executions. Example: {"BUILD_TYPE": "Release", "ENABLE_CACHE": true}
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
            <li>Connect an Array Parameter node to the <code class="bg-purple-100 dark:bg-purple-900 px-1 rounded">Array Values</code> input socket</li>
            <li>Connect parallel execution node to the <code class="bg-purple-100 dark:bg-purple-900 px-1 rounded">For Each Item</code> execution socket</li>
            <li>Connect the <code class="bg-purple-100 dark:bg-purple-900 px-1 rounded">Iteration Value</code> output to execution node inputs to access current item</li>
            <li>Optionally connect <code class="bg-purple-100 dark:bg-purple-900 px-1 rounded">Additional Parameters</code> output for static parameters</li>
            <li>Results are aggregated in the output sockets after all iterations complete</li>
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
