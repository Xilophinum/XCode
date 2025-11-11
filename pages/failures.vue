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
              <h2 class="text-2xl font-bold text-gray-950 dark:text-white">{{ $t('failures.title') }}</h2>
              <p class="text-gray-600 dark:text-gray-300">{{ $t('failures.subtitle') }}</p>
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
                  {{ autoRefreshEnabled ? $t('failures.liveUpdatesOn') : $t('failures.liveUpdatesOff') }}
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
                <UIcon name="i-lucide-zap" class="w-4 h-4 mr-2" />
                {{ autoRefreshEnabled ? $t('failures.disableLive') : $t('failures.enableLive') }}
              </button>
              
              <!-- Manual Refresh Button -->
              <button
                @click="loadFailedBuilds"
                :disabled="isLoading"
                v-show="!autoRefreshEnabled"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-md text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <UIcon name="i-lucide-refresh-cw" class="w-4 h-4 mr-2" :class="{ 'animate-spin': isLoading }" />
                {{ $t('failures.refreshNow') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Bar -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <!-- Projects with Failures -->
          <UCard class="shadow-md">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <UIcon name="i-lucide-x-circle" class="w-8 h-8 text-red-500" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('failures.projectsWithFailures') }}</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ failedBuilds.length }}</p>
              </div>
            </div>
          </UCard>

          <!-- Last Updated -->
          <UCard class="shadow-md">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <UIcon name="i-lucide-clock" class="w-8 h-8 text-blue-500" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('failures.lastUpdated') }}</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ formatLastUpdated() }}</p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Loading State -->
        <UCard v-if="isLoading && failedBuilds.length === 0" class="shadow-md">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p class="mt-4 text-gray-600 dark:text-gray-300">{{ $t('failures.loadingFailedBuilds') }}</p>
          </div>
        </UCard>

        <!-- Empty State -->
        <UCard v-else-if="!isLoading && failedBuilds.length === 0" class="shadow-md">
          <div class="text-center">
            <UIcon name="i-lucide-check-circle" class="mx-auto h-12 w-12 text-green-400" />
            <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ $t('failures.allProjectsPassing') }}</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ $t('failures.allProjectsPassingDesc') }}
            </p>
          </div>
        </UCard>

        <!-- Failed Builds List -->
        <UCard v-else class="shadow-md">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {{ $t('failures.projectAndBuild') }}
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {{ $t('failures.agent') }}
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {{ $t('failures.trigger') }}
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {{ $t('failures.failedAt') }}
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {{ $t('failures.error') }}
                  </th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {{ $t('failures.actions') }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr
                  v-for="build in failedBuilds"
                  :key="`${build.projectId}-${build.buildNumber}`"
                  class="hover:bg-gray-50 dark:hover:bg-neutral-700/50 transition-colors"
                >
                  <!-- Project & Build -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div>
                        <div class="text-sm font-medium text-gray-900 dark:text-white">
                          {{ build.projectName }}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">
                          {{ $t('failures.build') }} #{{ build.buildNumber }}
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Agent -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900 dark:text-white">
                      {{ build.agentName || $t('failures.unknown') }}
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
                   <UTooltip :text="new Date(build.finishedAt || build.startedAt).toLocaleString()">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {{ formatTimestamp(build.finishedAt || build.startedAt) }}
                    </td>
                  </UTooltip>

                  <!-- Error -->
                  <td class="px-6 py-4">
                    <UTooltip :text="getErrorMessage(build)">
                      <div class="text-sm text-red-600 dark:text-red-400 max-w-xs truncate">
                        {{ getErrorMessage(build) }}
                      </div>
                    </UTooltip>
                  </td>

                  <!-- Actions -->
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex items-center justify-end space-x-2">
                      <!-- View Logs Button -->
                      <UTooltip :text="$t('failures.viewLastLogs')">
                        <UButton
                          @click="showLogsModal(build)"
                          class="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          icon="i-lucide-file-text"
                          variant="link"
                        />
                      </UTooltip>
                      <!-- Go to Build Button -->
                      <UTooltip :text="$t('failures.goToBuild')">
                        <UButton
                          :to="getBuildUrl(build)"
                          color="neutral"
                          variant="link"
                          icon="i-lucide-external-link"
                        />
                      </UTooltip>

                      <!-- Rebuild Button -->
                      <UTooltip :text="$t('failures.rebuildProject')">
                        <UButton
                          @click="rebuildProject(build)"
                          variant="link"
                          icon="i-lucide-refresh-cw"
                        />
                      </UTooltip>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </main>

    <!-- Logs Modal -->
    <ModalWrapper :model-value="showLogsModalState" @update:model-value="closeLogsModal">
      <div class="m-4">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-medium text-gray-950 dark:text-white">
              {{ selectedBuild?.projectName }} - Build #{{ selectedBuild?.buildNumber }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {{ $t('failures.lastLogLines').replace('{count}', selectedBuild?.lastLogLines?.length || 0) }}
            </p>
          </div>
          <button
            @click="closeLogsModal"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <UIcon name="i-lucide-x" class="w-6 h-6" />
          </button>
        </div>

        <!-- Error Message -->
        <div v-if="selectedBuild?.error" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div class="flex">
            <div class="flex-shrink-0">
              <UIcon name="i-lucide-alert-circle" class="h-5 w-5 text-red-400" />
            </div>
            <div class="ml-3 flex-1 min-w-0">
              <h3 class="text-sm font-medium text-red-800 dark:text-red-200">{{ $t('failures.error') }}</h3>
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
            {{ $t('failures.noLogEntries') }}
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-6 flex justify-end space-x-3">
          <UButton
            :to="getBuildUrl(selectedBuild)"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            {{ $t('failures.viewFullBuild') }}
          </UButton>
          <UButton
            @click="rebuildProjectFromModal"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ $t('failures.rebuildProjectButton') }}
          </UButton>
        </div>
      </div>
    </ModalWrapper>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

