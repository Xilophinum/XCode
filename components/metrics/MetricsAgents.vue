<template>
  <div class="space-y-6 relative">
    <!-- Loading State - Overlay -->
    <div v-show="metricsStore.agentLoading" class="absolute inset-0 flex items-center justify-center py-12 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-sm rounded-lg z-10">
      <UIcon name="i-lucide-loader" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Error State -->
    <div v-show="metricsStore.agentError && !metricsStore.agentLoading">
      <UAlert
        color="red"
        variant="soft"
        :title="metricsStore.agentError"
        icon="i-lucide-triangle-alert"
      />
    </div>

    <!-- Charts -->
    <div v-show="!metricsStore.agentLoading && !metricsStore.agentError && agentMetrics && Object.keys(agentMetrics).length > 0">
      <!-- Agent Status Overview -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Agent Status Overview
          </h3>
        </template>
        <apexchart
          type="line"
          height="300"
          :options="agentStatusChartOptions"
          :series="agentStatusChartSeries"
        />
      </UCard>

      <!-- Per-Agent Metrics -->
      <div class="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-6">
        <UCard v-for="(agentData, agentId) in agentMetrics" :key="agentId">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ getAgentName(agentData) }}
                </h3>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  Platform: {{ getAgentPlatform(agentData) }} • Uptime: {{ getAgentUptime(agentData) }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <UBadge v-if="!agentExists(agentData)" color="red">
                  Deleted Agent
                </UBadge>
                <UBadge v-else :color="isAgentOnline(agentData) ? 'success' : 'error'">
                  {{ isAgentOnline(agentData) ? 'Online' : 'Offline' }}
                </UBadge>
                <UButton
                  v-if="!agentExists(agentData)"
                  @click="deleteAgentLogs(agentId)"
                  color="error"
                  variant="soft"
                  size="sm"
                  icon="i-lucide-trash-2"
                  :loading="deletingLogs[agentId]"
                >
                  Delete Logs
                </UButton>
              </div>
            </div>
          </template>

          <div  class="grid grid-cols-1 lg:grid-cols-2 space-y-6">
            <!-- Agent CPU Usage -->
            <div v-if="agentData.agent_cpu">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                CPU Usage
              </h4>
              <apexchart
                type="area"
                height="180"
                :options="getAgentCPUChartOptions(agentData)"
                :series="getAgentCPUSeries(agentData)"
              />
            </div>

            <!-- Agent Memory Usage -->
            <div v-if="agentData.agent_memory">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Memory Usage
              </h4>
              <apexchart
                type="area"
                height="180"
                :options="getAgentMemoryChartOptions(agentData)"
                :series="getAgentMemorySeries(agentData)"
              />
            </div>

            <!-- Agent Jobs -->
            <div v-if="agentData.agent_jobs">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Job Load
              </h4>
              <apexchart
                type="area"
                height="180"
                :options="getAgentJobsChartOptions(agentData)"
                :series="getAgentJobsSeries(agentData)"
              />
            </div>

            <!-- Agent Disk Usage -->
            <div v-if="agentData.agent_disk">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Disk Usage
              </h4>
              <apexchart
                type="area"
                height="180"
                :options="getAgentDiskChartOptions(agentData)"
                :series="getAgentDiskSeries(agentData)"
              />
            </div>

            <!-- Agent Platform Info -->
            <div class="pt-4 border-t dark:border-gray-700 col-span-2">
              <div class="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span class="text-gray-500 dark:text-gray-400">Network Interface Total:</span>
                  <span class="ml-2 text-gray-900 dark:text-white">{{ getNetworkInterfaceTotal(agentData) }}</span>
                </div>
                <div>
                  <span class="text-gray-500 dark:text-gray-400">Network Interface Names:</span>
                  <span class="ml-2 text-gray-900 dark:text-white">{{ getNetworkInterfaceNames(agentData) }}</span>
                </div>
                <div>
                  <span class="text-gray-500 dark:text-gray-400">IP Addresses (IPV4):</span>
                  <span class="ml-2 text-gray-900 dark:text-white">{{ getIPAddressesV4(agentData) }}</span>
                </div>
                <div>
                  <span class="text-gray-500 dark:text-gray-400">IP Addresses (IPV6):</span>
                  <span class="ml-2 text-gray-900 dark:text-white">{{ getIPAddressesV6(agentData) }}</span>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- No Data -->
    <div v-show="!metricsStore.agentLoading && !metricsStore.agentError && (!agentMetrics || Object.keys(agentMetrics).length === 0)">
      <UCard>
        <div class="text-center py-12">
          <UIcon name="i-lucide-bar-chart" class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <p class="text-gray-500 dark:text-gray-400">No agent metrics available</p>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue'

const metricsStore = useMetricsStore()
const darkMode = useDarkMode()
const isDark = computed(() => darkMode.isDark.value === 'dark')
const { toLocalTime, toShortTime, cronTimezone } = useTimezone()
const agentMetrics = computed(() => metricsStore.agentMetrics)
const toast = useToast()
const logger = useLogger()

// Track which agents are being deleted
const deletingLogs = ref({})

// Delete agent logs
async function deleteAgentLogs(agentId) {
  try {
    deletingLogs.value[agentId] = true
    
    const response = await $fetch('/api/admin/metrics/logs', {
      method: 'DELETE',
      body: { 
        entityType: 'agent',
        entityId: agentId
      }
    })
    
    if (response.success) {
      toast.add({
        title: 'Logs deleted',
        description: `Deleted ${response.deletedCount} metric records for this agent`,
        icon: 'i-lucide-check-circle',
        color: 'green'
      })
      
      // Refresh metrics
      await metricsStore.fetchAll()
    } else {
      toast.add({
        title: 'Failed to delete logs',
        description: response.error,
        icon: 'i-lucide-x-circle',
        color: 'red'
      })
    }
  } catch (error) {
    logger.error('Error deleting agent logs:', error)
    toast.add({
      title: 'Error deleting logs',
      description: error.message,
      icon: 'i-lucide-x-circle',
      color: 'red'
    })
  } finally {
    deletingLogs.value[agentId] = false
  }
}

function agentExists(agentData) {
  if (agentData.agent_status) {
    const latest = agentData.agent_status[agentData.agent_status.length - 1]
    return latest?.agentExists !== false
  }
  return true
}


// Helper function to create base chart options
const createBaseChartOptions = (type, colors, yAxisConfig = {}, showToolbar = true) => {
  const options = {
    chart: {
      id: `agent-${type}-chart`,
      type,
      toolbar: { show: showToolbar },
      background: 'transparent',
      animations: {
        enabled: true,
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      }
    },
    theme: {
      mode: isDark.value ? 'dark' : 'light'
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: type === 'line' ? 3 : 2
    },
    colors,
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: isDark.value ? '#9ca3af' : '#6b7280',
          fontSize: '11px'
        },
        datetimeUTC: false,
      }
    },
    yaxis: {
      ...yAxisConfig,
      labels: {
        ...yAxisConfig.labels,
        style: {
          colors: isDark.value ? '#9ca3af' : '#6b7280',
          fontSize: yAxisConfig.fontSize || '11px'
        }
      }
    },
    tooltip: {
      theme: isDark.value ? 'dark' : 'light',
      x: {
        formatter: (val) => toShortTime(val)
      },
      style: {
        fontSize: '12px',
        fontFamily: 'inherit'
      },
      custom: undefined // Ensure no custom tooltip overrides theme
    },
    grid: {
      borderColor: isDark.value ? '#374151' : '#e5e7eb'
    },
    legend: {
      labels: {
        colors: isDark.value ? '#9ca3af' : '#6b7280'
      }
    }
  }

  // Only add fill for area charts
  if (type === 'area') {
    options.fill = {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3
      }
    }
  }

  return options
}

