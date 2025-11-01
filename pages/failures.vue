<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950" @click="closeAllMenus">
    <!-- Navigation -->
    <AppNavigation />

    <!-- Main Content -->
    <main class="max-w-8xl mx-auto py-4 sm:px-6 lg:px-8">
      <div class="px-4 sm:px-0">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-gray-950 dark:text-white">Failed Projects</h2>
              <p class="text-gray-600 dark:text-gray-300">Projects where the latest build failed</p>
            </div>

            <!-- Auto-refresh and Manual Refresh Controls -->
            <div class="flex items-center space-x-4">
              <!-- Auto-refresh Status -->
              <div class="flex items-center space-x-2">
                <div :class="[
                  'w-2 h-2 rounded-full',
                  autoRefreshEnabled ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                ]"></div>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ autoRefreshEnabled ? 'Live updates ON' : 'Live updates OFF' }}
                </span>
              </div>
              
              <!-- Auto-refresh Toggle -->
              <button
                @click="toggleAutoRefresh"
                :class="[
                  'inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md',
                  autoRefreshEnabled
                    ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100 dark:border-green-600 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700'
                ]"
              >
                <Icon name="zap" class="w-4 h-4 mr-2" />
                {{ autoRefreshEnabled ? 'Disable Live' : 'Enable Live' }}
              </button>
              
              <!-- Manual Refresh Button -->
              <button
                @click="loadFailedBuilds"
                :disabled="isLoading"
                v-show="!autoRefreshEnabled"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Icon name="refreshCw" class="w-4 h-4 mr-2" :class="{ 'animate-spin': isLoading }" />
                Refresh Now
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Bar -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-md flex items-center justify-center">
                    <Icon name="close" class="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Projects with Failures</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ failedBuilds.length }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center">
                    <Icon name="clock" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Last Updated</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ formatLastUpdated() }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading && failedBuilds.length === 0" class="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p class="mt-4 text-gray-600 dark:text-gray-300">Loading failed builds...</p>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!isLoading && failedBuilds.length === 0" class="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
          <div class="text-center">
            <Icon name="checkCircle" class="mx-auto h-12 w-12 text-green-400" />
            <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">All Projects Passing!</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Excellent! All projects' latest builds are successful.
            </p>
          </div>
        </div>

        <!-- Failed Builds List -->
        <div v-else class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project & Build
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Agent
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Trigger
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Failed At
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Error
                  </th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr
                  v-for="build in failedBuilds"
                  :key="`${build.projectId}-${build.buildNumber}`"
                  class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <!-- Project & Build -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div>
                        <div class="text-sm font-medium text-gray-900 dark:text-white">
                          {{ build.projectName }}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">
                          Build #{{ build.buildNumber }}
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Agent -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900 dark:text-white">
                      {{ build.agentName || 'Unknown' }}
                    </div>
                  </td>

                  <!-- Trigger -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      :class="getTriggerBadgeClass(build.trigger)"
                    >
                      {{ build.trigger }}
                    </span>
                  </td>

                  <!-- Failed At -->
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {{ formatTimestamp(build.finishedAt || build.startedAt) }}
                  </td>

                  <!-- Error -->
                  <td class="px-6 py-4">
                    <div class="text-sm text-red-600 dark:text-red-400 max-w-xs truncate" v-tooltip="getErrorMessage(build)">
                      {{ getErrorMessage(build) }}
                    </div>
                  </td>

                  <!-- Actions -->
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex items-center justify-end space-x-2">
                      <!-- View Logs Button -->
                      <button
                        @click="showLogsModal(build)"
                        class="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        v-tooltip="'View last logs'"
                      >
                        <Icon name="fileText" class="w-5 h-5" />
                      </button>

                      <!-- Go to Build Button -->
                      <NuxtLink
                        :to="getBuildUrl(build)"
                        class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        v-tooltip="'Go to build'"
                      >
                        <Icon name="externalLink" class="w-5 h-5" />
                      </NuxtLink>

                      <!-- Rebuild Button -->
                      <button
                        @click="rebuildProject(build)"
                        :disabled="rebuildingProjects.has(build.projectId)"
                        class="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        v-tooltip:left="'Rebuild project'"
                      >
                        <Icon
                          name="refreshCw"
                          class="w-5 h-5"
                          :class="{ 'animate-spin': rebuildingProjects.has(build.projectId) }"
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </main>

    <!-- Logs Modal -->
    <div v-if="showLogsModalState" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeLogsModal">
      <div class="relative top-20 mx-auto p-5 border w-[90%] max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800" @click.stop>
        <div class="mt-3">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-medium text-gray-950 dark:text-white">
                {{ selectedBuild?.projectName }} - Build #{{ selectedBuild?.buildNumber }}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Last {{ selectedBuild?.lastLogLines?.length || 0 }} log lines
              </p>
            </div>
            <button
              @click="closeLogsModal"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <Icon name="close" class="w-6 h-6" />
            </button>
          </div>

          <!-- Error Message -->
          <div v-if="selectedBuild?.error" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div class="flex">
              <div class="flex-shrink-0">
                <Icon name="alertCircle" class="h-5 w-5 text-red-400" />
              </div>
              <div class="ml-3 flex-1 min-w-0">
                <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <div class="mt-2 text-sm text-red-700 dark:text-red-300 break-words whitespace-pre-wrap">
                  {{ selectedBuild.error }}
                </div>
              </div>
            </div>
          </div>

          <!-- Logs -->
          <div class="bg-gray-900 rounded-md p-4 font-mono text-xs text-green-400 max-h-[60vh] overflow-y-auto">
            <div v-if="selectedBuild?.lastLogLines && selectedBuild.lastLogLines.length > 0">
              <div v-for="(log, index) in selectedBuild.lastLogLines" :key="index" class="mb-1">
                <span class="text-gray-500">{{ formatLogTimestamp(log.timestamp) }}</span>
                <span class="ml-2" :class="getLogLevelClass(log.level)">[{{ log.level.toUpperCase() }}]</span>
                <span v-if="log.source" class="ml-2 text-blue-400">[{{ log.source }}]</span>
                <span class="ml-2">{{ log.message }}</span>
              </div>
            </div>
            <div v-else class="text-gray-400 text-center py-8">
              No log entries available
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex justify-end space-x-3">
            <NuxtLink
              :to="getBuildUrl(selectedBuild)"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              View Full Build
            </NuxtLink>
            <button
              @click="rebuildProjectFromModal"
              :disabled="rebuildingProjects.has(selectedBuild?.projectId)"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="!rebuildingProjects.has(selectedBuild?.projectId)">
                Rebuild Project
              </span>
              <span v-else class="flex items-center">
                <Icon name="loader" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                Rebuilding...
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