import ModalWrapper from '~/components/ModalWrapper.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const toast = useToast()

// State
const isLoading = ref(false)
const failedBuilds = ref([])
const lastUpdated = ref(null)
const currentTime = ref(new Date())
const autoRefreshEnabled = ref(true)
const timeUpdateInterval = ref(null)
const failedBuildInterval = ref(null)

const showLogsModalState = ref(false)
const selectedBuild = ref(null)

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
  if (autoRefreshEnabled.value) return t('failures.liveUpdating')
  if (!lastUpdated.value) return t('failures.never')
  const diffMs = currentTime.value - lastUpdated.value
  const diffSecs = Math.floor(diffMs / 1000)

  if (diffSecs < 10) return t('failures.justNow')
  if (diffSecs < 60) return t('failures.secondsAgo').replace('{count}', diffSecs)

  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return t('failures.minutesAgo').replace('{count}', diffMins)

  return lastUpdated.value.toLocaleTimeString()
}

const startRealTimeUpdates = () => {
  // Update current time every second for live timestamps
  timeUpdateInterval.value = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
  failedBuildInterval.value = setInterval(async () => {
    if (autoRefreshEnabled.value) {
      await loadFailedBuilds()
    }
  }, 5000) // Refresh every 5 seconds
}

const stopRealTimeUpdates = () => {
  if (timeUpdateInterval.value) {
    clearInterval(timeUpdateInterval.value)
    timeUpdateInterval.value = null
  }
  if (failedBuildInterval.value) {
    clearInterval(failedBuildInterval.value)
    failedBuildInterval.value = null
  }
}

const toggleAutoRefresh = () => {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
}

const refreshTimeout = ref(null)

const getErrorMessage = (build) => {
  // Try multiple sources for error information
  if (build.error && build.error.trim()) {
    return build.error
  }

  // Check if there's a non-zero exit code
  if (build.exitCode && build.exitCode !== 0) {
    return t('failures.processExited').replace('{code}', build.exitCode)
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
  return t('failures.buildFailed')
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

  try {
    // Get the project to fetch current workflow
    const project = projectsStore.allItems.find(item =>
      item.type === 'project' && item.id === build.projectId
    )

    if (!project) {
      throw new Error(t('failures.projectNotFound'))
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
        throw new Error(t('failures.failedToParseWorkflow'))
      }
    }

    if (nodes.length === 0) {
      throw new Error(t('failures.noWorkflowDefined'))
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
    toast.add({
      title: t('failures.buildStarted'),
      description: t('failures.rebuildSuccess').replace('{buildNumber}', response.buildNumber),
      icon: 'i-lucide-check-circle',
      actions: [
        {
          label: t('failures.viewBuild'),
          color: 'primary',
          icon: 'i-lucide-external-link',
          onClick: () => {
            const buildUrl = getBuildUrl({ ...build, buildNumber: response.buildNumber })
            if (buildUrl !== '#') {
              navigateTo(buildUrl)
            }
          }
        }
      ]
    })
    // Reload the failures list (this project should fall off if the new build succeeds)
    await loadFailedBuilds()
  } catch (error) {
    console.error('Error rebuilding project:', error)
    toast.add({
      title: t('failures.rebuildFailed').replace('{error}', error.message || error.data?.error || t('failures.unknownError')),
      icon: 'i-lucide-x-circle'
    })
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
  const diffSecs = Math.floor(diffMs / 1000)
  
  if (diffSecs < 60) return diffSecs <= 1 ? t('failures.justNow') : t('failures.secondsAgo').replace('{count}', diffSecs)
  
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return t('failures.minutesAgo').replace('{count}', diffMins)
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return t('failures.hoursAgo').replace('{count}', diffHours)
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}${diffDays > 1 ? t('failures.daysAgo') : t('failures.dayAgo')}`
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
})

onUnmounted(() => {
  stopRealTimeUpdates()
  // Clear any pending refresh timeout
  if (refreshTimeout.value) {
    clearTimeout(refreshTimeout.value)
  }
  if (failedBuildInterval.value) {
    clearInterval(failedBuildInterval.value)
    failedBuildInterval.value = null
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
