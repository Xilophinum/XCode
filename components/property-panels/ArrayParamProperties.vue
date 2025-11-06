<template>
  <div>
    <!-- Array Format Toggle -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        Array Format
      </label>
      <div class="flex gap-3">
        <label class="flex items-center cursor-pointer">
          <input
            v-model="nodeData.data.arrayFormat"
            type="radio"
            value="json"
            class="w-4 h-4 text-blue-600 border-neutral-300 dark:border-neutral-600 focus:ring-blue-500"
          >
          <span class="ml-2 text-sm text-neutral-700 dark:text-neutral-300">JSON Array</span>
        </label>
        <label class="flex items-center cursor-pointer">
          <input
            v-model="nodeData.data.arrayFormat"
            type="radio"
            value="lines"
            class="w-4 h-4 text-blue-600 border-neutral-300 dark:border-neutral-600 focus:ring-blue-500"
          >
          <span class="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Line-separated</span>
        </label>
      </div>
    </div>

    <!-- Array Input (JSON) -->
    <div v-if="nodeData.data.arrayFormat === 'json'" class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        Default Array Value
        <span class="text-xs font-normal text-neutral-500 dark:text-neutral-400 ml-2">(JSON array)</span>
      </label>
      <ScriptEditor
        v-model="nodeData.data.defaultValue"
        :language="'json'"
        :langSelectionEnabled="false"
        class="w-full border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
      />
      <div class="mt-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-xs">
        <div class="font-medium text-blue-800 dark:text-blue-200 mb-1">Examples:</div>
        <div class="space-y-2 text-blue-700 dark:text-blue-300">
          <div>
            <code class="block bg-white dark:bg-neutral-800 p-2 rounded">["production", "staging", "development"]</code>
            <span class="text-neutral-600 dark:text-neutral-400">Array of strings</span>
          </div>
          <div>
            <code class="block bg-white dark:bg-neutral-800 p-2 rounded">[1, 2, 3, 4, 5]</code>
            <span class="text-neutral-600 dark:text-neutral-400">Array of numbers</span>
          </div>
          <div>
            <code class="block bg-white dark:bg-neutral-800 p-2 rounded">[
  {"env": "prod", "region": "us-east"},
  {"env": "staging", "region": "eu-west"}
]</code>
            <span class="text-neutral-600 dark:text-neutral-400">Array of objects</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Array Input (Lines) -->
    <div v-else class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        Default Array Value
        <span class="text-xs font-normal text-neutral-500 dark:text-neutral-400 ml-2">(one value per line)</span>
      </label>
      <textarea
        v-model="nodeData.data.defaultValue"
        rows="10"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
        placeholder="production&#10;staging&#10;development"
      />
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Each line will become an array element. Empty lines are ignored.
      </p>
    </div>

    <!-- Array Preview -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        Array Preview
        <span class="text-xs font-normal text-neutral-500 dark:text-neutral-400 ml-2">({{ parsedArray.length }} items)</span>
      </label>
      <div class="p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg max-h-40 overflow-y-auto">
        <div v-if="parseError" class="text-red-600 dark:text-red-400 text-sm">
          Error: {{ parseError }}
        </div>
        <div v-else-if="parsedArray.length === 0" class="text-neutral-500 dark:text-neutral-400 text-sm">
          No items in array
        </div>
        <div v-else class="space-y-1">
          <div v-for="(item, index) in previewItems" :key="index" class="text-sm font-mono text-neutral-700 dark:text-neutral-300">
            <span class="text-neutral-500 dark:text-neutral-500">[{{ index }}]</span>
            <span class="ml-2">{{ formatItem(item) }}</span>
          </div>
          <div v-if="parsedArray.length > 10" class="text-neutral-500 dark:text-neutral-400 text-xs italic">
            ... and {{ parsedArray.length - 10 }} more items
          </div>
        </div>
      </div>
    </div>

    <!-- Info Box -->
    <div class="mt-6 p-4 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
      <div class="flex items-start gap-2">
        <span class="text-purple-600 dark:text-purple-400 text-lg">ℹ️</span>
        <div class="text-sm text-purple-800 dark:text-purple-200">
          <p class="font-semibold mb-1">How to use:</p>
          <ol class="list-decimal list-inside space-y-1">
            <li>Connect this parameter to a Parallel Matrix node's array input</li>
            <li>At execution time, provide the array values (or use defaults)</li>
            <li>The matrix node will execute once for each array item</li>
            <li>Choose JSON format for complex objects, or line-separated for simple strings</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ScriptEditor from '@/components/ScriptEditor.vue'

const props = defineProps({
  nodeData: { type: Object, required: true }
})

// Ensure arrayFormat is initialized
if (!props.nodeData.data.arrayFormat) {
  props.nodeData.data.arrayFormat = 'json'
}

// Parse array based on format
const parsedArray = computed(() => {
  try {
    const value = props.nodeData.data.defaultValue

    if (!value || value.trim() === '') {
      return []
    }

    if (props.nodeData.data.arrayFormat === 'json') {
      // Parse as JSON
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed
      }
      return []
    } else {
      // Parse as line-separated
      return value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    }
  } catch (error) {
    return []
  }
})

// Parse error
const parseError = computed(() => {
  try {
    const value = props.nodeData.data.defaultValue

    if (!value || value.trim() === '') {
      return null
    }

    if (props.nodeData.data.arrayFormat === 'json') {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) {
        return 'Value must be a JSON array'
      }
    }

    return null
  } catch (error) {
    return props.nodeData.data.arrayFormat === 'json' ? error.message : null
  }
})

// Preview items (first 10)
const previewItems = computed(() => {
  return parsedArray.value.slice(0, 10)
})

// Format item for display
const formatItem = (item) => {
  if (typeof item === 'object') {
    return JSON.stringify(item)
  }
  return String(item)
}
</script>
