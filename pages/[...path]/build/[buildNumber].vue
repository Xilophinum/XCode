<template>
  <div class="h-screen bg-neutral-50 dark:bg-neutral-900 overflow-hidden">
    <!-- Navigation -->
    <AppNavigation :breadcrumbs="breadcrumbSegments">
      <template #actions>
        <div v-if="isExecuting" class="flex items-center text-blue-600 dark:text-blue-400 mr-4">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Executing...
        </div>
        <NuxtLink 
          :to="`/${pathSegments.join('/')}/editor`"
          class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="mr-2">
            <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back to Editor
        </NuxtLink>
        <button
          v-if="isExecuting"
          @click="cancelExecution"
          class="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="mr-2">
            <path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
          </svg>
          Cancel Build
        </button>
      </template>
    </AppNavigation>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col" style="height: calc(100vh - 64px);">
      <!-- Build Graph -->
      <div class="flex-1 relative overflow-hidden">
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          :node-types="nodeTypes"
          :default-viewport="{ zoom: 0.8 }"
          :nodes-draggable="false"
          :nodes-connectable="false"
          :elements-selectable="false"
          :fit-view-on-init="true"
          :min-zoom="0.1"
          :max-zoom="2"
          :snap-to-grid="true"
          :snap-grid="[5, 5]"
          class="build-flow w-full h-full"
        >
          <Background 
            variant="lines" 
            :gap="[20, 20]"
            :size="1"
            :color="dark ? '#525252' : '#d1d5db'"
            :backgroundColor="dark ? '#171717' : '#f9fafb'"
          />
          <Controls />
        </VueFlow>
      </div>
      
      <!-- Terminal Panel -->
      <div 
        class="bg-gray-900 text-green-400 font-mono text-sm flex flex-col border-t border-gray-700 relative flex-shrink-0"
        :style="{ height: `${terminalHeight}px` }"
      >
        <!-- Resize Handle -->
        <div 
          class="absolute top-0 left-0 right-0 h-2 bg-gray-600 hover:bg-gray-500 cursor-row-resize z-10 -mt-1"
          @mousedown="startResize"
        ></div>
        
        <div class="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <span class="text-white font-semibold">Build #{{ buildNumber }} Output</span>
          <div class="flex items-center space-x-2">
            <button
              @click="clearTerminal"
              class="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
            >
              Clear
            </button>
          </div>
        </div>
        <div ref="terminalRef" class="flex-1 p-4 overflow-y-auto">
          <div v-for="(message, index) in terminalMessages" :key="index" class="mb-1">
            <span :class="getMessageClass(message.level)">{{ message.text }}</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const route = useRoute()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const webSocketStore = useWebSocketStore()
const { isDark: dark } = useDarkMode()
const logger = useLogger()

// Project data
const project = ref(null)
const nodes = ref([])
const edges = ref([])
const isJobRunningOnAgent = ref(false)
// Extract path and build number
const pathSegments = computed(() => {
  const segments = Array.isArray(route.params.path) ? route.params.path : [route.params.path]
  return segments.filter(Boolean)
})
const buildNumber = computed(() => route.params.buildNumber)

// Breadcrumb segments for navigation
const breadcrumbSegments = computed(() => {
  return [...pathSegments.value, 'build', buildNumber.value]
})

// Set page title and breadcrumbs
useHead({
  title: `Build #${buildNumber.value} - ${project.value?.name || 'Loading...'}`
})

definePageMeta({
  middleware: 'auth'
})

// Build state
const buildStatus = ref('Loading...')
const isExecuting = computed(() => {
  return webSocketStore.isProjectJobRunning(project.value?.id)
})

// Terminal state
const terminalRef = ref(null)
const terminalMessages = ref([])
const terminalHeight = ref(300)
const isResizing = ref(false)

// Execution functions
const clearTerminal = () => {
  terminalMessages.value = []
  if (project.value?.id) {
    webSocketStore.clearJobMessages(project.value.id)
  }
}

