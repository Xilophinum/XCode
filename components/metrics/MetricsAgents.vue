<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="metricsStore.agentLoading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="metricsStore.agentError"
      color="red"
      variant="soft"
      :title="metricsStore.agentError"
      icon="i-lucide-triangle-alert"
    />

    <!-- Charts -->
    <div v-else-if="agentMetrics && Object.keys(agentMetrics).length > 0">
      <!-- Agent Status Overview -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Agent Status Overview
          </h3>
        </template>
        <ClientOnly>
          <apexchart
            type="line"
            height="300"
            :options="agentStatusChartOptions"
            :series="agentStatusChartSeries"
          />
        </ClientOnly>
      </UCard>

      <!-- Per-Agent Metrics -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <UCard v-for="(agentData, agentId) in agentMetrics" :key="agentId">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ getAgentName(agentData) }}
              </h3>
              <UBadge :color="isAgentOnline(agentData) ? 'green' : 'gray'">
                {{ isAgentOnline(agentData) ? 'Online' : 'Offline' }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-6">
            <!-- Agent CPU Usage -->
            <div v-if="agentData.agent_cpu">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                CPU Usage
              </h4>
              <ClientOnly>
                <apexchart
                  type="area"
                  height="180"
                  :options="getAgentCPUChartOptions(agentData)"
                  :series="getAgentCPUSeries(agentData)"
                />
              </ClientOnly>
            </div>

            <!-- Agent Memory Usage -->
            <div v-if="agentData.agent_memory">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Memory Usage
              </h4>
              <ClientOnly>
                <apexchart
                  type="area"
                  height="180"
                  :options="getAgentMemoryChartOptions(agentData)"
                  :series="getAgentMemorySeries(agentData)"
                />
              </ClientOnly>
            </div>

            <!-- Agent Jobs -->
            <div v-if="agentData.agent_jobs">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Job Load
              </h4>
              <ClientOnly>
                <apexchart
                  type="area"
                  height="180"
                  :options="getAgentJobsChartOptions(agentData)"
                  :series="getAgentJobsSeries(agentData)"
                />
              </ClientOnly>
            </div>

            <!-- Agent Disk Usage -->
            <div v-if="agentData.agent_disk">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Disk Usage
              </h4>
              <ClientOnly>
                <apexchart
                  type="area"
                  height="180"
                  :options="getAgentDiskChartOptions(agentData)"
                  :series="getAgentDiskSeries(agentData)"
                />
              </ClientOnly>
            </div>

            <!-- Agent Platform Info -->
            <div class="pt-4 border-t dark:border-gray-700">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-500 dark:text-gray-400">Platform:</span>
                  <span class="ml-2 text-gray-900 dark:text-white">{{ getAgentPlatform(agentData) }}</span>
                </div>
                <div>
                  <span class="text-gray-500 dark:text-gray-400">Uptime:</span>
                  <span class="ml-2 text-gray-900 dark:text-white">{{ getAgentUptime(agentData) }}</span>
                </div>
              </div>

              <!-- Network Stats -->
              <div v-if="hasNetworkStats(agentData)" class="grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t dark:border-gray-700">
                <div>
                  <span class="text-gray-500 dark:text-gray-400">Network Interfaces:</span>
                  <span class="ml-2 text-gray-900 dark:text-white">{{ getNetworkInterfaces(agentData) }}</span>
                </div>
                <div>
                  <span class="text-gray-500 dark:text-gray-400">IP Addresses:</span>
                  <span class="ml-2 text-gray-900 dark:text-white">{{ getIPAddresses(agentData) }}</span>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- No Data -->
    <UCard v-else>
      <div class="text-center py-12">
        <UIcon name="i-lucide-bar-chart" class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
        <p class="text-gray-500 dark:text-gray-400">No agent metrics available</p>
      </div>
    </UCard>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue'
import { useColorMode } from '@vueuse/core'

const metricsStore = useMetricsStore()
const darkMode = useDarkMode()
const isDark = computed(() => darkMode.isDark.value === 'dark')
const agentMetrics = computed(() => metricsStore.agentMetrics)


// Helper function to create base chart options
const createBaseChartOptions = (type, colors, yAxisConfig = {}, showToolbar = true) => {
  return {
    chart: {
      id: `${type}-chart-${Date.now()}`,
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
    fill: type === 'area' ? {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3
      }
    } : undefined,
    colors,
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: isDark.value ? '#9ca3af' : '#6b7280',
          fontSize: '11px'
        }
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
      x: { format: 'HH:mm:ss' }
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
}

// Agent status chart (total agents over time)
const agentStatusChartOptions = ref(createBaseChartOptions('line', ['#10b981', '#ef4444'], {
  labels: {
    formatter: (val) => val.toFixed(0)
  }
}))

const agentStatusChartSeries = computed(() => {
  const globalData = agentMetrics.value?.global

  if (!globalData?.agents_total) return []

  return [
    {
      name: 'Online',
      data: globalData.agents_total.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.online
      }))
    },
    {
      name: 'Offline',
      data: globalData.agents_total.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.offline
      }))
    }
  ]
})

