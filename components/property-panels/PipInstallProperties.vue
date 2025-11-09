<template>
  <div class="space-y-4">
    <UCheckbox
      v-model="nodeData.data.useExistingFile"
      label="Use existing requirements.txt from repository"
    />

    <UFormField label="Python Version">
      <USelect
        v-model="nodeData.data.pythonVersion"
        :items="pythonVersionOptions"
        size="md"
        class="w-full"
      />
    </UFormField>

    <UFormField v-if="!nodeData.data.useExistingFile" label="requirements.txt Content" help="Will be written to requirements.txt before installation">
      <ScriptEditor
        v-model="nodeData.data.script"
        :language="'plaintext'"
        :langSelectionEnabled="false"
        class="w-full"
      />
    </UFormField>
    <UAlert v-else color="warning" variant="soft" icon="i-lucide-info">
      <template #description>
        Will use existing requirements.txt from working directory. Ensure file exists in repository or previous build step.
      </template>
    </UAlert>

    <UFormField label="Working Directory">
      <UInput
        v-model="nodeData.data.workingDirectory"
        type="text"
        size="md"
        class="w-full"
        placeholder="./"
      />
    </UFormField>

    <UFormField label="Additional Arguments">
      <UInput
        v-model="nodeData.data.installArgs"
        type="text"
        size="md"
        class="w-full"
        placeholder="--user"
      />
      <template #help>
        Optional flags (e.g., --user, --upgrade)
      </template>
    </UFormField>

    <UFormField label="Timeout (seconds)">
      <UInput
        v-model.number="nodeData.data.timeout"
        type="number"
        :min="60"
        size="md"
        class="w-full"
      />
    </UFormField>
  </div>
</template>

<script setup>
import ScriptEditor from '../ScriptEditor.vue'

defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})

const pythonVersionOptions = [
  { value: 'python', label: 'python' },
  { value: 'python3', label: 'python3' }
]
</script>
