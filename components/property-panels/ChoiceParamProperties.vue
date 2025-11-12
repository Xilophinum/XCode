<template>
  <div>
    <UFormField :label="$t('choiceParamProperties.choicesOnePerLine')" class="mt-3">
      <UTextarea
        :value="nodeData.data.choices?.join('\n') || ''"
        @input="nodeData.data.choices = $event.target.value.split('\n').filter(c => c.trim())"
        v-auto-resize
        size="md"
        class="w-full"
      />
    </UFormField>
    
    <UFormField :label="$t('choiceParamProperties.defaultValue')" class="mt-3">
      <USelect
        v-model="nodeData.data.defaultValue"
        :items="choiceOptions"
        size="md"
        class="w-full"
      />
    </UFormField>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})

const choiceOptions = computed(() => {
  return (props.nodeData.data.choices || []).map(choice => ({
    value: choice,
    label: choice
  }))
})
</script>