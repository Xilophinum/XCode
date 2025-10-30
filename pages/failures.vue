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

            <!-- Refresh Button -->
            <div class="flex items-center space-x-4">
              <button
                @click="loadFailedBuilds"
                :disabled="isLoading"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <svg class="w-4 h-4 mr-2" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refresh
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
                    <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
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
                    <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
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
            <svg class="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
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
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                      </button>

                      <!-- Go to Build Button -->
                      <NuxtLink
                        :to="getBuildUrl(build)"
                        class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        v-tooltip="'Go to build'"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                      </NuxtLink>

                      <!-- Rebuild Button -->
                      <button
                        @click="rebuildProject(build)"
                        :disabled="rebuildingProjects.has(build.projectId)"
                        class="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        v-tooltip:left="'Rebuild project'"
                      >
                        <svg
                          class="w-5 h-5"
                          :class="{ 'animate-spin': rebuildingProjects.has(build.projectId) }"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
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
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Error Message -->
          <div v-if="selectedBuild?.error" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
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
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
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

const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const route = useRoute()

// State
const isLoading = ref(false)
const failedBuilds = ref([])
const lastUpdated = ref(null)

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
  const now = new Date()
  const diffMs = now - lastUpdated.value
  const diffSecs = Math.floor(diffMs / 1000)

  if (diffSecs < 10) return 'Just now'
  if (diffSecs < 60) return `${diffSecs}s ago`

  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m ago`

  return lastUpdated.value.toLocaleTimeString()
}

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
    alert(`Rebuild started successfully! New build #${response.buildNumber}`)

    // Reload the failures list (this project should fall off if the new build succeeds)
    await loadFailedBuilds()

    // Navigate to the new build
    const buildUrl = getBuildUrl({ ...build, buildNumber: response.buildNumber })
    if (buildUrl !== '#') {
      navigateTo(buildUrl)
    }
  } catch (error) {
    console.error('Error rebuilding project:', error)
    alert(`Failed to rebuild project: ${error.message || error.data?.error || 'Unknown error'}`)
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
  const now = new Date()
  const diffMs = now - date
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60))
    return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  } else {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }
}

const formatLogTimestamp = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}

const getTriggerBadgeClass = (trigger) => {
  const classes = {
    manual: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    cron: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    webhook: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'job-trigger': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  }
  return classes[trigger] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
}

const getLogLevelClass = (level) => {
  const classes = {
    error: 'text-red-400',
    warn: 'text-yellow-400',
    info: 'text-blue-400',
    debug: 'text-gray-400'
  }
  return classes[level] || 'text-green-400'
}

// Load data on mount
onMounted(async () => {
  if (!authStore.isAuthenticated) {
    await authStore.initializeAuth()
  }

  if (authStore.isAuthenticated) {
    await projectsStore.loadData()
    await loadFailedBuilds()
  }
})
</script>
