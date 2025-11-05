<template>
    <div class="script-editor-container" :style="{height: editorHeight + 'px'}">
        <USelect 
            v-model="localLanguage" 
            @change="updateLanguage" 
            v-if="langSelectionEnabled"
            :items="availableLanguages"
            class="w-full mb-2"
        />
        <MonacoEditor
          ref="editorRef"
          v-model="localValue"
          :lang="localLanguage"
          :options="{
              automaticLayout: true,
              minimap: { enabled: false },
              theme: 'vs-dark',
              fontSize: 14,
              tabSize: 2,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              scrollbar: {
                  vertical: 'hidden',
                  horizontal: 'hidden'
              },
              lineNumbers: 'on',
              glyphMargin: false,
              folding: false,
              renderLineHighlight: 'none',
              hideCursorInOverviewRuler: true,
              overviewRulerLanes: 0,
              overviewRulerBorder: false
          }"
          :style="{ height: '100%', width: '100%' }"
          @update:modelValue="handleValueUpdate"
          @load="editorMounted"
        />
    </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { languages } from 'monaco-editor'

const props = defineProps({
    modelValue: {
        type: String,
        required: true,
    },
    language: {
        type: String,
        default: 'javascript',
    },
    langSelectionEnabled: {
        type: Boolean,
        default: true,
    },
})

const emit = defineEmits(['update:modelValue', 'update:language'])

const localLanguage = ref(props.language)
const localValue = ref(props.modelValue)
const editorHeight = ref(100) // Minimum height
const editorRef = ref(null)
let monacoEditor = null

const availableLanguages = computed(() => {
  return languages.getLanguages().sort((a, b) => a.id.localeCompare(b.id)).map(lang => lang.id)
})

const updateEditorHeight = () => {
  if (monacoEditor) {
    nextTick(() => {
        const contentHeight = monacoEditor.getContentHeight() + 50 // Adding some padding for dropdown above editor
        editorHeight.value = Math.max(contentHeight, 100) // Minimum 100px
    })
  }
}

watch(() => props.modelValue, (newVal) => {
  localValue.value = newVal
  updateEditorHeight()
}, { immediate: true })

watch(() => props.language, (newVal) => {
  localLanguage.value = newVal
  updateEditorHeight()
}, { immediate: true })

const updateLanguage = () => {
  emit('update:language', localLanguage.value)
}

const handleValueUpdate = (value) => {
  localValue.value = value
  emit('update:modelValue', value)
  updateEditorHeight()
}

const editorMounted = (editor) => {
  monacoEditor = editor
  updateEditorHeight()

  // Listen to content changes to update height
  monacoEditor.onDidChangeModelContent(() => {
    updateEditorHeight()
  })

  // Fix space key issue by preventing event propagation
  const domNode = monacoEditor.getDomNode()
  if (domNode) {
    domNode.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.stopPropagation()
      }
    }, true)
  }
}
</script>

<style scoped>
.script-editor-container {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>