function getAgentName(agentData) {
  const firstMetric = Object.values(agentData)[0]
  if (Array.isArray(firstMetric) && firstMetric[0]?.agentName) {
    return firstMetric[0].agentName
  }
  return 'Agent'
}

function isAgentOnline(agentData) {
  if (agentData.agent_status) {
    const latest = agentData.agent_status[agentData.agent_status.length - 1]
    return latest?.isOnline || false
  }
  return false
}

function getAgentPlatform(agentData) {
  const firstMetric = Object.values(agentData)[0]
  if (Array.isArray(firstMetric) && firstMetric[0]?.agentName) {
    const metadata = firstMetric.find(m => m.metadata)
    return metadata?.metadata?.platform || 'Unknown'
  }
  return 'Unknown'
}

function getAgentUptime(agentData) {
  // Get the latest agent_cpu or agent_memory metric which should have uptime info
  const cpuMetrics = agentData.agent_cpu
  if (cpuMetrics && cpuMetrics.length > 0) {
    const latest = cpuMetrics[cpuMetrics.length - 1]
    // Uptime would be in metadata if available
    return 'N/A' // Will be populated when we add uptime to metadata
  }
  return 'N/A'
}

function getAgentCPUSeries(agentData) {
  if (!agentData.agent_cpu) return []

  return [{
    name: 'CPU %',
    data: agentData.agent_cpu.map(m => ({
      x: new Date(m.timestamp).getTime(),
      y: m.percent
    }))
  }]
}

// Cache chart options to prevent re-rendering
const chartOptionsCache = ref(new Map())

function getAgentCPUChartOptions(agentData) {
  const cacheKey = 'cpu'
  if (!chartOptionsCache.value.has(cacheKey)) {
    chartOptionsCache.value.set(cacheKey, createBaseChartOptions('area', ['#f59e0b'], {
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

  return [{
    name: 'Memory %',
    data: agentData.agent_memory.map(m => ({
      x: new Date(m.timestamp).getTime(),
      y: m.percent
    }))
  }]
}

function getAgentMemoryChartOptions(agentData) {
  const cacheKey = 'memory'
  if (!chartOptionsCache.value.has(cacheKey)) {
    chartOptionsCache.value.set(cacheKey, createBaseChartOptions('area', ['#10b981'], {
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

function hasNetworkStats(agentData) {
  const firstMetric = Object.values(agentData)[0]
  if (Array.isArray(firstMetric) && firstMetric.length > 0) {
    const latest = firstMetric[firstMetric.length - 1]
    return latest?.metadata?.networkInterfaceCount !== undefined
  }
  return false
}

function getNetworkInterfaces(agentData) {
  const firstMetric = Object.values(agentData)[0]
  if (Array.isArray(firstMetric) && firstMetric.length > 0) {
    const latest = firstMetric[firstMetric.length - 1]
    const metadata = latest?.metadata
    if (metadata?.networkInterfaceCount !== undefined) {
      return `${metadata.activeInterfaces || 0} / ${metadata.networkInterfaceCount || 0}`
    }
  }
  return 'N/A'
}

function getIPAddresses(agentData) {
  const firstMetric = Object.values(agentData)[0]
  if (Array.isArray(firstMetric) && firstMetric.length > 0) {
    const latest = firstMetric[firstMetric.length - 1]
    const metadata = latest?.metadata
    if (metadata?.ipv4Count !== undefined || metadata?.ipv6Count !== undefined) {
      const ipv4 = metadata.ipv4Count || 0
      const ipv6 = metadata.ipv6Count || 0
      return `IPv4: ${ipv4}, IPv6: ${ipv6}`
    }
  }
  return 'N/A'
}

// Watch for theme changes and clear cache
watch(isDark, () => {
  chartOptionsCache.value.clear()
  agentStatusChartOptions.value = createBaseChartOptions('line', ['#10b981', '#ef4444'], {
    labels: {
      formatter: (val) => val.toFixed(0)
    }
  })
})
</script>
