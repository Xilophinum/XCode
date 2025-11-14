<script setup>
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  id: {
    type: String,
    required: true
  },
  class: {
    type: String,
    default: ''
  }
})

const { isDark: dark } = useDarkMode()

// Calculate dimensions based on sockets
const inputSocketsCount = computed(() => props.data.inputSockets?.length || 0)
const hasExecutionInput = computed(() => props.data.hasExecutionInput)
const hasExecutionOutput = computed(() => props.data.hasExecutionOutput)
const hasDataOutput = computed(() => props.data.hasDataOutput)
const outputSockets = computed(() => props.data.outputSockets || [])

const baseHeight = 60
const minHeightForInputs = computed(() =>
  inputSocketsCount.value > 0 ? 120 + (inputSocketsCount.value * 25) : baseHeight
)
const outputSocketSpace = computed(() =>
  outputSockets.value.length > 0 ? (outputSockets.value.length * 25) + 40 : 0
)
const totalHeight = computed(() =>
  Math.max(baseHeight, minHeightForInputs.value, outputSocketSpace.value)
)
const totalOutputs = computed(() =>
  (hasExecutionOutput.value ? 1 : 0) +
  (hasDataOutput.value ? 1 : 0) +
  outputSockets.value.length
)

// Calculate socket positions
const executionInputY = computed(() => {
  if (!hasExecutionInput.value) return 0
  const inputSocketsEndY = totalHeight.value - 20
  const inputSocketsStartY = inputSocketsCount.value > 0
    ? inputSocketsEndY - ((inputSocketsCount.value - 1) * 25)
    : totalHeight.value
  return inputSocketsCount.value > 0
    ? Math.max(30, inputSocketsStartY - 40)
    : totalHeight.value / 2
})

// Get socket color based on node type and socket
const getSocketColor = (socket) => {
  if (props.data.nodeType === 'conditional') {
    return socket.id === 'true' ? '#10b981' : '#ef4444'
  } else if (['bash', 'sh', 'powershell', 'cmd', 'python', 'node', 'python3', 'go', 'ruby', 'php', 'java', 'rust', 'perl', 'npm-install', 'pip-install', 'go-mod', 'bundle-install', 'composer-install', 'cargo-build', 'git-checkout', 'parallel_branches', ].includes(props.data.nodeType)) {
    if (socket.id === 'success') return '#10b981'
    else if (socket.id === 'failure') return '#ef4444'
    else if (socket.id === 'output') return '#3b82f6'
    else if (socket.id === 'iteration') return '#8b5cf6'
    else return '#8b5cf6'
  }
  return '#8b5cf6' // Default purple
}

const showContextMenu = computed(() => {
  if (typeof window !== 'undefined') {
    return /\/build\/\d+$/.test(window.location.pathname)
  }
  return false
})

const contextItems = [
  {
    label: 'Retry from here',
    onClick: async () => {
      const route = useRoute()
      const projectsStore = useProjectsStore()
      
      // Parse path segments to get project path and build number
      const pathSegments = Array.isArray(route.params.path) ? route.params.path : [route.params.path]
      const buildNumber = route.params.buildNumber
      console.log('Project Path:', pathSegments, 'Build Number:', buildNumber)
      const project = projectsStore.getItemByFullPath(pathSegments)
      console.log('Project:', project)
      
      if (!project?.id || !buildNumber) {
        console.error('Missing project or build number')
        return
      }
      
      try {
        // Get build data first
        const res = await $fetch(`/api/projects/${project.id}/builds/${buildNumber}`)
        if (!res.success) {
          console.error('Failed to fetch build data')
          return
        }
        // Use existing execute endpoint with startNodeId
        await $fetch('/api/projects/execute', {
          method: 'POST',
          body: {
            projectId: project.id,
            nodes: res.build.nodes,
            edges: res.build.edges,
            buildNumber: parseInt(buildNumber),
            startNodeId: props.id,
            projectName: project.name
          }
        })
        
        console.log(`Retrying build from node: ${props.data.label}`)
      } catch (error) {
        console.error('Failed to retry from node:', error)
      }
    },
    icon: 'i-lucide-refresh-cw'
  }
]
</script>

