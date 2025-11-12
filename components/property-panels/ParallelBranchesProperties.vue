<template>
  <div>
    <!-- Branches Configuration -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{{ $t('parallelBranchesProperties.branches') }}</label>

      <div class="space-y-2">
        <div v-for="(branch, index) in nodeData.data.branches" :key="branch.id" class="flex items-center gap-2">
          <UInput
            v-model="branch.name"
            @input="updateBranchSockets"
            :placeholder="$t('parallelBranchesProperties.branchNamePlaceholder')"
            size="sm"
            class="flex-1"
          />
          <UButton
            v-if="nodeData.data.branches.length > 1"
            @click="removeBranch(index)"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            class="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
          />
        </div>
      </div>

      <UButton
        @click="addBranch"
        variant="outline"
        size="sm"
        block
        icon="i-lucide-plus"
        class="mt-2 border-dashed"
      >
        {{ $t('parallelBranchesProperties.addBranch') }}
      </UButton>

      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        {{ $t('parallelBranchesProperties.branchesHelp') }}
      </p>
    </div>

    <!-- Execution Settings -->
    <div class="mb-4">
      <UFormField :label="$t('parallelBranchesProperties.maxConcurrentBranches')" size="sm">
        <UInput
          v-model.number="nodeData.data.maxConcurrency"
          type="number"
          min="1"
          :placeholder="$t('parallelBranchesProperties.unlimitedPlaceholder')"
          size="sm"
        />
        <template #help>
          {{ $t('parallelBranchesProperties.maxConcurrencyHelp') }}
        </template>
      </UFormField>
    </div>

    <!-- Fail Fast -->
    <div class="mb-4">
      <UCheckbox
        v-model="nodeData.data.failFast"
        :label="$t('parallelBranchesProperties.failFast')"
      />
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400 ml-6">
        {{ $t('parallelBranchesProperties.failFastHelp') }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue'
const props = defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})

// Add a new branch
const addBranch = () => {
  const branchIndex = props.nodeData.data.branches.length + 1
  const branchId = `branch_${branchIndex}`

  props.nodeData.data.branches.push({
    id: branchId,
    name: `${$t('parallelBranchesProperties.branch')} ${branchIndex}`
  })

  updateBranchSockets()
}

// Remove a branch
const removeBranch = (index) => {
  const branch = props.nodeData.data.branches[index]

  // Remove the branch
  props.nodeData.data.branches.splice(index, 1)

  // Update sockets
  updateBranchSockets()
}

// Update output sockets based on branches
const updateBranchSockets = () => {
  const newSockets = [
    { id: 'success', label: $t('parallelBranchesProperties.allSuccess'), connected: false },
    { id: 'failure', label: $t('parallelBranchesProperties.anyFailure'), connected: false },
    { id: 'output', label: $t('parallelBranchesProperties.output'), connected: false }
  ]

  props.nodeData.data.branches.forEach(branch => {
    newSockets.push({
      id: branch.id,
      label: branch.name,
      connected: false
    })
  })

  props.nodeData.data.outputSockets = newSockets
}

// Watch for branch name changes
watch(() => props.nodeData.data.branches, () => {
  updateBranchSockets()
}, { deep: true })
</script>
