<template>
  <div>
    <div class="mt-3">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Condition (JavaScript)</label>
      <textarea
        v-model="nodeData.data.condition"
        rows="4"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
        placeholder="$socketLabel == 'value'"
      ></textarea>
      
      <!-- Parameter substitution help -->
      <div v-if="nodeData.data.inputSockets && nodeData.data.inputSockets.length > 0" class="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs">
        <div class="font-medium text-blue-800 dark:text-blue-200 mb-1">Available variables:</div>
        <div class="space-y-1">
          <div v-for="socket in nodeData.data.inputSockets" :key="socket.id" class="text-blue-700 dark:text-blue-300">
            <code>${{ socket.label }}</code>
          </div>
        </div>
      </div>
      
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Write JavaScript condition using input socket variables. If the condition evaluates to true, the green execution socket is used; if false, the red execution socket is used.
      </p>
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