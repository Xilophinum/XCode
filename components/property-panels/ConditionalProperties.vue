<template>
  <div class="space-y-4">
    <UFormField :label="t('conditionalProperties.conditionJavaScript')">
      <UTextarea
        v-model="nodeData.data.condition"
        v-auto-resize
        size="md"
        class="w-full font-mono"
        placeholder="$socketLabel == 'value'"
      />
      <template #help>
        {{ t('conditionalProperties.conditionHelp') }}
      </template>
    </UFormField>
      
    <!-- Parameter substitution help -->
    <UAlert v-if="nodeData.data.inputSockets && nodeData.data.inputSockets.length > 0" color="primary" variant="soft">
      <template #title>{{ t('conditionalProperties.availableVariables') }}</template>
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
const { t } = useI18n()
const props = defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})
</script>