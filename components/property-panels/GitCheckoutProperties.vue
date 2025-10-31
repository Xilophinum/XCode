<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Repository URL</label>
      <input
        v-model="nodeData.data.repositoryUrl"
        type="text"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
        placeholder="https://github.com/user/repo.git"
      >
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Supports credential variables: ${CREDENTIAL_NAME} or ${CREDENTIAL_NAME_USERNAME}
      </p>
    </div>

    <div>
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Branch/Tag/Commit</label>
      <input
        v-model="nodeData.data.branch"
        type="text"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
        placeholder="main"
      >
    </div>

    <div>
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Checkout Directory</label>
      <input
        v-model="nodeData.data.checkoutDirectory"
        type="text"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
        placeholder="./"
      >
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Directory will be created if it doesn't exist
      </p>
    </div>

    <div class="flex items-center space-x-2">
      <input
        type="checkbox"
        v-model="nodeData.data.shallowClone"
        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      >
      <label class="text-sm text-neutral-700 dark:text-neutral-300">
        Shallow clone (depth=1, faster for large repos)
      </label>
    </div>

    <div class="flex items-center space-x-2">
      <input
        type="checkbox"
        v-model="nodeData.data.cleanCheckout"
        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      >
      <label class="text-sm text-neutral-700 dark:text-neutral-300">
        Clean checkout (remove directory if exists)
      </label>
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
defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})
</script>