// Agent status chart (total agents over time)
const agentStatusChartOptions = ref(createBaseChartOptions('line', ['#10b981', '#ef4444'], {
  labels: {
    formatter: (val) => val.toFixed(0)
  }
}))

const agentStatusChartSeries = computed(() => {
  if (!agentMetrics.value || !Object.keys(agentMetrics.value).length) return []

  // Collect all timestamps and status counts
  const statusByTime = new Map()

  // Process each agent's status data
  Object.values(agentMetrics.value).forEach(agentData => {
    if (agentData.agent_status) {
      agentData.agent_status.forEach(statusEntry => {
        const timestamp = statusEntry.timestamp
        if (!statusByTime.has(timestamp)) {
          statusByTime.set(timestamp, { online: 0, offline: 0 })
        }
        const counts = statusByTime.get(timestamp)
        if (statusEntry.status === 'online') {
          counts.online++
        } else {
          counts.offline++
        }
      })
    }
  })

  // Convert to series format
  const sortedTimestamps = Array.from(statusByTime.keys()).sort()

  // Create series data - only update if structure actually changed
  return [
    {
      name: 'Online',
      data: sortedTimestamps.map(ts => ({
        x: new Date(ts).getTime(),
        y: statusByTime.get(ts).online
      }))
    },
    {
      name: 'Offline',
      data: sortedTimestamps.map(ts => ({
        x: new Date(ts).getTime(),
        y: statusByTime.get(ts).offline
      }))
    }
  ]
}, { flush: 'post' })

