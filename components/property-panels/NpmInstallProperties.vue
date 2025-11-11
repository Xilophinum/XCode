<template>
  <div class="space-y-4">
    <UCard>
      <UCheckbox
        v-model="nodeData.data.useExistingFile"
        :label="t('npmInstallProperties.useExistingPackageJson')"
      />
    </UCard>

    <UFormField :label="t('npmInstallProperties.packageManager')">
      <USelect
        v-model="nodeData.data.packageManager"
        :items="packageManagerOptions"
        size="md"
        class="w-full"
      />
    </UFormField>

    <UFormField v-if="!nodeData.data.useExistingFile" :label="t('npmInstallProperties.packageJsonContent')">
      <ScriptEditor
        v-model="nodeData.data.script"
        :language="'json'"
        :langSelectionEnabled="false"
        class="w-full"
      />
      <template #help>
        {{ t('npmInstallProperties.packageJsonHelp') }}
      </template>
    </UFormField>
    <UAlert v-else color="warning" variant="soft" icon="i-lucide-info">
      <template #description>
        {{ t('npmInstallProperties.existingFileWarning') }}
      </template>
    </UAlert>

    <UFormField :label="t('npmInstallProperties.workingDirectory')">
      <UInput
        v-model="nodeData.data.workingDirectory"
        type="text"
        size="md"
        class="w-full"
        placeholder="./"
      />
    </UFormField>

    <UFormField :label="t('npmInstallProperties.additionalArguments')">
      <UInput
        v-model="nodeData.data.installArgs"
        type="text"
        size="md"
        class="w-full"
        :placeholder="t('npmInstallProperties.additionalArgumentsPlaceholder')"
      />
      <template #help>
        {{ t('npmInstallProperties.additionalArgumentsHelp') }}
      </template>
    </UFormField>

    <UFormField :label="t('npmInstallProperties.timeout')">
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

const { t } = useI18n()

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
