<template>
  <div>
    <div class="mt-3">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Choices (one per line)</label>
      <textarea
        :value="nodeData.data.choices?.join('\n') || ''"
        @input="nodeData.data.choices = $event.target.value.split('\n').filter(c => c.trim())"
        v-auto-resize
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none overflow-hidden"
      ></textarea>
    </div>
    
    <div class="mt-3">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Default Value</label>
      <select
        v-model="nodeData.data.defaultValue"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
        <option v-for="choice in nodeData.data.choices" :key="choice" :value="choice">{{ choice }}</option>
      </select>
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
</script>