<template>
  <div class="space-y-4">
    <UFormField :label="t('gitCheckoutProperties.repositoryUrl')">
      <UInput
        v-model="nodeData.data.repositoryUrl"
        type="text"
        size="sm"
        class="font-mono w-full"
        :placeholder="t('gitCheckoutProperties.repositoryUrlPlaceholder')"
        
      />
      <template #help>
        {{ t('gitCheckoutProperties.repositoryUrlHelp') }}
      </template>
    </UFormField>

    <UFormField :label="t('gitCheckoutProperties.branchTagCommit')">
      <UInput
        v-model="nodeData.data.branch"
        type="text"
        size="sm"
        :placeholder="t('gitCheckoutProperties.branchPlaceholder')"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="t('gitCheckoutProperties.checkoutDirectory')">
      <UInput
        v-model="nodeData.data.checkoutDirectory"
        type="text"
        size="sm"
        :placeholder="t('gitCheckoutProperties.checkoutDirectoryPlaceholder')"
        class="w-full"
      />
      <template #help>
        {{ t('gitCheckoutProperties.checkoutDirectoryHelp') }}
      </template>
    </UFormField>

    <UCheckbox
      v-model="nodeData.data.shallowClone"
      :label="t('gitCheckoutProperties.shallowClone')"
    />

    <UCheckbox
      v-model="nodeData.data.cleanCheckout"
      :label="t('gitCheckoutProperties.cleanCheckout')"
    />

    <UFormField :label="t('gitCheckoutProperties.timeout')" :help="t('gitCheckoutProperties.timeoutHelp')">
      <UInput
        v-model.number="nodeData.data.timeout"
        type="number"
        size="sm"
      />
    </UFormField>
  </div>
</template>

<script setup>
const { t } = useI18n()

defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})
</script>