function getAgentName(agentData) {
  if (agentData.agent_status) {
    const latest = agentData.agent_status[agentData.agent_status.length - 1]
    return latest?.agentName || 'Unknown'
  }
  return 'Agent'
}

function isAgentOnline(agentData) {
  if (agentData.agent_status) {
    const latest = agentData.agent_status[agentData.agent_status.length - 1]
    return latest?.status === 'online'
  }
  return false
}

function getAgentPlatform(agentData) {
  if (agentData.agent_status) {
    const latest = agentData.agent_status[agentData.agent_status.length - 1]
    if (latest?.platform !== undefined) {
      return latest.platform
    }
  }
  return 'Unknown'
}

function getAgentUptime(agentData) {
  if (agentData.agent_status) {
    const latest = agentData.agent_status[agentData.agent_status.length - 1]
    if (latest?.uptime !== undefined) {
      return formatUptime(latest.uptime)
    }
  }
  return 'N/A'
}

function formatUptime(seconds) {
  if (!seconds) return 'N/A'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function getAgentCPUSeries(agentData) {
  if (!agentData.agent_cpu) return []

  return [
    {
      name: 'CPU %',
      data: agentData.agent_cpu.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.percent
      }))
    },
        {
      name: 'Process CPU %',
      data: agentData.agent_process.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.cpu
      }))
    }
  ]
}

// Cache chart options to prevent re-rendering
const chartOptionsCache = ref(new Map())

function getAgentCPUChartOptions(agentData) {
  const cacheKey = 'cpu'
  if (!chartOptionsCache.value.has(cacheKey)) {
    chartOptionsCache.value.set(cacheKey, createBaseChartOptions('area', ['#f59e0b', '#ec4899'], {
      min: 0,
      max: 100,
      labels: {
        formatter: (val) => `${val.toFixed(0)}%`
      }
    }, false))
  }
  return chartOptionsCache.value.get(cacheKey)
}

function getAgentMemorySeries(agentData) {
  if (!agentData.agent_memory) return []

  return [
    {
      name: 'Server Memory %',
      data: agentData.agent_memory.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.percent
      }))
    },
    {
      name: 'RSS',
      data: agentData.agent_process.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.memory.rss
      }))
    },
    {
      name: 'Heap Used',
      data: agentData.agent_process.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.memory.heapUsed
      }))
    },
    {
      name: 'Heap Total',
      data: agentData.agent_process.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.memory.heapTotal
      }))
    }
  ]
}

function getAgentMemoryChartOptions(agentData) {
  const cacheKey = 'memory'
  if (!chartOptionsCache.value.has(cacheKey)) {
    chartOptionsCache.value.set(cacheKey, createBaseChartOptions('area', ['#10b981', '#6b7280', '#a855f7', '#ec4899'], {
      min: 0,
      max: 100,
      labels: {
        formatter: (val) => `${val.toFixed(0)}%`
      }
    }, false))
  }
  return chartOptionsCache.value.get(cacheKey)
}

