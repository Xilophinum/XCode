<template>
  <div>
    <div class="mt-3">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Default Value</label>
      <ScriptEditor
        v-model="nodeData.data.defaultValue"
        :language="nodeData.data.language || 'plaintext'"
        @update:language="(newLang) => nodeData.data.language = newLang"
      ></ScriptEditor>
    </div>
  </div>
</template>

<script setup>
import ScriptEditor from '@/components/ScriptEditor.vue'
const props = defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})
</script>
