<template>
  <div>
    <!-- Branches Configuration -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Branches</label>

      <div class="space-y-2">
        <div v-for="(branch, index) in nodeData.data.branches" :key="branch.id" class="flex items-center gap-2 p-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-800">
          <input
            v-model="branch.name"
            @input="updateBranchSockets"
            type="text"
            class="flex-1 px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
            placeholder="Branch name"
          >
          <button
            v-if="nodeData.data.branches.length > 1"
            @click="removeBranch(index)"
            class="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded"
            v-tooltip="'Remove branch'"
          >
            ✕
          </button>
        </div>
      </div>

      <button
        @click="addBranch"
        class="mt-2 w-full px-3 py-2 text-sm border border-dashed border-neutral-400 dark:border-neutral-500 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-blue-500 dark:hover:border-blue-400"
      >
        + Add Branch
      </button>

      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Each branch creates an execution socket to connect parallel execution nodes
      </p>
    </div>

    <!-- Execution Settings -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Max Concurrent Branches</label>
      <input
        v-model.number="nodeData.data.maxConcurrency"
        type="number"
        min="1"
        placeholder="Unlimited"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Leave empty for unlimited parallel execution
      </p>
    </div>

    <!-- Fail Fast -->
    <div class="mb-4">
      <label class="flex items-center cursor-pointer">
        <input
          v-model="nodeData.data.failFast"
          type="checkbox"
          class="w-4 h-4 text-blue-600 border-neutral-300 dark:border-neutral-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600"
        >
        <span class="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Fail Fast</span>
      </label>
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400 ml-6">
        Stop all branches if any branch fails
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
    name: `Branch ${branchIndex}`
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
    { id: 'success', label: 'All Success', connected: false },
    { id: 'failure', label: 'Any Failure', connected: false },
    { id: 'output', label: 'Output', connected: false }
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