import Icon from '~/components/Icon.vue'

const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const webSocketStore = useWebSocketStore()
const { success, error: notifyError } = useNotifications()
const route = useRoute()

// State
const isLoading = ref(false)
const failedBuilds = ref([])
const lastUpdated = ref(null)
const currentTime = ref(new Date())
const autoRefreshEnabled = ref(true)
const timeUpdateInterval = ref(null)

const showLogsModalState = ref(false)
const selectedBuild = ref(null)
const rebuildingProjects = ref(new Set())

// Functions
const loadFailedBuilds = async () => {
  isLoading.value = true
  try {
    const response = await $fetch('/api/builds/failed')

    failedBuilds.value = response.builds
    lastUpdated.value = new Date()
  } catch (error) {
    console.error('Error loading failed builds:', error)
  } finally {
    isLoading.value = false
  }
}

const formatLastUpdated = () => {
  if (!lastUpdated.value) return 'Never'
  const diffMs = currentTime.value - lastUpdated.value
  const diffSecs = Math.floor(diffMs / 1000)

  if (diffSecs < 10) return 'Just now'
  if (diffSecs < 60) return `${diffSecs}s ago`

  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m ago`

  return lastUpdated.value.toLocaleTimeString()
}

const startRealTimeUpdates = () => {
  // Update current time every second for live timestamps
  timeUpdateInterval.value = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
}

const stopRealTimeUpdates = () => {
  if (timeUpdateInterval.value) {
    clearInterval(timeUpdateInterval.value)
    timeUpdateInterval.value = null
  }
}

const toggleAutoRefresh = () => {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
}

// Handle WebSocket events for real-time updates
const handleBuildStatusUpdate = (message) => {
  const { type, projectId, status } = message
  
  // Only refresh if it's a build completion or failure
  if (type === 'job_complete' || type === 'job_error' || type === 'job_status_updated') {
    if (status === 'failed' || status === 'completed' || status === 'cancelled') {
      // Debounce multiple rapid updates
      if (refreshTimeout.value) {
        clearTimeout(refreshTimeout.value)
      }
      refreshTimeout.value = setTimeout(() => {
        if (autoRefreshEnabled.value) {
          loadFailedBuilds()
          lastUpdated.value = new Date()
        }
      }, 1000) // Wait 1 second before refreshing
    }
  }
}

// Handle custom build events
const handleBuildEvent = (event) => {
  const { type, status } = event.detail
  
  if (type === 'buildCompleted' || type === 'buildFailed') {
    if (refreshTimeout.value) {
      clearTimeout(refreshTimeout.value)
    }
    refreshTimeout.value = setTimeout(() => {
      if (autoRefreshEnabled.value) {
        loadFailedBuilds()
        lastUpdated.value = new Date()
      }
    }, 500)
  }
}

const refreshTimeout = ref(null)

const getErrorMessage = (build) => {
  // Try multiple sources for error information
  if (build.error && build.error.trim()) {
    return build.error
  }

  // Check if there's a non-zero exit code
  if (build.exitCode && build.exitCode !== 0) {
    return `Process exited with code ${build.exitCode}`
  }

  // Check last log lines for error messages
  if (build.lastLogLines && build.lastLogLines.length > 0) {
    const errorLogs = build.lastLogLines.filter(log => log.level === 'error')
    if (errorLogs.length > 0) {
      return errorLogs[errorLogs.length - 1].message
    }
    // Return last log line if no error level logs
    return build.lastLogLines[build.lastLogLines.length - 1].message
  }

  // Fallback
  return 'Build failed - see logs for details'
}

const showLogsModal = (build) => {
  selectedBuild.value = build
  showLogsModalState.value = true
}

const closeLogsModal = () => {
  showLogsModalState.value = false
  selectedBuild.value = null
}

const closeAllMenus = () => {
  // Close any open menus
}

const getBuildUrl = (build) => {
  if (!build) return '#'
  // Find the project to get its full path
  const project = projectsStore.allItems.find(item =>
    item.type === 'project' && item.id === build.projectId
  )

  if (project) {
    // Build the full path: path segments + project name + /build/ + buildNumber
    const fullPath = [...(project.path || []), project.name].join('/')
    return `/${fullPath}/build/${build.buildNumber}`
  }

  return `#`
}

