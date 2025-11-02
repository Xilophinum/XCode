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
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Success Rate (24h)</p>
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

    <!-- Additional Stats -->
    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Build Stats Card -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Build Statistics (24h)
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
            API Performance (1h)
          </h3>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-300">Total Requests</span>
            <span class="font-semibold text-gray-900 dark:text-white">
              {{ summary.api?.lastHour?.totalRequests || 0 }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-300">Avg Latency</span>
            <span class="font-semibold text-gray-900 dark:text-white">
              {{ summary.api?.lastHour?.avgLatency || 0 }} ms
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
              {{ formatUptime(summary.server?.uptime?.seconds || 0) }}
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
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Agent
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Jobs
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Platform
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Heartbeat
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="agent in summary.agents.agents" :key="agent.id">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {{ agent.name }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <UBadge :color="agent.status === 'online' ? 'green' : 'gray'">
                    {{ agent.status }}
                  </UBadge>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                  {{ agent.currentJobs }} / {{ agent.maxJobs }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                  {{ agent.platform || 'Unknown' }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                  {{ formatRelativeTime(agent.lastHeartbeat) }}
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
import { computed } from 'vue'
const metricsStore = useMetricsStore()

const summary = computed(() => metricsStore.summary)

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

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Never'

  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`

  return date.toLocaleString()
}
</script>
