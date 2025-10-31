<template>
  <div class="space-y-4">
    <div class="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
      <input
        type="checkbox"
        v-model="nodeData.data.useExistingFile"
        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      >
      <label class="text-sm text-neutral-700 dark:text-neutral-300">
        Use existing {{ getFileName() }} from repository
      </label>
    </div>

    <!-- Go Mod specific -->
    <div v-if="nodeData.data.nodeType === 'go-mod'">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Command</label>
      <select
        v-model="nodeData.data.command"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
        <option value="download">download</option>
        <option value="tidy">tidy</option>
        <option value="vendor">vendor</option>
      </select>
    </div>

    <!-- Cargo Build specific -->
    <div v-if="nodeData.data.nodeType === 'cargo-build'">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Build Type</label>
      <select
        v-model="nodeData.data.buildType"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
        <option value="debug">debug</option>
        <option value="release">release</option>
      </select>
    </div>

    <!-- Dependency file content -->
    <div v-if="!nodeData.data.useExistingFile">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{{ getFileLabel() }}</label>
      <textarea
        v-model="nodeData.data.script"
        v-auto-resize
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm resize-none overflow-hidden"
        :placeholder="getFilePlaceholder()"
      ></textarea>
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Will be written to {{ getFileName() }} before execution
      </p>
    </div>
    <div v-else class="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
      <p class="text-sm text-amber-800 dark:text-amber-200">
        ℹ️ Will use existing {{ getFileName() }} from working directory. Ensure file exists in repository or previous build step.
      </p>
    </div>

    <!-- Common fields -->
    <div>
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Working Directory</label>
      <input
        v-model="nodeData.data.workingDirectory"
        type="text"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
        placeholder="./"
      >
    </div>

    <div v-if="nodeData.data.installArgs !== undefined">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Additional Arguments</label>
      <input
        v-model="nodeData.data.installArgs"
        type="text"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
        :placeholder="getPlaceholder()"
      >
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
const props = defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})

const getPlaceholder = () => {
  switch (props.nodeData.data.nodeType) {
    case 'bundle-install':
      return '--deployment'
    case 'composer-install':
      return '--no-dev'
    default:
      return ''
  }
}

const getFileLabel = () => {
  switch (props.nodeData.data.nodeType) {
    case 'go-mod':
      return 'go.mod Content'
    case 'bundle-install':
      return 'Gemfile Content'
    case 'composer-install':
      return 'composer.json Content'
    case 'cargo-build':
      return 'Cargo.toml Content'
    default:
      return 'File Content'
  }
}

const getFileName = () => {
  switch (props.nodeData.data.nodeType) {
    case 'go-mod':
      return 'go.mod'
    case 'bundle-install':
      return 'Gemfile'
    case 'composer-install':
      return 'composer.json'
    case 'cargo-build':
      return 'Cargo.toml'
    default:
      return 'file'
  }
}

const getFilePlaceholder = () => {
  switch (props.nodeData.data.nodeType) {
    case 'go-mod':
      return 'module example.com/myapp\n\ngo 1.21\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.1\n)'
    case 'bundle-install':
      return 'source "https://rubygems.org"\n\ngem "rails", "~> 7.0"'
    case 'composer-install':
      return '{\n  "require": {\n    "laravel/framework": "^10.0"\n  }\n}'
    case 'cargo-build':
      return '[package]\nname = "my-app"\nversion = "0.1.0"\n\n[dependencies]\nactix-web = "4.0"'
    default:
      return ''
  }
}
</script>
