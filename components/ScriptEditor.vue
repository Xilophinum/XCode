<template>
    <div class="script-editor-container">
        <select 
            v-model="localLanguage" 
            @change="updateLanguage" 
            v-if="langSelectionEnabled"
            class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
        >
            <option v-for="lang in availableLanguages" :key="lang" :value="lang">
                {{ lang }}
            </option>
        </select>
            <CodeEditor
                ref="editorRef"
                :value="localValue"
                theme="vs-dark"
                :language="localLanguage"
                :options="{
                    automaticLayout: true,
                    minimap: { enabled: false },
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
                :height="editorHeight + 'px'"
                @update:modelValue="handleValueUpdate"
                @editorDidMount="handleEditorDidMount"
            />
    </div>
</template>

<script setup>
import { ref, computed, watch, defineProps, defineEmits, nextTick } from 'vue'
import { CodeEditor } from 'monaco-editor-vue3'
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
        const contentHeight = monacoEditor.getContentHeight()
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

const handleEditorDidMount = (editor) => {
  monacoEditor = editor
  updateEditorHeight()
  
  // Listen to content changes to update height
  monacoEditor.onDidChangeModelContent(() => {
    updateEditorHeight()
  })
}
</script>

<style scoped>
.script-editor-container {
  display: flex;
  flex-direction: column;
}
</style>