// Terminal resize functionality
const startResize = (event) => {
  isResizing.value = true
  const startY = event.clientY
  const startHeight = terminalHeight.value
  
  const handleMouseMove = (e) => {
    const deltaY = startY - e.clientY
    const newHeight = Math.max(150, Math.min(600, startHeight + deltaY))
    terminalHeight.value = newHeight
  }
  
  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const addTerminalMessage = (level, message, nodeLabel = null) => {
  const timestamp = new Date().toLocaleTimeString()
  const labelPrefix = nodeLabel ? `[${nodeLabel}] ` : ''
  terminalMessages.value.push({
    level,
    text: `[${timestamp}] ${labelPrefix}${message}`,
    timestamp: new Date()
  })

  // Auto-scroll to bottom
  nextTick(() => {
    if (terminalRef.value) {
      terminalRef.value.scrollTop = terminalRef.value.scrollHeight
    }
  })
}

const isSocketConnected = computed(() => webSocketStore.isConnected)

// Import shared CustomNode component
const CustomNodeComponent = resolveComponent('CustomNode')

// Register custom node type
const nodeTypes = {
  custom: markRaw(CustomNodeComponent)
}

// Node execution state tracking
const nodeExecutionStates = ref(new Map()) // nodeId -> { status: 'pending'|'executing'|'completed'|'failed', startTime, endTime, label }
const completedNodes = ref(new Set()) // Track which nodes have completed
const currentlyExecutingNodeId = ref(null) // Track which node is currently running

// Build stats integration
let currentBuildId = null

const finishBuild = async (status, message) => {
  if (!currentBuildId) return
  
  try {
    await $fetch(`/api/projects/${project.value.id}/builds/${currentBuildId}`, {
      method: 'PATCH',
      body: {
        status: status,
        message: message,
        nodesExecuted: nodes.value.length // Assume all nodes executed for now
      }
    })
    
    logger.info('Build finished:', currentBuildId, status)
    currentBuildId = null
  } catch (error) {
    logger.warn('Failed to finish build recording:', error)
  }
}

const addBuildLog = async (level, message, command = null) => {
  if (!currentBuildId) return logger.warn('Cannot add build log: currentBuildId is null');
  
  logger.info(`Adding build log: ${level} - ${message}`)
  try {
    await $fetch(`/api/projects/${project.value.id}/builds/${currentBuildId}/logs`, {
      method: 'PATCH',
      body: {
        type: 'log',
        level: level,
        message: message,
        command: command,
        source: 'system'
      }
    })
  } catch (error) {
    logger.warn('Failed to add build log:', error)
  }
}

// Legacy functions for backward compatibility
const recordBuildEvent = async (status, message, logs = []) => {
  if (status === 'failure' || status === 'cancelled') {
    await finishBuild(status === 'cancelled' ? 'cancelled' : 'failure', message)
  }
}

const recordTerminalLog = async (level, message, command = null) => {
  await addBuildLog(level, message, command)
}

const getMessageClass = (level) => {
  switch (level) {
    case 'error': return 'text-red-400'
    case 'warning': return 'text-yellow-400'
    case 'success': return 'text-green-400'
    case 'info': return 'text-blue-400'
    default: return 'text-gray-300'
  }
}

const cancelExecution = async () => {
  if (!project.value?.id) return
  
  try {
    const response = await $fetch(`/api/projects/${project.value.id}/builds/${buildNumber.value}/cancel`, {
      method: 'POST',
      body: {
        reason: 'Cancelled by user from build page'
      }
    })
    
    if (response.success) {
      addTerminalMessage('warning', 'Job cancellation sent to agent. Waiting for confirmation...', 'System')
    } else {
      addTerminalMessage('error', `Failed to cancel job: ${response.message || 'Unknown error'}`, 'System')
    }
  } catch (error) {
    addTerminalMessage('error', `Error cancelling job: ${error.message}`, 'System')
  }
}

// Load project and build data
const loadBuildData = async () => {
  try {
    if (!project.value) {
      throw new Error('Project not found')
    }

    // Load build data from API
    const buildData = await $fetch(`/api/projects/${project.value.id}/builds/${buildNumber.value}`)

    if (buildData.success) {
      const build = buildData.build
      buildStatus.value = build.status
      // Load graph from project
      if (project.value.diagramData) {
        const diagramData = project.value.diagramData
        nodes.value = JSON.parse(JSON.stringify(diagramData.nodes || []))
        edges.value = JSON.parse(JSON.stringify(diagramData.edges || []))
        // Apply visual states based on build execution
        applyBuildVisualStates()
      } else {
        logger.warn('No diagramData found in project')
      }
    } else {
      logger.error('Failed to load build data:', buildData)
    }
  } catch (error) {
    logger.error('Failed to load build data:', error)
    buildStatus.value = 'Error'
  }
}

// Note: Node execution state is now tracked server-side via executionStateManager
// The frontend loads state from the API instead of tracking it from log messages
// This function has been removed as it's no longer needed

// Load execution state from API
const loadExecutionState = async () => {
  if (!project.value?.id || !buildNumber.value) return

  try {
    const response = await $fetch(`/api/projects/${project.value.id}/builds/${buildNumber.value}/state`)

    if (response.success && response.nodeStates) {
      // Clear existing state
      nodeExecutionStates.value.clear()
      completedNodes.value.clear()
      currentlyExecutingNodeId.value = null

      // Load state into our tracking variables
      Object.entries(response.nodeStates).forEach(([nodeId, state]) => {
        nodeExecutionStates.value.set(nodeId, state)

        if (state.status === 'completed' || state.status === 'failed') {
          completedNodes.value.add(nodeId)
        }

        if (state.status === 'executing') {
          currentlyExecutingNodeId.value = nodeId
        }
      })

      // Apply visual states to all nodes
      updateNodeVisualStates()
    } else {
      logger.info('No execution state found for this build')
    }
  } catch (error) {
    logger.error('Failed to load execution state:', error)
  }
}

// Legacy method - now just calls loadExecutionState
const applyBuildVisualStates = async () => {
  await loadExecutionState()
}

const updateNodeVisualStates = () => {
  // Update node styles based on execution state
  nodes.value = nodes.value.map(node => {
    const state = nodeExecutionStates.value.get(node.id)
    let nodeClass = 'node-pending'

    if (state) {
      if (state.status === 'executing') {
        nodeClass = 'node-running'
      } else if (state.status === 'completed') {
        nodeClass = 'node-success'
      } else if (state.status === 'failed') {
        nodeClass = 'node-error'
      }
    }

    return {
      ...node,
      class: nodeClass
    }
  })

  // Apply classes to DOM elements with retry mechanism
  const applyDOMClasses = (attempt = 0) => {
    let appliedCount = 0
    
    nodes.value.forEach(node => {
      const nodeContainer = document.querySelector(`[data-id="${node.id}"]`)
      if (nodeContainer) {
        const nodeElement = nodeContainer.querySelector('.vue-flow__node > div')
        if (nodeElement) {
          nodeElement.classList.remove('node-pending', 'node-running', 'node-success', 'node-error')
          nodeElement.classList.add(node.class)
          appliedCount++
        }
      }
    })
    
    // If we didn't apply classes to all nodes and haven't tried too many times, retry
    if (appliedCount < nodes.value.length && attempt < 5) {
      setTimeout(() => applyDOMClasses(attempt + 1), 100)
    }
  }
  
  nextTick(() => {
    setTimeout(applyDOMClasses, 200)
  })

  // Update edge styles based on connected nodes
  edges.value = edges.value.map(edge => {
    const sourceState = nodeExecutionStates.value.get(edge.source)
    const targetState = nodeExecutionStates.value.get(edge.target)

    let strokeColor = '#9ca3af' // default gray
    let strokeWidth = 2
    let animated = false
    let edgeClass = 'edge-default'

    // Edge is active if source is completed and target is executing
    if (sourceState?.status === 'completed' && targetState?.status === 'executing') {
      strokeColor = '#3b82f6' // blue
      strokeWidth = 3
      animated = true
      edgeClass = 'edge-running'
    } else if (sourceState?.status === 'completed' && targetState?.status === 'completed') {
      strokeColor = '#10b981' // green
      strokeWidth = 2
      edgeClass = 'edge-success'
    } else if (sourceState?.status === 'failed' || targetState?.status === 'failed') {
      strokeColor = '#ef4444' // red
      strokeWidth = 2
      edgeClass = 'edge-error'
    } else if (sourceState?.status === 'executing' || targetState?.status === 'executing') {
      strokeColor = '#f59e0b' // orange
      strokeWidth = 2
      animated = true
      edgeClass = 'edge-pending'
    }

    return {
      ...edge,
      class: edgeClass,
      animated: animated,
      style: {
        ...edge.style,
        stroke: strokeColor,
        strokeWidth: `${strokeWidth}px`
      }
    }
  })
}


// Watch for job completion to finish build recording
watch(() => isJobRunningOnAgent.value, async (isRunning, wasRunning) => {
  // Detect when a job finishes (was running, now not running)
  if (wasRunning && !isRunning && currentBuildId) {
    logger.info('🏁 Job execution completed, finishing build...')
    
    // Check the last few messages to determine success/failure
    const messages = currentProjectJob.value?.messages || []
    const lastMessages = messages.slice(-5) // Look at last 5 messages
    
    let buildStatus = 'success'
    let buildMessage = 'Build completed successfully'
    
    // Check for error indicators in recent messages
    const hasError = lastMessages.some(msg => 
      msg.type === 'error' || 
      (msg.message && msg.message.toLowerCase().includes('error')) ||
      (msg.message && msg.message.toLowerCase().includes('failed'))
    )
    
    if (hasError) {
      buildStatus = 'failure'
      buildMessage = 'Build completed with errors'
    }
    
    await finishBuild(buildStatus, buildMessage)
    await addBuildLog('info', `Build finished with status: ${buildStatus}`)
  }
}, { immediate: false })


// Check current build status when page loads
const checkCurrentBuildStatus = async () => {
  if (!project.value?.id) return
  
  try {
    const response = await $fetch(`/api/projects/${project.value.id}/status`)
    if (response.isRunning && response.currentJob) {
      // Update WebSocket store with current job
      webSocketStore.currentJobs.set(project.value.id, {
        jobId: response.currentJob.jobId,
        buildNumber: response.currentJob.buildNumber,
        agentId: response.currentJob.agentId,
        status: response.currentJob.status,
        startTime: response.currentJob.startTime,
        nodeId: response.currentJob.nodeId,
        trigger: response.currentJob.trigger || 'unknown'
      })
      
      // Only load logs if we don't already have them in the WebSocket store
      const existingMessages = webSocketStore.getJobMessages(project.value.id)

      if (!existingMessages || existingMessages.length === 0) {
        // Load logs from build record (includes all parallel job outputs)
        const buildNumber = response.currentJob.buildNumber
        const logsResponse = await $fetch(`/api/projects/${project.value.id}/builds/${buildNumber}/logs`)

        if (logsResponse.success && logsResponse.logs?.length > 0) {
          logsResponse.logs.forEach(logEntry => {
            // source field now contains the nodeLabel
            const displayLabel = logEntry.source || 'Agent'

            webSocketStore.addJobMessage(
              project.value.id,
              displayLabel,
              logEntry.type || logEntry.level || 'info',
              logEntry.message,
              logEntry.value,
              logEntry.timestamp, // Preserve original timestamp
              logEntry.nanotime // Preserve nanotime for ordering
            )
          })
          // Load execution state from API (gets from memory for active builds)
          await loadExecutionState()
        } else {
          // Add status messages if no logs found
          webSocketStore.addJobMessage(project.value.id, 'System', 'info', `🔄 Restored running job: ${response.currentJob.jobId}`)
          webSocketStore.addJobMessage(project.value.id, 'System', 'info', `🤖 Agent: ${response.currentJob.agentId || 'Unknown'}`)
          webSocketStore.addJobMessage(project.value.id, 'System', 'info', `⏱️ Started: ${new Date(response.currentJob.startTime).toLocaleString()}`)
          webSocketStore.addJobMessage(project.value.id, 'System', 'info', 'Waiting for agent output...')
        }
      } else {
        logger.info(`Using ${existingMessages.length} existing messages from WebSocket store`)

        // Load execution state from API (will get from memory for active builds)
        await loadExecutionState()
      }
    }
  } catch (error) {
    logger.warn('Failed to check current build status:', error)
  }
}

// Listen for real-time node execution state changes
// Define handler at top level to avoid issues with Vue lifecycle hooks
const handleNodeStateChange = (event) => {
  const { projectId, buildNumber: eventBuildNumber, nodeId, status, nodeState } = event.detail

  // Convert buildNumber to number for comparison (route params are strings)
  const currentBuildNumber = parseInt(buildNumber.value)
  // Only process if it's for this build (use == for number/string comparison)
  if (projectId === project.value?.id && eventBuildNumber == currentBuildNumber) {
    // Update the node state in memory
    nodeExecutionStates.value.set(nodeId, nodeState)

    if (status === 'executing') {
      currentlyExecutingNodeId.value = nodeId
    } else if (status === 'completed' || status === 'failed') {
      completedNodes.value.add(nodeId)
      if (currentlyExecutingNodeId.value === nodeId) {
        currentlyExecutingNodeId.value = null
      }
    }

    // Update visual states immediately
    updateNodeVisualStates()
  } else {
    logger.warn(`❌ Event NOT for this build - ignoring (type check: event=${typeof eventBuildNumber}, current=${typeof currentBuildNumber})`)
  }
}

// Setup WebSocket for live updates
onMounted(async () => {
  // Register event listener immediately (before any async operations)
  window.addEventListener('nodeExecutionStateChanged', handleNodeStateChange)

  // Ensure authentication is initialized before loading data
  if (!authStore.isAuthenticated) {
    await authStore.initializeAuth()
  }

  // Only load data if authenticated
  if (authStore.isAuthenticated) {
    // Load projects first to ensure we have the project data
    await projectsStore.loadData()
  }

  // Load project using hierarchical approach
  const projectName = pathSegments.value[pathSegments.value.length - 1]
  const projectPath = pathSegments.value.slice(0, -1)
  project.value = projectsStore.getItemByFullPath([...projectPath, projectName])

  // Check if project exists
  if (!project.value) {
    await navigateTo('/')
    return
  }

  // Set current project
  projectsStore.setCurrentProject(project.value)

  // Load build data
  await loadBuildData()

  // Force WebSocket reconnection to ensure we get live updates
  if (!webSocketStore.isConnected) {
    logger.info('WebSocket not connected, connecting...')
    await webSocketStore.connect()
    // Wait a bit for connection to establish
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // Subscribe to WebSocket updates for this project
  const subscribed = await webSocketStore.subscribeToProject(project.value.id)
  if (!subscribed) {
    logger.warn(`Failed to subscribe to project ${project.value.id}, retrying in 2 seconds...`)
    setTimeout(() => {
      logger.info(`📡 Retrying subscription to project ${project.value.id}...`)
      webSocketStore.subscribeToProject(project.value.id)
    }, 2000)
  } else {
    logger.info(`✅ Successfully subscribed to project ${project.value.id}`)
  }

  // After subscribing, reload logs from database to catch any messages generated before subscription
  // This ensures we don't miss any early output that was broadcast before we were listening
  try {
    const logsResponse = await $fetch(`/api/projects/${project.value.id}/builds/${buildNumber.value}/logs`)
    if (logsResponse.success && logsResponse.logs?.length > 0) {
      // Clear WebSocket store messages for this project and reload from database
      webSocketStore.jobMessages.value.delete(project.value.id)

      logsResponse.logs.forEach(logEntry => {
        const displayLabel = logEntry.source || 'Agent'
        webSocketStore.addJobMessage(
          project.value.id,
          displayLabel,
          logEntry.type || logEntry.level || 'info',
          logEntry.message,
          logEntry.value,
          logEntry.timestamp,
          logEntry.nanotime
        )
      })
    }
  } catch (error) {
    logger.warn('Failed to reload logs after subscription:', error)
  }

  // Load existing terminal messages from WebSocket store
  const existingMessages = webSocketStore.getJobMessages(project.value.id)
  if (existingMessages && existingMessages.length > 0) {
    // Sort by nanotime before displaying
    const sortedMessages = [...existingMessages].sort((a, b) => {
      const aNano = a.nanotime || '0'
      const bNano = b.nanotime || '0'
      if (aNano.length !== bNano.length) {
        return aNano.length - bNano.length
      }
      return aNano < bNano ? -1 : aNano > bNano ? 1 : 0
    })
    
    terminalMessages.value = sortedMessages.map(msg => ({
      level: msg.level,
      text: `[${new Date(msg.timestamp).toLocaleTimeString()}] [${msg.nodeLabel}] ${msg.message}`,
      timestamp: new Date(msg.timestamp),
      nanotime: msg.nanotime
    }))
  } else {
    // If no messages in WebSocket store, load from database for historical builds
    try {
      const logsResponse = await $fetch(`/api/projects/${project.value.id}/builds/${buildNumber.value}/logs`)
      if (logsResponse.success && logsResponse.logs?.length > 0) {
        terminalMessages.value = logsResponse.logs.map(logEntry => ({
          level: logEntry.level || logEntry.type || 'info',
          text: `[${new Date(logEntry.timestamp).toLocaleTimeString()}] [${logEntry.source}] ${logEntry.message}`,
          timestamp: new Date(logEntry.timestamp)
        }))
      }
    } catch (error) {
      logger.warn('Failed to load historical build logs:', error)
    }
  }

  // Watch for new WebSocket messages
  watch(() => webSocketStore.getJobMessages(project.value.id), (newMessages) => {
    if (newMessages && newMessages.length > 0) {
      // Sort all messages by nanotime and rebuild terminal display
      const sortedMessages = [...newMessages].sort((a, b) => {
        const aNano = a.nanotime || '0'
        const bNano = b.nanotime || '0'
        if (aNano.length !== bNano.length) {
          return aNano.length - bNano.length
        }
        return aNano < bNano ? -1 : aNano > bNano ? 1 : 0
      })
      
      terminalMessages.value = sortedMessages.map(msg => ({
        level: msg.level,
        text: `[${new Date(msg.timestamp).toLocaleTimeString()}] [${msg.nodeLabel}] ${msg.message}`,
        timestamp: new Date(msg.timestamp),
        nanotime: msg.nanotime
      }))
      
      // Auto-scroll to bottom
      nextTick(() => {
        if (terminalRef.value) {
          terminalRef.value.scrollTop = terminalRef.value.scrollHeight
        }
      })

      // Node execution state is now tracked server-side via executionStateManager
      const latestMessage = sortedMessages[sortedMessages.length - 1]
      if (latestMessage.nodeLabel === 'System' && latestMessage.message?.includes('Job completed')) {
        // Reload execution state from API when job completes
        loadExecutionState()
      }
    }
  }, { deep: true })

  // Check if there's already a job running for this project
  // This will load messages from the database if needed
  await checkCurrentBuildStatus()

  // Load execution state (this will always be called to ensure state is loaded)
  await loadExecutionState()

  // Force visual update after everything is loaded
  setTimeout(() => {
    updateNodeVisualStates()
  }, 500)
})

// Clean up event listener and unsubscribe on unmount
onUnmounted(() => {
  window.removeEventListener('nodeExecutionStateChanged', handleNodeStateChange)
  if (project.value) {
    webSocketStore.unsubscribeFromProject(project.value.id)
  }
})
</script>

<style scoped>
.build-flow {
  background: #f8fafc;
}

.dark .build-flow {
  background: #1f2937;
}

/* Visual state classes */
:deep(.node-pending) {
  border-color: #6b7280 !important;
  border-radius: 8px !important;
}

:deep(.node-running) {
  border-color: #3b82f6 !important;
  animation: pulse 2s infinite;
  border-radius: 8px !important;
}

:deep(.node-success) {
  border-color: #10b981 !important;
  border-radius: 8px !important;
}

:deep(.node-error) {
  border-color: #ef4444 !important;
  border-radius: 8px !important;
}

.edge-pending {
  stroke: #6b7280;
  stroke-dasharray: 5,5;
  animation: dash 1s linear infinite;
}

.edge-running {
  stroke: #3b82f6;
  stroke-width: 3px;
  animation: flow 2s linear infinite;
  border-radius: 5px;
}

.edge-success {
  stroke: #10b981;
  stroke-width: 2px;
}

.edge-error {
  stroke: #ef4444;
  stroke-width: 2px;
  stroke-dasharray: 5,5;
}

.edge-default {
  stroke: #9ca3af;
  stroke-width: 1px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes dash {
  to { stroke-dashoffset: -10; }
}

@keyframes flow {
  0% { stroke-dasharray: 0, 20; }
  50% { stroke-dasharray: 10, 10; }
  100% { stroke-dasharray: 20, 0; }
}
</style>