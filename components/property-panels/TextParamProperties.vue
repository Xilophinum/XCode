<template>
  <div>
    <UFormField :label="t('textParamProperties.defaultTextValue')" class="mt-3">
      <ScriptEditor
        v-model="nodeData.data.defaultValue"
        :language="nodeData.data.language || 'plaintext'"
        @update:language="(newLang) => nodeData.data.language = newLang"
      />
    </UFormField>
  </div>
</template>

<script setup>
import ScriptEditor from '@/components/ScriptEditor.vue'

const { t } = useI18n()

const props = defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})
</script>
