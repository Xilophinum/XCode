<template>
  <div class="space-y-6">
    <!-- Comparison Table -->
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Agent Comparison
        </h3>
      </template>

      <div class="overflow-x-auto">
        <table v-if="agents.length > 0" class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Agent
              </th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" @click="sort('status')">
                Status
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" @click="sort('cpu')">
                CPU %
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" @click="sort('memory')">
                Memory %
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" @click="sort('disk')">
                Disk %
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" @click="sort('jobs')">
                Jobs
              </th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" @click="sort('platform')">
                Platform
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" @click="sort('uptime')">
                Uptime
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="agent in sortedAgents" :key="agent.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <!-- Agent Name -->
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex items-center">
                  <UIcon name="i-lucide-server" class="w-4 h-4 mr-2 text-gray-400" />
                  <span class="font-medium text-gray-900 dark:text-white">{{ agent.name }}</span>
                </div>
              </td>

              <!-- Status -->
              <td class="px-4 py-3 whitespace-nowrap text-center">
                <UBadge :color="agent.status === 'online' ? 'green' : 'gray'" size="xs">
                  {{ agent.status }}
                </UBadge>
              </td>

              <!-- CPU -->
              <td class="px-4 py-3 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-2">
                  <span :class="getMetricColor(agent.cpuUsage, 70, 90)">
                    {{ agent.cpuUsage }}%
                  </span>
                  <div class="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all" :class="getProgressBarColor(agent.cpuUsage, 70, 90)" :style="{ width: `${Math.min(agent.cpuUsage, 100)}%` }"></div>
                  </div>
                </div>
              </td>

              <!-- Memory -->
              <td class="px-4 py-3 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-2">
                  <span :class="getMetricColor(agent.memoryUsage, 75, 90)">
                    {{ agent.memoryUsage }}%
                  </span>
                  <div class="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all" :class="getProgressBarColor(agent.memoryUsage, 75, 90)" :style="{ width: `${Math.min(agent.memoryUsage, 100)}%` }"></div>
                  </div>
                </div>
              </td>

              <!-- Disk -->
              <td class="px-4 py-3 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-2">
                  <span :class="getMetricColor(agent.diskUsage, 80, 95)">
                    {{ agent.diskUsage }}%
                  </span>
                  <div class="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all" :class="getProgressBarColor(agent.diskUsage, 80, 95)" :style="{ width: `${Math.min(agent.diskUsage, 100)}%` }"></div>
                  </div>
                </div>
              </td>

              <!-- Jobs -->
              <td class="px-4 py-3 whitespace-nowrap text-right">
                <span class="text-gray-900 dark:text-white">
                  {{ agent.currentJobs }} / {{ agent.maxJobs }}
                </span>
              </td>

              <!-- Platform -->
              <td class="px-4 py-3 whitespace-nowrap text-center">
                <span class="text-gray-600 dark:text-gray-300 capitalize">
                  {{ agent.platform }}
                </span>
              </td>

              <!-- Uptime -->
              <td class="px-4 py-3 whitespace-nowrap text-right">
                <span class="text-gray-600 dark:text-gray-300">
                  {{ formatUptime(agent.uptime) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- No Data -->
        <div v-else class="text-center py-12">
          <UIcon name="i-lucide-server" class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <p class="text-gray-500 dark:text-gray-400">No agents available</p>
        </div>
      </div>
    </UCard>

    <!-- Aggregate Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Average CPU</p>
          <p class="mt-2 text-2xl font-bold" :class="getMetricColor(avgCPU, 70, 90)">
            {{ avgCPU }}%
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Average Memory</p>
          <p class="mt-2 text-2xl font-bold" :class="getMetricColor(avgMemory, 75, 90)">
            {{ avgMemory }}%
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Average Disk</p>
          <p class="mt-2 text-2xl font-bold" :class="getMetricColor(avgDisk, 80, 95)">
            {{ avgDisk }}%
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Total Capacity</p>
          <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {{ totalJobs }} / {{ maxTotalJobs }}
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
const metricsStore = useMetricsStore()

const sortBy = ref('name')
const sortDirection = ref('asc')

const agents = computed(() => {
  const agentList = metricsStore.summary?.agents?.agents || []

  return agentList.map(agent => {
    const metrics = agent.systemMetrics || {}

    return {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      cpuUsage: Math.round(metrics.cpuUsage || 0),
      memoryUsage: Math.round(metrics.memoryUsage || 0),
      diskUsage: Math.round(metrics.diskUsage || 0),
      currentJobs: agent.currentJobs || 0,
      maxJobs: agent.maxJobs || 1,
      platform: metrics.platform || agent.platform || 'unknown',
      uptime: metrics.uptime || 0
    }
  })
})

const sortedAgents = computed(() => {
  const sorted = [...agents.value]

  sorted.sort((a, b) => {
    let aVal, bVal

    switch (sortBy.value) {
      case 'status':
        aVal = a.status === 'online' ? 1 : 0
        bVal = b.status === 'online' ? 1 : 0
        break
      case 'cpu':
        aVal = a.cpuUsage
        bVal = b.cpuUsage
        break
      case 'memory':
        aVal = a.memoryUsage
        bVal = b.memoryUsage
        break
      case 'disk':
        aVal = a.diskUsage
        bVal = b.diskUsage
        break
      case 'jobs':
        aVal = a.currentJobs
        bVal = b.currentJobs
        break
      case 'platform':
        aVal = a.platform
        bVal = b.platform
        break
      case 'uptime':
        aVal = a.uptime
        bVal = b.uptime
        break
      default:
        aVal = a.name
        bVal = b.name
    }

    if (typeof aVal === 'string') {
      return sortDirection.value === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }

    return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
  })

  return sorted
})

// Aggregate stats
const avgCPU = computed(() => {
  if (agents.value.length === 0) return 0
  const sum = agents.value.reduce((acc, a) => acc + a.cpuUsage, 0)
  return Math.round(sum / agents.value.length)
})

const avgMemory = computed(() => {
  if (agents.value.length === 0) return 0
  const sum = agents.value.reduce((acc, a) => acc + a.memoryUsage, 0)
  return Math.round(sum / agents.value.length)
})

const avgDisk = computed(() => {
  if (agents.value.length === 0) return 0
  const sum = agents.value.reduce((acc, a) => acc + a.diskUsage, 0)
  return Math.round(sum / agents.value.length)
})

const totalJobs = computed(() => {
  return agents.value.reduce((acc, a) => acc + a.currentJobs, 0)
})

const maxTotalJobs = computed(() => {
  return agents.value.reduce((acc, a) => acc + a.maxJobs, 0)
})

function sort(column) {
  if (sortBy.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = column
    sortDirection.value = 'desc'
  }
}

function getMetricColor(value, warning, critical) {
  if (value >= critical) return 'text-red-600 dark:text-red-400 font-semibold'
  if (value >= warning) return 'text-yellow-600 dark:text-yellow-400 font-semibold'
  return 'text-gray-900 dark:text-white'
}

function getProgressBarColor(value, warning, critical) {
  if (value >= critical) return 'bg-red-500'
  if (value >= warning) return 'bg-yellow-500'
  return 'bg-green-500'
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
</script>