const rebuildProject = async (build) => {
  const projectId = build.projectId

  if (rebuildingProjects.value.has(projectId)) {
    return // Already rebuilding this project
  }

  rebuildingProjects.value.add(projectId)

  try {
    // Get the project to fetch current workflow
    const project = projectsStore.allItems.find(item =>
      item.type === 'project' && item.id === build.projectId
    )

    if (!project) {
      throw new Error('Project not found')
    }

    // Parse the diagram data to get nodes and edges
    let nodes = []
    let edges = []

    if (project.diagramData) {
      try {
        const diagramData = typeof project.diagramData === 'string'
          ? JSON.parse(project.diagramData)
          : project.diagramData

        nodes = diagramData.nodes || []
        edges = diagramData.edges || []
      } catch (e) {
        throw new Error('Failed to parse project workflow data')
      }
    }

    if (nodes.length === 0) {
      throw new Error('Project has no workflow defined')
    }

    // Execute the project - this creates a NEW build (never retries the same build number)
    const response = await $fetch('/api/projects/execute', {
      method: 'POST',
      body: {
        projectId: build.projectId,
        nodes: nodes,
        edges: edges,
        trigger: 'manual', // Always use manual trigger for rebuilds
        message: `Rebuild after failed build #${build.buildNumber}`
      }
    })

    // Show success notification
    success(`Rebuild started successfully! New build #${response.buildNumber}`, {
      title: 'Build Started',
      actions: [{
        label: 'View Build',
        primary: true,
        handler: () => {
          const buildUrl = getBuildUrl({ ...build, buildNumber: response.buildNumber })
          if (buildUrl !== '#') {
            navigateTo(buildUrl)
          }
        }
      }]
    })

    // Reload the failures list (this project should fall off if the new build succeeds)
    await loadFailedBuilds()
  } catch (error) {
    console.error('Error rebuilding project:', error)
    notifyError(`Failed to rebuild project: ${error.message || error.data?.error || 'Unknown error'}`, {
      title: 'Rebuild Failed'
    })
  } finally {
    rebuildingProjects.value.delete(projectId)
  }
}

const rebuildProjectFromModal = () => {
  if (selectedBuild.value) {
    rebuildProject(selectedBuild.value)
  }
}

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp)
  const diffMs = currentTime.value - date
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  
  const diffMins = Math.floor(diffMs / (1000 * 60))
  if (diffMins > 0) return `${diffMins}m ago`
  
  return 'Just now'
}

const formatLogTimestamp = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString()
}

const getLogLevelClass = (level) => {
  switch (level?.toLowerCase()) {
    case 'error': return 'text-red-400'
    case 'warning': return 'text-yellow-400'
    case 'success': return 'text-green-400'
    case 'info': return 'text-blue-400'
    default: return 'text-gray-300'
  }
}

// Lifecycle
onMounted(async () => {
  // Load initial data
  if (!authStore.isAuthenticated) {
    await authStore.initializeAuth()
  }
  
  if (authStore.isAuthenticated) {
    await projectsStore.loadData()
    await loadFailedBuilds()
  }
  
  // Start real-time updates
  startRealTimeUpdates()
  
  // Connect to WebSocket if not already connected
  if (!webSocketStore.isConnected) {
    await webSocketStore.connect()
  }
  
  // Listen for build status updates via WebSocket
  if (webSocketStore.socket) {
    webSocketStore.socket.on('message', handleBuildStatusUpdate)
  }
  
  // Also listen for custom build events
  window.addEventListener('buildStatusChanged', handleBuildEvent)
})

onUnmounted(() => {
  stopRealTimeUpdates()
  
  // Clean up WebSocket listeners
  if (webSocketStore.socket) {
    webSocketStore.socket.off('message', handleBuildStatusUpdate)
  }
  
  // Clean up custom event listeners
  window.removeEventListener('buildStatusChanged', handleBuildEvent)
  
  // Clear any pending refresh timeout
  if (refreshTimeout.value) {
    clearTimeout(refreshTimeout.value)
  }
})

const getTriggerBadgeClass = (trigger) => {
  const classes = {
    manual: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    cron: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    webhook: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'job-trigger': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  }
  return classes[trigger] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
}
</script>
