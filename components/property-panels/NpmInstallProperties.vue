<template>
  <div class="space-y-4">
    <UCard>
      <UCheckbox
        v-model="nodeData.data.useExistingFile"
        label="Use existing package.json from repository"
      />
    </UCard>

    <UFormField label="Package Manager">
      <USelect
        v-model="nodeData.data.packageManager"
        :items="packageManagerOptions"
        size="md"
        class="w-full"
      />
    </UFormField>

    <UFormField v-if="!nodeData.data.useExistingFile" label="package.json Content">
      <ScriptEditor
        v-model="nodeData.data.script"
        :language="'json'"
        :langSelectionEnabled="false"
        class="w-full"
      />
      <template #help>
        Will be written to package.json before installation
      </template>
    </UFormField>
    <UAlert v-else color="warning" variant="soft" icon="i-lucide-info">
      <template #description>
        Will use existing package.json from working directory. Ensure file exists in repository or previous build step.
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
        placeholder="--production"
      />
      <template #help>
        Optional flags (e.g., --production, --frozen-lockfile)
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

const packageManagerOptions = [
  { value: 'npm', label: 'npm' },
  { value: 'pnpm', label: 'pnpm' },
  { value: 'yarn', label: 'yarn' },
  { value: 'bun', label: 'bun' }
]
</script>
