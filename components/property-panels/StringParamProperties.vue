<template>
  <div>
    <UFormField :label="$t('stringParamProperties.defaultValue')" class="mt-3">
      <UInput
        v-model="nodeData.data.defaultValue"
        type="text"
        size="md"
        class="w-full"
      />
    </UFormField>
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