<template>
  <UContextMenu
    v-if="showContextMenu"
    :items="contextItems"
  >
    <div
      :class="`px-4 py-2 shadow-md rounded-md border-2 bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 relative ${props.class}`"
      :style="{
        backgroundColor: data.color || (dark ? '#404040' : '#ffffff'),
        color: data.textColor || (dark ? '#f5f5f5' : '#000000'),
        minWidth: '160px',
        minHeight: `${totalHeight}px`
      }"
    >
      <!-- Execution Input Handle -->
      <Handle
        v-if="hasExecutionInput"
        type="target"
        :position="Position.Left"
        id="execution"
        :style="{
          background: dark ? '#737373' : '#555',
          left: '-6px',
          top: `${executionInputY}px`,
          transform: 'translateY(-50%)'
        }"
      />

      <!-- Dynamic Input Sockets -->
      <template v-if="data.inputSockets && data.inputSockets.length > 0">
        <template v-for="(socket, index) in data.inputSockets" :key="`input-${socket.id}`">
          <Handle
            type="target"
            :position="Position.Left"
            :id="socket.id"
            :style="{
              background: '#3b82f6',
              left: '-6px',
              top: `${totalHeight - 20 - ((data.inputSockets.length - 1 - index) * 25)}px`,
              transform: 'none',
              borderRadius: '3px',
              width: '10px',
              height: '10px'
            }"
          />
          <div
            :style="{
              position: 'absolute',
              left: '8px',
              top: `${totalHeight - 20 - ((data.inputSockets.length - 1 - index) * 25)}px`,
              transform: 'translateY(-50%)',
              fontSize: '10px',
              color: dark ? '#d1d5db' : '#374151',
              pointerEvents: 'none',
              whiteSpace: 'nowrap'
            }"
          >
            {{ socket.label }}
          </div>
        </template>
      </template>

      <!-- Node Content -->
      <div class="text-center relative z-10 py-2">
        <div class="font-bold text-sm text-neutral-900 dark:text-neutral-100">{{ data.label }}</div>
        <div
          v-if="data.nodeType === 'number' && data.value !== undefined"
          class="text-xs text-neutral-600 dark:text-neutral-400 mt-1 truncate w-48"
        >
          Value: {{ data.value }}
        </div>
        <div
          v-if="data.nodeType?.includes('-param') && data.defaultValue !== undefined"
          class="text-xs text-neutral-600 dark:text-neutral-400 mt-1 truncate w-48"
        >
          {{ data.defaultValue }}
        </div>
      </div>

      <!-- Execution Output Handle -->
      <Handle
        v-if="hasExecutionOutput"
        type="source"
        :position="Position.Right"
        id="execution"
        :style="{
          background: dark ? '#737373' : '#555',
          right: '-6px',
          top: totalOutputs === 1 ? '50%' : `${20}px`,
          transform: totalOutputs === 1 ? 'translateY(-50%)' : 'none'
        }"
      />

      <!-- Data Output Handle -->
      <Handle
        v-if="hasDataOutput && outputSockets.length === 0"
        type="source"
        :position="Position.Right"
        id="data"
        :style="{
          background: '#10b981',
          right: '-6px',
          top: totalOutputs === 1 ? '50%' : `${20 + (hasExecutionOutput ? 25 : 0)}px`,
          transform: totalOutputs === 1 ? 'translateY(-50%)' : 'none',
          borderRadius: '3px',
          width: '10px',
          height: '10px'
        }"
      />

      <!-- Output Sockets -->
      <template v-for="(socket, index) in outputSockets" :key="`output-${socket.id}`">
        <Handle
          type="source"
          :position="Position.Right"
          :id="socket.id"
          :style="{
            background: getSocketColor(socket),
            right: '-6px',
            top: totalOutputs === 1 ? '50%' : `${totalHeight - 20 - (index * 25)}px`,
            transform: totalOutputs === 1 ? 'translateY(-50%)' : 'none',
            borderRadius: '3px',
            width: '10px',
            height: '10px'
          }"
        />
        <div
          :style="{
            position: 'absolute',
            right: '8px',
            top: totalOutputs === 1 ? '50%' : `${totalHeight - 20 - (index * 25)}px`,
            transform: 'translateY(-50%)',
            fontSize: '10px',
            color: dark ? '#d1d5db' : '#374151',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }"
        >
          {{ socket.label }}
        </div>
      </template>
    </div>
  </UContextMenu>
  <div
    v-else
    :class="`px-4 py-2 shadow-md rounded-md border-2 bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 relative ${props.class}`"
    :style="{
      backgroundColor: data.color || (dark ? '#404040' : '#ffffff'),
      color: data.textColor || (dark ? '#f5f5f5' : '#000000'),
      minWidth: '160px',
      minHeight: `${totalHeight}px`
    }"
  >
    <!-- Same content as above but without context menu -->
    <!-- Execution Input Handle -->
    <Handle
      v-if="hasExecutionInput"
      type="target"
      :position="Position.Left"
      id="execution"
      :style="{
        background: dark ? '#737373' : '#555',
        left: '-6px',
        top: `${executionInputY}px`,
        transform: 'translateY(-50%)'
      }"
    />

    <!-- Dynamic Input Sockets -->
    <template v-if="data.inputSockets && data.inputSockets.length > 0">
      <template v-for="(socket, index) in data.inputSockets" :key="`input-${socket.id}`">
        <Handle
          type="target"
          :position="Position.Left"
          :id="socket.id"
          :style="{
            background: '#3b82f6',
            left: '-6px',
            top: `${totalHeight - 20 - ((data.inputSockets.length - 1 - index) * 25)}px`,
            transform: 'none',
            borderRadius: '3px',
            width: '10px',
            height: '10px'
          }"
        />
        <div
          :style="{
            position: 'absolute',
            left: '8px',
            top: `${totalHeight - 20 - ((data.inputSockets.length - 1 - index) * 25)}px`,
            transform: 'translateY(-50%)',
            fontSize: '10px',
            color: dark ? '#d1d5db' : '#374151',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }"
        >
          {{ socket.label }}
        </div>
      </template>
    </template>

    <!-- Node Content -->
    <div class="text-center relative z-10 py-2">
      <div class="font-bold text-sm text-neutral-900 dark:text-neutral-100">{{ data.label }}</div>
      <div
        v-if="data.nodeType === 'number' && data.value !== undefined"
        class="text-xs text-neutral-600 dark:text-neutral-400 mt-1 truncate w-48"
      >
        Value: {{ data.value }}
      </div>
      <div
        v-if="data.nodeType?.includes('-param') && data.defaultValue !== undefined"
        class="text-xs text-neutral-600 dark:text-neutral-400 mt-1 truncate w-48"
      >
        {{ data.defaultValue }}
      </div>
    </div>

    <!-- Execution Output Handle -->
    <Handle
      v-if="hasExecutionOutput"
      type="source"
      :position="Position.Right"
      id="execution"
      :style="{
        background: dark ? '#737373' : '#555',
        right: '-6px',
        top: totalOutputs === 1 ? '50%' : `${20}px`,
        transform: totalOutputs === 1 ? 'translateY(-50%)' : 'none'
      }"
    />

    <!-- Data Output Handle -->
    <Handle
      v-if="hasDataOutput && outputSockets.length === 0"
      type="source"
      :position="Position.Right"
      id="data"
      :style="{
        background: '#10b981',
        right: '-6px',
        top: totalOutputs === 1 ? '50%' : `${20 + (hasExecutionOutput ? 25 : 0)}px`,
        transform: totalOutputs === 1 ? 'translateY(-50%)' : 'none',
        borderRadius: '3px',
        width: '10px',
        height: '10px'
      }"
    />

    <!-- Output Sockets -->
    <template v-for="(socket, index) in outputSockets" :key="`output-${socket.id}`">
      <Handle
        type="source"
        :position="Position.Right"
        :id="socket.id"
        :style="{
          background: getSocketColor(socket),
          right: '-6px',
          top: totalOutputs === 1 ? '50%' : `${totalHeight - 20 - (index * 25)}px`,
          transform: totalOutputs === 1 ? 'translateY(-50%)' : 'none',
          borderRadius: '3px',
          width: '10px',
          height: '10px'
        }"
      />
      <div
        :style="{
          position: 'absolute',
          right: '8px',
          top: totalOutputs === 1 ? '50%' : `${totalHeight - 20 - (index * 25)}px`,
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: dark ? '#d1d5db' : '#374151',
          pointerEvents: 'none',
          whiteSpace: 'nowrap'
        }"
      >
        {{ socket.label }}
      </div>
    </template>
  </div>
</template>
