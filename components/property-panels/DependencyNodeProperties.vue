<template>
  <div class="space-y-4">
    <UCheckbox
      v-model="nodeData.data.useExistingFile"
      :label="`Use existing ${getFileName()} from repository`"
    />

    <!-- Go Mod specific -->
    <UFormField v-if="nodeData.data.nodeType === 'go-mod'" label="Command">
      <USelect
        v-model="nodeData.data.command"
        :items="goModCommandOptions"
        size="md"
        class="w-full"
      />
    </UFormField>

    <!-- Cargo Build specific -->
    <UFormField v-if="nodeData.data.nodeType === 'cargo-build'" label="Build Type">
      <USelect
        v-model="nodeData.data.buildType"
        :items="cargoBuildTypeOptions"
        size="md"
        class="w-full"
      />
    </UFormField>

    <!-- Dependency file content -->
    <UFormField v-if="!nodeData.data.useExistingFile" :label="getFileLabel()">
      <ScriptEditor
        v-model="nodeData.data.script"
        :language="'plaintext'"
        class="w-full"
      />
      <template #help>
        Will be written to {{ getFileName() }} before execution
      </template>
    </UFormField>
    <UAlert v-else color="warning" variant="soft" icon="i-lucide-info">
      <template #description>
        Will use existing {{ getFileName() }} from working directory. Ensure file exists in repository or previous build step.
      </template>
    </UAlert>

    <!-- Common fields -->
    <UFormField label="Working Directory">
      <UInput
        v-model="nodeData.data.workingDirectory"
        type="text"
        size="md"
        class="w-full"
        placeholder="./"
      />
    </UFormField>

    <UFormField v-if="nodeData.data.installArgs !== undefined" label="Additional Arguments">
      <UInput
        v-model="nodeData.data.installArgs"
        type="text"
        size="md"
        class="w-full"
        :placeholder="getPlaceholder()"
      />
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

const props = defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})

const goModCommandOptions = [
  { value: 'download', label: 'download' },
  { value: 'tidy', label: 'tidy' },
  { value: 'vendor', label: 'vendor' }
]

const cargoBuildTypeOptions = [
  { value: 'debug', label: 'debug' },
  { value: 'release', label: 'release' }
]

const getPlaceholder = () => {
  switch (props.nodeData.data.nodeType) {
    case 'bundle-install':
      return '--deployment'
    case 'composer-install':
      return '--no-dev'
    default:
      return ''
  }
}

const getFileLabel = () => {
  switch (props.nodeData.data.nodeType) {
    case 'go-mod':
      return 'go.mod Content'
    case 'bundle-install':
      return 'Gemfile Content'
    case 'composer-install':
      return 'composer.json Content'
    case 'cargo-build':
      return 'Cargo.toml Content'
    default:
      return 'File Content'
  }
}

const getFileName = () => {
  switch (props.nodeData.data.nodeType) {
    case 'go-mod':
      return 'go.mod'
    case 'bundle-install':
      return 'Gemfile'
    case 'composer-install':
      return 'composer.json'
    case 'cargo-build':
      return 'Cargo.toml'
    default:
      return 'file'
  }
}
</script>
