<template>
  <div class="space-y-4">
    <div class="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
      <input
        type="checkbox"
        v-model="nodeData.data.useExistingFile"
        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      >
      <label class="text-sm text-neutral-700 dark:text-neutral-300">
        Use existing package.json from repository
      </label>
    </div>

    <div>
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Package Manager</label>
      <select
        v-model="nodeData.data.packageManager"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
        <option value="npm">npm</option>
        <option value="pnpm">pnpm</option>
        <option value="yarn">yarn</option>
        <option value="bun">bun</option>
      </select>
    </div>

    <div v-if="!nodeData.data.useExistingFile">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">package.json Content</label>
      <ScriptEditor
        v-model="nodeData.data.script"
        :language="'json'"
        :langSelectionEnabled="false"
        class="w-full border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
      />
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Will be written to package.json before installation
      </p>
    </div>
    <div v-else class="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
      <p class="text-sm text-amber-800 dark:text-amber-200">
        ℹ️ Will use existing package.json from working directory. Ensure file exists in repository or previous build step.
      </p>
    </div>

    <div>
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Working Directory</label>
      <input
        v-model="nodeData.data.workingDirectory"
        type="text"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
        placeholder="./"
      >
    </div>

    <div>
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Additional Arguments</label>
      <input
        v-model="nodeData.data.installArgs"
        type="text"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
        placeholder="--production"
      >
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Optional flags (e.g., --production, --frozen-lockfile)
      </p>
    </div>

    <div>
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Timeout (seconds)</label>
      <input
        v-model.number="nodeData.data.timeout"
        type="number"
        min="60"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
    </div>
  </div>
</template>

<script setup>
import ScriptEditor from '../ScriptEditor.vue'
defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})
</script>
