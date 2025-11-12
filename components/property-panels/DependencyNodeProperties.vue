<template>
  <div class="space-y-4">
    <UCheckbox
      v-model="nodeData.data.useExistingFile"
      :label="$t('dependencyNodeProperties.useExistingFile').replace('{fileName}', getFileName())"
    />

    <!-- Go Mod specific -->
    <UFormField v-if="nodeData.data.nodeType === 'go-mod'" :label="$t('dependencyNodeProperties.command')">
      <USelect
        v-model="nodeData.data.command"
        :items="goModCommandOptions"
        size="md"
        class="w-full"
      />
    </UFormField>

    <!-- Cargo Build specific -->
    <UFormField v-if="nodeData.data.nodeType === 'cargo-build'" :label="$t('dependencyNodeProperties.buildType')">
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
        {{ $t('dependencyNodeProperties.fileContentHelp').replace('{fileName}', getFileName()) }}
      </template>
    </UFormField>
    <UAlert v-else color="warning" variant="soft" icon="i-lucide-info">
      <template #description>
        {{ $t('dependencyNodeProperties.existingFileWarning').replace('{fileName}', getFileName()) }}
      </template>
    </UAlert>

    <!-- Common fields -->
    <UFormField :label="$t('dependencyNodeProperties.workingDirectory')">
      <UInput
        v-model="nodeData.data.workingDirectory"
        type="text"
        size="md"
        class="w-full"
        placeholder="./"
      />
    </UFormField>

    <UFormField v-if="nodeData.data.installArgs !== undefined" :label="$t('dependencyNodeProperties.additionalArguments')">
      <UInput
        v-model="nodeData.data.installArgs"
        type="text"
        size="md"
        class="w-full"
        :placeholder="getPlaceholder()"
      />
    </UFormField>

    <UFormField :label="$t('dependencyNodeProperties.timeout')">
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
      return $t('dependencyNodeProperties.goModContent')
    case 'bundle-install':
      return $t('dependencyNodeProperties.gemfileContent')
    case 'composer-install':
      return $t('dependencyNodeProperties.composerJsonContent')
    case 'cargo-build':
      return $t('dependencyNodeProperties.cargoTomlContent')
    default:
      return $t('dependencyNodeProperties.fileContent')
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
