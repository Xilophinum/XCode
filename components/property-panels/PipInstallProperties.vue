<template>
  <div class="space-y-4">
    <UCheckbox
      v-model="nodeData.data.useExistingFile"
      :label="$t('pipInstallProperties.useExistingRequirements')"
    />

    <UFormField :label="$t('pipInstallProperties.pythonVersion')">
      <USelect
        v-model="nodeData.data.pythonVersion"
        :items="pythonVersionOptions"
        size="md"
        class="w-full"
      />
    </UFormField>

    <UFormField v-if="!nodeData.data.useExistingFile" :label="$t('pipInstallProperties.requirementsContent')" :help="$t('pipInstallProperties.requirementsHelp')">
      <ScriptEditor
        v-model="nodeData.data.script"
        :language="'plaintext'"
        :langSelectionEnabled="false"
        class="w-full"
      />
    </UFormField>
    <UAlert v-else color="warning" variant="soft" icon="i-lucide-info">
      <template #description>
        {{ $t('pipInstallProperties.existingFileWarning') }}
      </template>
    </UAlert>

    <UFormField :label="$t('pipInstallProperties.workingDirectory')">
      <UInput
        v-model="nodeData.data.workingDirectory"
        type="text"
        size="md"
        class="w-full"
        placeholder="./"
      />
    </UFormField>

    <UFormField :label="$t('pipInstallProperties.additionalArguments')">
      <UInput
        v-model="nodeData.data.installArgs"
        type="text"
        size="md"
        class="w-full"
        :placeholder="$t('pipInstallProperties.additionalArgumentsPlaceholder')"
      />
      <template #help>
        {{ $t('pipInstallProperties.additionalArgumentsHelp') }}
      </template>
    </UFormField>

    <UFormField :label="$t('pipInstallProperties.timeout')">
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
