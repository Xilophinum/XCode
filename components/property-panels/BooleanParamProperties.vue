<template>
  <div>
    <div class="mt-3">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Default Value</label>
      <button
        @click="nodeData.data.defaultValue = !nodeData.data.defaultValue"
        :class="[
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ml-1',
          nodeData.data.defaultValue 
            ? 'bg-green-600 focus:ring-green-500' 
            : 'bg-red-600 focus:ring-red-500'
        ]"
      >
        <span
          :class="[
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            nodeData.data.defaultValue ? 'translate-x-6' : 'translate-x-1'
          ]"
        />
      </button>
      <span class="ml-2 text-sm" :class="nodeData.data.defaultValue ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
        {{ nodeData.data.defaultValue ? 'True' : 'False' }}
      </span>
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