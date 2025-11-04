<template>
  <div class="space-y-6 relative">
    <!-- Loading State - Overlay -->
    <div v-show="metricsStore.buildLoading" class="absolute inset-0 flex items-center justify-center py-12 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-sm rounded-lg z-10">
      <UIcon name="i-lucide-loader" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Error State -->
    <div v-show="metricsStore.buildError && !metricsStore.buildLoading">
      <UAlert
        color="red"
        variant="soft"
        :title="metricsStore.buildError"
        icon="i-lucide-triangle-alert"
      />
    </div>

    <!-- Charts -->
    <div v-show="!metricsStore.buildLoading && !metricsStore.buildError && buildMetrics">
      <!-- Build Throughput -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Build Throughput
          </h3>
        </template>
        <apexchart
          type="bar"
          height="350"
          :options="throughputChartOptions"
          :series="throughputChartSeries"
        />
      </UCard>

      <!-- Success Rate -->
      <UCard class="mt-6">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Success Rate Over Time
          </h3>
        </template>
        <apexchart
          type="line"
          height="300"
          :options="successRateChartOptions"
          :series="successRateChartSeries"
        />
      </UCard>

      <!-- Summary Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">Total Builds</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {{ buildMetrics?.summary?.total || 0 }}
            </p>
          </div>
        </UCard>

        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
            <p class="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
              {{ buildMetrics?.summary?.successRate || 0 }}%
            </p>
          </div>
        </UCard>

        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">Avg Duration</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {{ formatDuration(buildMetrics?.summary?.avgDuration || 0) }}
            </p>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue'
const metricsStore = useMetricsStore()
const darkMode = useDarkMode()
const isDark = computed(() => darkMode.isDark.value === 'dark')
const { toLocalTime } = useTimezone()
const buildMetrics = computed(() => metricsStore.buildMetrics)

// Throughput Chart - using ref with manual updates
const throughputChartOptions = ref({
  chart: {
    type: 'bar',
    stacked: true,
    toolbar: { show: true },
    background: 'transparent'
  },
  theme: {
    mode: isDark.value ? 'dark' : 'light'
  },
  plotOptions: {
    bar: {
      horizontal: false
    }
  },
  colors: ['#10b981', '#ef4444'],
  xaxis: {
    type: 'datetime',
    labels: {
      style: {
        colors: isDark.value ? '#9ca3af' : '#6b7280'
      }
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
  legend: {
    labels: {
      colors: isDark.value ? '#9ca3af' : '#6b7280'
    }
  },
  tooltip: {
    theme: isDark.value ? 'dark' : 'light',
    x: {
      formatter: (val) => toLocalTime(val, {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
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
})

const successRateChartOptions = ref({
  chart: {
    type: 'line',
    toolbar: { show: true },
    background: 'transparent'
  },
  theme: {
    mode: isDark.value ? 'dark' : 'light'
  },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 3 },
  colors: ['#10b981'],
  xaxis: {
    type: 'datetime',
    labels: {
      style: {
        colors: isDark.value ? '#9ca3af' : '#6b7280'
      }
    }
  },
  yaxis: {
    min: 0,
    max: 100,
    labels: {
      formatter: (val) => `${val.toFixed(0)}%`,
      style: {
        colors: isDark.value ? '#9ca3af' : '#6b7280'
      }
    }
  },
  tooltip: {
    theme: isDark.value ? 'dark' : 'light',
    x: {
      formatter: (val) => toLocalTime(val, {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
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
})

// Throughput Chart
const throughputChartSeries = computed(() => {
  if (!buildMetrics.value?.timeSeries) return []

  return [
    {
      name: 'Success',
      data: buildMetrics.value.timeSeries.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.success
      }))
    },
    {
      name: 'Failure',
      data: buildMetrics.value.timeSeries.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.failure
      }))
    }
  ]
})

// Success Rate Chart
const successRateChartSeries = computed(() => {
  if (!buildMetrics.value?.timeSeries) return []

  return [{
    name: 'Success Rate %',
    data: buildMetrics.value.timeSeries.map(m => ({
      x: new Date(m.timestamp).getTime(),
      y: m.successRate
    }))
  }]
})

// Watch for theme changes and update options in-place
watch(isDark, () => {
  if (throughputChartOptions.value) {
    throughputChartOptions.value.theme.mode = isDark.value ? 'dark' : 'light'
    throughputChartOptions.value.xaxis.labels.style.colors = isDark.value ? '#9ca3af' : '#6b7280'
    throughputChartOptions.value.yaxis.labels.style.colors = isDark.value ? '#9ca3af' : '#6b7280'
    throughputChartOptions.value.legend.labels.colors = isDark.value ? '#9ca3af' : '#6b7280'
    throughputChartOptions.value.tooltip.theme = isDark.value ? 'dark' : 'light'
    throughputChartOptions.value.grid.borderColor = isDark.value ? '#374151' : '#e5e7eb'
  }

  if (successRateChartOptions.value) {
    successRateChartOptions.value.theme.mode = isDark.value ? 'dark' : 'light'
    successRateChartOptions.value.xaxis.labels.style.colors = isDark.value ? '#9ca3af' : '#6b7280'
    successRateChartOptions.value.yaxis.labels.style.colors = isDark.value ? '#9ca3af' : '#6b7280'
    successRateChartOptions.value.tooltip.theme = isDark.value ? 'dark' : 'light'
    successRateChartOptions.value.grid.borderColor = isDark.value ? '#374151' : '#e5e7eb'
  }
})

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}
</script>
