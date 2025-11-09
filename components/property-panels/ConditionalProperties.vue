<template>
  <div class="space-y-4">
    <UFormField label="Condition (JavaScript)">
      <UTextarea
        v-model="nodeData.data.condition"
        v-auto-resize
        size="md"
        class="w-full font-mono"
        placeholder="$socketLabel == 'value'"
      />
      <template #help>
        Write JavaScript condition using input socket variables. If the condition evaluates to true, the green execution socket is used; if false, the red execution socket is used.
      </template>
    </UFormField>
      
    <!-- Parameter substitution help -->
    <UAlert v-if="nodeData.data.inputSockets && nodeData.data.inputSockets.length > 0" color="primary" variant="soft">
      <template #title>Available variables:</template>
      <template #description>
        <div class="space-y-1">
          <div v-for="socket in nodeData.data.inputSockets" :key="socket.id">
            <code>${{ socket.label }}</code>
          </div>
        </div>
      </template>
    </UAlert>
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