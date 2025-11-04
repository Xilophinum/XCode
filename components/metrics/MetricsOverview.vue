<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="metricsStore.summaryLoading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="metricsStore.summaryError"
      color="red"
      variant="soft"
      :title="metricsStore.summaryError"
      icon="i-lucide-triangle-alert"
    />

    <!-- Summary Cards -->
    <div v-else-if="summary" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Server CPU Card -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Server CPU</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {{ summary.server?.cpu?.percent || 0 }}%
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ summary.server?.cpu?.cores || 0 }} cores
            </p>
          </div>
          <div class="p-3 rounded-full" :class="getCPUColor(summary.server?.cpu?.percent)">
            <UIcon name="i-lucide-cpu" class="w-6 h-6" />
          </div>
        </div>
      </UCard>

      <!-- Server Memory Card -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Server Memory</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {{ summary.server?.memory?.percent || 0 }}%
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ summary.server?.memory?.used || 0 }} / {{ summary.server?.memory?.total || 0 }} MB
            </p>
          </div>
          <div class="p-3 rounded-full" :class="getMemoryColor(summary.server?.memory?.percent)">
            <UIcon name="i-lucide-monitor" class="w-6 h-6" />
          </div>
        </div>
      </UCard>

      <!-- Online Agents Card -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Agents Online</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {{ summary.agents?.online || 0 }} / {{ summary.agents?.total || 0 }}
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ summary.agents?.jobs?.current || 0 }} active jobs
            </p>
          </div>
          <div class="p-3 rounded-full bg-green-100 dark:bg-green-900">
            <UIcon name="i-lucide-server" class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </UCard>

      <!-- Build Success Rate Card -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Success Rate ({{ metricsStore.timeRangeShortLabel }})</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {{ summary.builds?.last24Hours?.successRate || 0 }}%
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ summary.builds?.last24Hours?.total || 0 }} builds
            </p>
          </div>
          <div class="p-3 rounded-full" :class="getSuccessRateColor(summary.builds?.last24Hours?.successRate)">
            <UIcon name="i-lucide-bar-chart" class="w-6 h-6" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Process Footprint Cards -->
    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Server Process CPU -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Server Process CPU</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {{ summary.server?.process?.cpu || 0 }}%
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Process footprint
            </p>
          </div>
          <div class="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
            <UIcon name="i-lucide-activity" class="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </UCard>

      <!-- Server Process Memory -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Server Process Memory</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {{ summary.server?.process?.memory?.heapUsed || 0 }} MB
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              RSS: {{ summary.server?.process?.memory?.rss || 0 }} MB
            </p>
          </div>
          <div class="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900">
            <UIcon name="i-lucide-database" class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </UCard>

      <!-- Avg Agent Process CPU -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Agent Process CPU</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {{ getAvgAgentProcessCpu(summary) }}%
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Across {{ summary.agents?.online || 0 }} agents
            </p>
          </div>
          <div class="p-3 rounded-full bg-pink-100 dark:bg-pink-900">
            <UIcon name="i-lucide-zap" class="w-6 h-6 text-pink-600 dark:text-pink-400" />
          </div>
        </div>
      </UCard>

      <!-- Avg Agent Process Memory -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Agent Process Memory</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {{ getAvgAgentProcessMemory(summary) }} MB
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Heap usage average
            </p>
          </div>
          <div class="p-3 rounded-full bg-cyan-100 dark:bg-cyan-900">
            <UIcon name="i-lucide-hard-drive" class="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Additional Stats -->
    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Build Stats Card -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Build Statistics ({{ metricsStore.timeRangeShortLabel }})
          </h3>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-300">Total Builds</span>
            <span class="font-semibold text-gray-900 dark:text-white">
              {{ summary.builds?.last24Hours?.total || 0 }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-300">Success</span>
            <span class="font-semibold text-green-600 dark:text-green-400">
              {{ summary.builds?.last24Hours?.success || 0 }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-300">Failures</span>
            <span class="font-semibold text-red-600 dark:text-red-400">
              {{ summary.builds?.last24Hours?.failure || 0 }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-300">Running</span>
            <span class="font-semibold text-blue-600 dark:text-blue-400">
              {{ summary.builds?.last24Hours?.running || 0 }}
            </span>
          </div>

          <div class="flex items-center justify-between pt-4 border-t dark:border-gray-700">
            <span class="text-sm text-gray-600 dark:text-gray-300">Avg Duration</span>
            <span class="font-semibold text-gray-900 dark:text-white">
              {{ formatDuration(summary.builds?.last24Hours?.avgDuration || 0) }}
            </span>
          </div>
        </div>
      </UCard>

      <!-- API Stats Card -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            API Performance ({{ metricsStore.timeRangeShortLabel }})
          </h3>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-300">Total Requests</span>
            <span class="font-semibold text-gray-900 dark:text-white">
              {{ summary.api?.totalRequests || 0 }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-300">Avg Latency</span>
            <span class="font-semibold text-gray-900 dark:text-white">
              {{ summary.api?.avgLatency.toFixed(2) || 0 }} ms
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-300">WebSocket Connections</span>
            <span class="font-semibold text-gray-900 dark:text-white">
              {{ summary.server?.websocket?.connections || 0 }}
            </span>
          </div>

          <div class="flex items-center justify-between pt-4 border-t dark:border-gray-700">
            <span class="text-sm text-gray-600 dark:text-gray-300">Server Uptime</span>
            <span class="font-semibold text-gray-900 dark:text-white">
              {{ formatUptime(summary.server?.uptime || 0) }}
            </span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Agents List -->
    <div v-if="summary?.agents?.agents" class="mt-6">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Agent Status
          </h3>
        </template>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead class="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Agent
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Platform
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Jobs
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              <tr v-for="agent in agentsList" :key="agent.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <UIcon name="i-lucide-monitor" class="h-6 w-6 text-gray-600 dark:text-gray-400" />
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ agent.name }}
                      </div>
                      <div class="text-sm text-gray-500 dark:text-gray-400">
                        {{ agent.hostname || 'Not connected' }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getStatusBadgeClass(agent.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                    <span :class="getStatusDotClass(agent.status)" class="w-1.5 h-1.5 rounded-full mr-1.5"></span>
                    {{ agent.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div class="flex items-center">
                    <UIcon :name="getPlatformIcon(agent.platform)" class="w-4 h-4 mr-2" />
                    <span v-if="agent.platform" class="capitalize">{{ agent.platform }}</span>
                    <span v-else class="text-gray-400 dark:text-gray-500">Unknown</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ agent.currentJobs }}/{{ agent.maxJobs }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <span v-if="agent.lastHeartbeat" v-tooltip="new Date(agent.lastHeartbeat).toLocaleString()">
                    {{ getReactiveRelativeTime(agent.lastHeartbeat) }}
                  </span>
                  <span v-else>Never</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
const metricsStore = useMetricsStore()

const summary = computed(() => metricsStore.summary)

// Stable agents list - computed to prevent recreating on every render
const agentsList = computed(() => summary.value?.agents?.agents || [])

// Reactive time ticker for "Last Seen" updates (throttled to 10 seconds)
const currentTime = ref(Date.now())
let timeUpdateInterval = null

onMounted(() => {
  // Update current time every 10 seconds instead of every second
  // This reduces unnecessary re-renders while keeping times reasonably fresh
  timeUpdateInterval = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
  }
})

function getCPUColor(percent) {
  if (percent >= 90) return 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
  if (percent >= 70) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400'
  return 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
}

function getMemoryColor(percent) {
  if (percent >= 90) return 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
  if (percent >= 75) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400'
  return 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
}

function getSuccessRateColor(rate) {
  if (rate >= 95) return 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
  if (rate >= 80) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400'
  return 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'online':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'busy':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'offline':
    case 'disconnected':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
}

function getStatusDotClass(status) {
  switch (status) {
    case 'online':
      return 'bg-green-400'
    case 'busy':
      return 'bg-yellow-400'
    case 'offline':
    case 'disconnected':
      return 'bg-red-400'
    default:
      return 'bg-gray-400'
  }
}

function getPlatformIcon(platform) {
  if (!platform) return 'i-lucide-monitor'

  const platformLower = platform.toLowerCase()
  if (platformLower.includes('win')) return 'i-lucide-pc-case'
  if (platformLower.includes('linux')) return 'i-lucide-server'
  if (platformLower.includes('darwin') || platformLower.includes('mac')) return 'i-lucide-laptop'

  return 'i-lucide-monitor'
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// Reactive version that updates with currentTime ref
function getReactiveRelativeTime(dateString) {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const diffInSeconds = Math.floor((currentTime.value - date.getTime()) / 1000)

  if (diffInSeconds < 5) return 'Just now'
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

// Calculate average process CPU across all online agents
function getAvgAgentProcessCpu(summary) {
  if (!summary?.agents?.agents) return 0

  const onlineAgents = summary.agents.agents.filter(a => a.status === 'online')
  if (onlineAgents.length === 0) return 0

  const totalCpu = onlineAgents.reduce((sum, agent) => {
    return sum + (agent.systemMetrics?.process?.cpu || 0)
  }, 0)

  return Math.round((totalCpu / onlineAgents.length) * 100) / 100
}

// Calculate average process memory across all online agents
function getAvgAgentProcessMemory(summary) {
  if (!summary?.agents?.agents) return 0

  const onlineAgents = summary.agents.agents.filter(a => a.status === 'online')
  if (onlineAgents.length === 0) return 0

  const totalMemory = onlineAgents.reduce((sum, agent) => {
    return sum + (agent.systemMetrics?.process?.memory?.heapUsed || 0)
  }, 0)

  return Math.round(totalMemory / onlineAgents.length)
}
</script>