function getAgentJobsSeries(agentData) {
  if (!agentData.agent_jobs) return []

  return [{
    name: 'Active Jobs',
    data: agentData.agent_jobs.map(m => ({
      x: new Date(m.timestamp).getTime(),
      y: m.current
    }))
  }]
}

function getAgentJobsChartOptions(agentData) {
  const maxJobs = agentData.agent_jobs?.[0]?.max || 1
  const cacheKey = `jobs-${maxJobs}`

  if (!chartOptionsCache.value.has(cacheKey)) {
    chartOptionsCache.value.set(cacheKey, createBaseChartOptions('area', ['#3b82f6'], {
      min: 0,
      max: maxJobs,
      labels: {
        formatter: (val) => val.toFixed(0)
      }
    }, false))
  }
  return chartOptionsCache.value.get(cacheKey)
}

function getAgentDiskSeries(agentData) {
  if (!agentData.agent_disk) return []

  return [{
    name: 'Disk %',
    data: agentData.agent_disk.map(m => ({
      x: new Date(m.timestamp).getTime(),
      y: m.percent
    }))
  }]
}

function getAgentDiskChartOptions(agentData) {
  const cacheKey = 'disk'
  if (!chartOptionsCache.value.has(cacheKey)) {
    chartOptionsCache.value.set(cacheKey, createBaseChartOptions('area', ['#8b5cf6'], {
      min: 0,
      max: 100,
      labels: {
        formatter: (val) => `${val.toFixed(0)}%`
      }
    }, false))
  }
  return chartOptionsCache.value.get(cacheKey)
}

function getNetworkInterfaceTotal(agentData) {
  if (agentData.agent_network) {
    const latest = agentData.agent_network[agentData.agent_network.length - 1]
    if (latest?.interfaceCount !== undefined) {
      return `In Use: ${latest.activeInterfaces.length || 0} / ${latest.interfaceCount || 0} Total`
    }
  }
  return 'N/A'
}

function getNetworkInterfaceNames(agentData) {
  if (agentData.agent_network) {
    const latest = agentData.agent_network[agentData.agent_network.length - 1]
    if (latest?.interfaceCount !== undefined) {
      return `${latest.activeInterfaces?.join(', ') || 'N/A'}`
    }
  }
  return 'N/A'
}

function getIPAddressesV4(agentData) {
  if (agentData.agent_network) {
    const latest = agentData.agent_network[agentData.agent_network.length - 1]
    if (latest?.ipv4Count !== undefined || latest?.ipv6Count !== undefined) {
      return `Total: ${latest.ipv4Count || 0} [${latest.ipv4Addresses?.join(', ') || 'N/A'}]`
    }
  }
  return 'N/A'
}

function getIPAddressesV6(agentData) {
  if (agentData.agent_network) {
    const latest = agentData.agent_network[agentData.agent_network.length - 1]
    if (latest?.ipv4Count !== undefined || latest?.ipv6Count !== undefined) {
      return `Total: ${latest.ipv6Count || 0} [${latest.ipv6Addresses?.join(', ') || 'N/A'}]`
    }
  }
  return 'N/A'
}

// Watch for theme changes and clear cache
watch(isDark, () => {
  chartOptionsCache.value.clear()
  // Update theme mode for agent status chart without replacing the object
  if (agentStatusChartOptions.value) {
    agentStatusChartOptions.value.theme.mode = isDark.value ? 'dark' : 'light'
    agentStatusChartOptions.value.xaxis.labels.style.colors = isDark.value ? '#9ca3af' : '#6b7280'
    agentStatusChartOptions.value.yaxis.labels.style.colors = isDark.value ? '#9ca3af' : '#6b7280'
    agentStatusChartOptions.value.tooltip.theme = isDark.value ? 'dark' : 'light'
    agentStatusChartOptions.value.grid.borderColor = isDark.value ? '#374151' : '#e5e7eb'
    agentStatusChartOptions.value.legend.labels.colors = isDark.value ? '#9ca3af' : '#6b7280'
  }
})
</script>
