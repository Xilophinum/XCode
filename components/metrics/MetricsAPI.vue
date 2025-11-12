<template>
  <div class="space-y-6 relative">
    <!-- Loading State - Overlay -->
    <div v-show="metricsStore.apiLoading" class="absolute inset-0 flex items-center justify-center py-12 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-sm rounded-lg z-10">
      <UIcon name="i-lucide-loader" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Error State -->
    <div v-show="metricsStore.apiError && !metricsStore.apiLoading">
      <UAlert
        color="red"
        variant="soft"
        :title="metricsStore.apiError"
        icon="i-lucide-triangle-alert"
      />
    </div>

    <!-- Charts and Stats -->
    <div v-show="!metricsStore.apiLoading && !metricsStore.apiError && apiMetrics">
      <!-- Request Volume -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ $t('metricsAPI.apiRequestVolume') }}
          </h3>
        </template>
        <apexchart
          type="area"
          height="300"
          :options="requestVolumeChartOptions"
          :series="requestVolumeChartSeries"
        />
      </UCard>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('metricsAPI.totalRequests') }}</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {{ apiMetrics?.summary?.totalRequests || 0 }}
            </p>
          </div>
        </UCard>

        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('metricsAPI.avgLatency') }}</p>
            <p class="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
              {{ apiMetrics?.summary?.avgLatency || 0 }} ms
            </p>
          </div>
        </UCard>

        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('metricsAPI.p95Latency') }}</p>
            <p class="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">
              {{ apiMetrics?.summary?.p95Latency || 0 }} ms
            </p>
          </div>
        </UCard>
      </div>

      <!-- Top Endpoints Table -->
      <UCard v-if="apiMetrics?.endpoints && apiMetrics.endpoints.length > 0" class="mt-6">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ $t('metricsAPI.topEndpoints') }}
          </h3>
        </template>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {{ $t('metricsAPI.endpoint') }}
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {{ $t('metricsAPI.requests') }}
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {{ $t('metricsAPI.avgLatency') }}
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {{ $t('metricsAPI.p95Latency') }}
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {{ $t('metricsAPI.maxLatency') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="endpoint in topEndpoints" :key="endpoint.endpoint">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                  {{ endpoint.endpoint }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">
                  {{ endpoint.totalRequests }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300">
                  {{ endpoint.avgLatency }} ms
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-orange-600 dark:text-orange-400">
                  {{ endpoint.p95Latency }} ms
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">
                  {{ endpoint.maxLatency }} ms
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
const darkMode = useDarkMode()
const isDark = computed(() => darkMode.isDark.value === 'dark')
const { toShortTime } = useTimezone()
const apiMetrics = computed(() => metricsStore.apiMetrics)


const topEndpoints = computed(() => {
  if (!apiMetrics.value?.endpoints) return []
  return apiMetrics.value.endpoints.slice(0, 10)
})

// Request Volume Chart
const requestVolumeChartSeries = computed(() => {
  if (!apiMetrics.value?.timeSeries) return []

  return [{
    name: $t('metricsAPI.requests'),
    data: apiMetrics.value.timeSeries.map(m => ({
      x: new Date(m.timestamp).getTime(),
      y: m.totalRequests
    }))
  }]
})

const requestVolumeChartOptions = computed(() => ({
  chart: {
    type: 'area',
    toolbar: { show: true },
    background: 'transparent'
  },
  theme: {
    mode: isDark.value ? 'dark' : 'light'
  },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.7,
      opacityTo: 0.3
    }
  },
  colors: ['#8b5cf6'],
  xaxis: {
    type: 'datetime',
    labels: {
      style: {
        colors: isDark.value ? '#9ca3af' : '#6b7280'
      },
      datetimeUTC: false,
    }
  },
  yaxis: {
    labels: {
      formatter: (val) => val.toFixed(0),
      style: {
        colors: isDark.value ? '#9ca3af' : '#6b7280'
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
    custom: undefined
  },
  grid: {
    borderColor: isDark.value ? '#374151' : '#e5e7eb'
  }
}))
</script>
