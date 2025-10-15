<template>
  <div>
    <!-- Execution Type -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Execution Type</label>
      <select
        v-model="nodeData.data.executionType"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
        <option value="bash">Bash</option>
        <option value="powershell">PowerShell</option>
        <option value="cmd">CMD</option>
        <option value="python">Python</option>
        <option value="node">Node.js</option>
      </select>
    </div>

    <!-- Script Editor -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Script</label>
      <textarea
        v-model="nodeData.data.script"
        rows="10"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
        :placeholder="getPlaceholder()"
      ></textarea>
    </div>

    <!-- Working Directory -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Working Directory</label>
      <input
        v-model="nodeData.data.workingDirectory"
        type="text"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
        placeholder="."
      >
    </div>

    <!-- Timeout -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        Timeout (seconds)
      </label>
      <input
        v-model.number="nodeData.data.timeout"
        type="number"
        min="1"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
    </div>

    <!-- Info Box -->
    <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div class="flex items-start gap-2">
        <span class="text-blue-600 dark:text-blue-400 text-lg">ℹ️</span>
        <div class="text-sm text-blue-800 dark:text-blue-200">
          <p class="font-semibold mb-1">Parallel Execution Node</p>
          <p>This node is designed to be connected to a Parallel Branches node. It has no output sockets - all results are sent back to the parent parallel node.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  nodeData: { type: Object, required: true }
})

const getPlaceholder = () => {
  const placeholders = {
    bash: 'echo "Hello from Bash"\nls -la',
    powershell: 'Write-Host "Hello from PowerShell"\nGet-ChildItem',
    cmd: 'echo Hello from CMD\ndir',
    python: 'print("Hello from Python")\nimport os\nprint(os.listdir("."))',
    node: 'console.log("Hello from Node.js");\nconst fs = require("fs");'
  }
  return placeholders[props.nodeData.data.executionType] || ''
}

const addInputSocket = () => {
  if (!props.nodeData.data.inputSockets) {
    props.nodeData.data.inputSockets = []
  }
  const socketIndex = props.nodeData.data.inputSockets.length + 1
  props.nodeData.data.inputSockets.push({
    id: `input_${socketIndex}`,
    label: `Input ${socketIndex}`,
    connected: false
  })
}

const removeInputSocket = (index) => {
  props.nodeData.data.inputSockets.splice(index, 1)
}
</script>
