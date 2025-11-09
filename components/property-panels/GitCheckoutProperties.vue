<template>
  <div class="space-y-4">
    <UFormField label="Repository URL">
      <UInput
        v-model="nodeData.data.repositoryUrl"
        type="text"
        size="sm"
        class="font-mono w-full"
        placeholder="https://github.com/user/repo.git"
        
      />
      <template #help>
        Supports credential variables
      </template>
    </UFormField>

    <UFormField label="Branch/Tag/Commit">
      <UInput
        v-model="nodeData.data.branch"
        type="text"
        size="sm"
        placeholder="main"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Checkout Directory">
      <UInput
        v-model="nodeData.data.checkoutDirectory"
        type="text"
        size="sm"
        placeholder="./"
        class="w-full"
      />
      <template #help>
        Directory will be created if it doesn't exist
      </template>
    </UFormField>

    <UCheckbox
      v-model="nodeData.data.shallowClone"
      label="Shallow clone (depth=1, faster for large repos)"
    />

    <UCheckbox
      v-model="nodeData.data.cleanCheckout"
      label="Clean checkout (remove directory if exists)"
    />

    <UFormField label="Timeout (seconds)" help="Maximum time to wait for git operations to complete">
      <UInput
        v-model.number="nodeData.data.timeout"
        type="number"
        size="sm"
      />
    </UFormField>
  </div>
</template>

<script setup>
defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})
</script>
