<template>
  <div class="min-h-screen bg-gray-50 dark:bg-neutral-900">
    <!-- Navigation -->
    <AppNavigation :breadcrumbs="pathSegments">
      <template #actions>
        <button
          @click="refreshBuilds"
          :disabled="loading"
          class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <svg class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
        
        <NuxtLink
          :to="`/${pathSegments.slice(0, -1).join('/')}/editor`"
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          Edit Project
        </NuxtLink>
      </template>
    </AppNavigation>

    <!-- Main Content -->
    <main class="max-w-8xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <!-- Header with Stats -->
      <div class="mb-8">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Build History</h1>
          <p class="text-gray-600 dark:text-gray-300">
            Build history and logs for {{ projectName }}
          </p>
        </div>

        <!-- Build Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8" v-if="buildStats">
          <div class="bg-white dark:bg-neutral-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Builds</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ buildStats.totalBuilds }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-neutral-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Success Rate</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">
                      {{ Math.round(buildStats.successRate * 100) }}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-neutral-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Avg Duration</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">
                      {{ buildStats.averageDuration ? formatDuration(buildStats.averageDuration) : 'N/A' }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-neutral-800 overflow-hidden shadow rounded-lg">
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
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Failed Builds</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ buildStats.failedBuilds }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-neutral-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Last Build</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">
                      {{ buildStats.lastBuildAt ? formatRelativeTime(buildStats.lastBuildAt) : 'Never' }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white dark:bg-neutral-800 shadow rounded-lg mb-6">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Filters</h3>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                v-model="filters.status"
                @change="applyFilters"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="cancelled">Cancelled</option>
                <option value="running">Running</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                v-model="filters.startDate"
                @change="applyFilters"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input
                v-model="filters.endDate"
                @change="applyFilters"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
            </div>
            
            <div class="flex items-end">
              <button
                @click="clearFilters"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Builds Table -->
      <div class="bg-white dark:bg-neutral-800 shadow overflow-hidden sm:rounded-md">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">Recent Builds</h3>
          
          <div v-if="loading" class="text-center py-8">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p class="mt-4 text-gray-500 dark:text-gray-400">Loading builds...</p>
          </div>

          <div v-else-if="!builds || builds.length === 0" class="text-center py-8">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No builds found</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ filters.status || filters.startDate || filters.endDate ? 'Try adjusting your filters.' : 'No builds have been executed yet.' }}
            </p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-neutral-700">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Build</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trigger</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agent</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Duration</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Started</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="build in (builds || [])" :key="build.id" class="hover:bg-gray-50 dark:hover:bg-neutral-700">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div class="text-sm font-medium text-gray-900 dark:text-white">
                        Build #{{ build.buildNumber }}
                      </div>
                      <div class="text-sm text-gray-500 dark:text-gray-400">
                        {{ build.message || 'No message' }}
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="getStatusBadgeClass(build.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                      <span :class="getStatusDotClass(build.status)" class="w-1.5 h-1.5 rounded-full mr-1.5"></span>
                      {{ build.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <span class="capitalize">{{ build.trigger }}</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {{ build.agentName || 'Local' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {{ build.duration ? formatDuration(build.duration) : 'N/A' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {{ formatRelativeTime(build.startedAt) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      @click="viewBuildLogs(build)"
                      class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="View build logs"
                    >
                      View Logs
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="pagination && pagination.totalPages > 1" class="mt-6 flex items-center justify-between">
            <div class="text-sm text-gray-700 dark:text-gray-300">
              Showing {{ (pagination.page - 1) * pagination.pageSize + 1 }} to 
              {{ Math.min(pagination.page * pagination.pageSize, pagination.totalCount) }} of 
              {{ pagination.totalCount }} results
            </div>
            <div class="flex space-x-2">
              <button
                @click="goToPage(pagination.page - 1)"
                :disabled="pagination.page <= 1"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                @click="goToPage(pagination.page + 1)"
                :disabled="pagination.page >= pagination.totalPages"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Build Logs Modal -->
    <div v-if="showLogsModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div class="mt-3">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              Build Logs - {{ selectedBuild?.id?.substring(0, 12) }}...
            </h3>
            <button
              @click="closeLogsModal"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div class="bg-gray-950 rounded-md p-4 max-h-96 overflow-y-auto">
            <div v-if="loadingLogs" class="text-center py-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p class="mt-2 text-gray-400">Loading logs...</p>
            </div>
            
            <div v-else-if="buildLogs.length === 0" class="text-center py-4 text-gray-400">
              No logs found for this build.
            </div>
            
            <div v-else class="space-y-1">
              <div v-for="log in buildLogs" :key="log.id" class="text-sm font-mono">
                <span class="text-neutral-500">{{ formatTimestamp(log.timestamp) }}</span>
                <span 
                  :class="{
                    'text-red-400': log.level === 'error',
                    'text-yellow-400': log.level === 'warn',
                    'text-green-400': log.level === 'success',
                    'text-blue-400': log.level === 'info',
                    'text-neutral-300': log.level === 'debug'
                  }"
                  class="ml-2"
                >
                  [{{ log.source }}]
                </span>
                <span class="text-neutral-300 ml-2">{{ log.message }}</span>
                <div v-if="log.output" class="mt-1 ml-4 text-cyan-400 whitespace-pre-wrap">{{ log.output }}</div>
              </div>
            </div>
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

const route = useRoute()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()

// Parse the path from route params
const pathSegments = computed(() => {
  if (!route.params.path) return []
  
  let segments = Array.isArray(route.params.path) ? route.params.path : [route.params.path]
  // Remove 'builds' from the end
  if (segments[segments.length - 1] === 'builds') {
    segments = segments.slice(0, -1)
  }
  
  return [...segments, 'builds'] // Add builds back for breadcrumb
})

// The project name is the last segment before 'builds'
const projectName = computed(() => {
  const segments = pathSegments.value
  if (segments.length > 1) {
    return segments[segments.length - 2]
  }
  return 'Unknown Project'
})

// The project path for finding the project
const projectPath = computed(() => {
  const segments = pathSegments.value.slice(0, -1) // Remove 'builds'
  return segments
})

// Find the project using the path-based approach (same as editor)
const project = computed(() => {
  if (!projectName.value) return null
  const fullPath = [...projectPath.value.slice(0, -1), projectName.value] // Remove 'builds' and use project name
  return projectsStore.getItemByFullPath(fullPath)
})

// Use the actual project ID for API calls
const projectId = computed(() => {
  return project.value?.id || null
})

// Data
const builds = ref([])
const buildStats = ref(null)
const pagination = ref(null)
const loading = ref(true)
const loadingLogs = ref(false)
const showLogsModal = ref(false)
const selectedBuild = ref(null)
const buildLogs = ref([])

// Filters
const filters = ref({
  status: '',
  startDate: '',
  endDate: ''
})

const currentPage = ref(1)
const pageSize = 20

// Methods
const loadBuilds = async (page = 1) => {
  try {
    loading.value = true
    
    if (!projectId.value) {
      logger.error('No project ID available for builds API call')
      builds.value = []
      pagination.value = null
      return
    }
    
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString()
    })
    
    if (filters.value.status) params.append('status', filters.value.status)
    if (filters.value.startDate) params.append('startDate', filters.value.startDate + 'T00:00:00.000Z')
    if (filters.value.endDate) params.append('endDate', filters.value.endDate + 'T23:59:59.999Z')
    
    logger.info(`🔍 Loading builds for project ID: ${projectId.value}`)
    const response = await $fetch(`/api/projects/${projectId.value}/builds?${params}`)
    
    builds.value = response.builds
    pagination.value = response.pagination
    currentPage.value = page
  } catch (error) {
    logger.error('Error loading builds:', error)
    builds.value = []
    pagination.value = null
  } finally {
    loading.value = false
  }
}

const loadBuildStats = async () => {
  try {
    if (!projectId.value) {
      buildStats.value = { totalBuilds: 0, successfulBuilds: 0, failedBuilds: 0, successRate: 0 }
      return
    }
    const response = await $fetch(`/api/projects/${projectId.value}/builds`, { query: { page: 1, limit: 50 } })
    if (!response.success || !response.builds) {
      buildStats.value = { totalBuilds: 0, successfulBuilds: 0, failedBuilds: 0, successRate: 0 }
      return
    }
    
    const allBuilds = response.builds
    const totalBuilds = allBuilds.length
    const successfulBuilds = allBuilds.filter(b => b.status === 'success').length
    const failedBuilds = allBuilds.filter(b => b.status === 'failure').length
    const successRate = totalBuilds > 0 ? successfulBuilds / totalBuilds : 0
    const lastBuild = allBuilds[0]
    const durations = allBuilds.filter(b => b.duration).map(b => b.duration)
    const averageDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null
    
    buildStats.value = {
      totalBuilds,
      successfulBuilds,
      failedBuilds,
      successRate,
      lastBuildStatus: lastBuild?.status,
      lastBuildAt: lastBuild?.startedAt,
      averageDuration
    }
  } catch (error) {
    logger.error('Error loading build stats:', error)
    buildStats.value = { totalBuilds: 0, successfulBuilds: 0, failedBuilds: 0, successRate: 0 }
  }
}

const refreshBuilds = async () => {
  await Promise.all([
    loadBuilds(currentPage.value),
    loadBuildStats()
  ])
}

const applyFilters = () => {
  currentPage.value = 1
  loadBuilds(1)
}

const clearFilters = () => {
  filters.value = {
    status: '',
    startDate: '',
    endDate: ''
  }
  applyFilters()
}

const goToPage = (page) => {
  if (page >= 1 && page <= pagination.value.totalPages) {
    loadBuilds(page)
  }
}

const viewBuildLogs = async (build) => {
  selectedBuild.value = build
  showLogsModal.value = true
  loadingLogs.value = true
  
  try {
    const response = await $fetch(`/api/projects/${projectId.value}/builds/${build.id}/logs`)
    buildLogs.value = response.logs
  } catch (error) {
    logger.error('Error loading build logs:', error)
    buildLogs.value = []
  } finally {
    loadingLogs.value = false
  }
}

const closeLogsModal = () => {
  showLogsModal.value = false
  selectedBuild.value = null
  buildLogs.value = []
}

// Utility functions
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'failure':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'cancelled':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'running':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
}

const getStatusDotClass = (status) => {
  switch (status) {
    case 'success':
      return 'bg-green-400'
    case 'failure':
      return 'bg-red-400'
    case 'cancelled':
      return 'bg-yellow-400'
    case 'running':
      return 'bg-blue-400'
    default:
      return 'bg-gray-400'
  }
}

const formatDuration = (milliseconds) => {
  if (!milliseconds) return 'N/A'
  
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Never'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

// Initialize
onMounted(async () => {
  if (!authStore.isAuthenticated) {
    await authStore.initializeAuth()
  }
  
  if (authStore.isAuthenticated) {
    // Load projects store data first to resolve project by path
    await projectsStore.loadData()
    
    // Check if project exists
    if (!project.value) {
      logger.error('Project not found for path:', pathSegments.value)
      await navigateTo('/')
      return
    }
    
    logger.info(`Loading builds for project: ${project.value.name} (ID: ${project.value.id})`)
    await refreshBuilds()
  }
})
</script>