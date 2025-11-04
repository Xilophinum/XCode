<template>
  <div class="space-y-6 relative">
    <!-- Loading State - Overlay -->
    <div v-show="metricsStore.serverLoading" class="absolute inset-0 flex items-center justify-center py-12 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-sm rounded-lg z-10 pointer-events-none">
      <UIcon name="i-lucide-loader" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Error State -->
    <div v-show="metricsStore.serverError && !metricsStore.serverLoading">
      <UAlert
        color="red"
        variant="soft"
        :title="metricsStore.serverError"
        icon="i-lucide-triangle-alert"
      />
    </div>

    <!-- Charts -->
    <div v-show="!metricsStore.serverLoading && !metricsStore.serverError && serverMetrics" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- CPU Chart -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            CPU Usage % / System vs Process
          </h3>
        </template>
        <apexchart
          type="area"
          height="300"
          :options="processCpuChartOptions"
          :series="processCpuChartSeries"
        />
      </UCard>

      <!-- Memory Chart -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Memory Usage MB / System vs Process
          </h3>
        </template>
        <apexchart
          type="area"
          height="300"
          :options="processMemoryChartOptions"
          :series="processMemoryChartSeries"
        />
      </UCard>

      <!-- WebSocket Connections -->
      <UCard class="col-span-2">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            WebSocket Connections
          </h3>
        </template>
        <apexchart
          type="line"
          height="300"
          :options="wsChartOptions"
          :series="wsChartSeries"
        />
      </UCard>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue'
const metricsStore = useMetricsStore()
const darkMode = useDarkMode()
const isDark = computed(() => darkMode.isDark.value === 'dark')
const { toShortTime } = useTimezone()
const serverMetrics = computed(() => metricsStore.serverMetrics)

// Helper function to create chart options
const createChartOptions = (type, colors, yAxisConfig = {}) => {
  const options = {
    chart: {
      id: `server-${type}-chart`,
      type: type === 'cpu' || type === 'memory' ? 'area' : 'line',
      toolbar: { show: true },
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
      width: type === 'ws' ? 3 : 2
    },
    colors,
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
      ...yAxisConfig,
      labels: {
        ...yAxisConfig.labels,
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
      custom: undefined, // Ensure no custom tooltip overrides theme
      shared: true
    },
    grid: {
      borderColor: isDark.value ? '#374151' : '#e5e7eb'
    }
  }

  // Only add fill for area charts
  if (type !== 'ws') {
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

// WebSocket Connections Chart
const wsChartOptions = ref(createChartOptions('ws', ['#8b5cf6'], {
  labels: {
    formatter: (val) => val.toFixed(0)
  }
}))

const wsChartSeries = computed(() => {
  if (!serverMetrics.value?.server_websocket_connections) return []

  return [{
    name: 'Connections',
    data: serverMetrics.value.server_websocket_connections.map(m => ({
      x: new Date(m.timestamp).getTime(),
      y: m.count
    }))
  }]
})

// Process CPU Chart
const processCpuChartOptions = ref(createChartOptions('process-cpu', ['#a855f7', '#3b82f6'], {
  min: 0,
  max: 100,
  labels: {
    formatter: (val) => `${val.toFixed(1)}%`
  }
}))

const processCpuChartSeries = computed(() => {
  if (!serverMetrics.value?.server_process_cpu) return []

  const series = []

  // Process CPU
  if (serverMetrics.value.server_process_cpu?.length > 0) {
    series.push({
      name: 'Process CPU',
      data: serverMetrics.value.server_process_cpu.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.percent
      }))
    })
  }

  // System CPU for comparison
  if (serverMetrics.value.server_cpu?.length > 0) {
    series.push({
      name: 'System CPU',
      data: serverMetrics.value.server_cpu.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.percent
      }))
    })
  }

  return series
})

// Process Memory Chart
const processMemoryChartOptions = ref(createChartOptions('process-memory', ['#10b981', '#6b7280', '#a855f7', '#ec4899', '#f59e0b'], {
  labels: {
    formatter: (val) => `${val.toFixed(0)} MB`
  }
}))

const processMemoryChartSeries = computed(() => {
  if (!serverMetrics.value?.server_memory) return []
  if (!serverMetrics.value?.server_process_memory) return []
  return [
    {
      name: 'Used MB',
      data: serverMetrics.value.server_memory.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.used
      }))
    },
    {
      name: 'Total MB',
      data: serverMetrics.value.server_memory.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.total
      }))
    },
    {
      name: 'RSS',
      data: serverMetrics.value.server_process_memory.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.rss
      }))
    },
    {
      name: 'Heap Used',
      data: serverMetrics.value.server_process_memory.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.heapUsed
      }))
    },
    {
      name: 'Heap Total',
      data: serverMetrics.value.server_process_memory.map(m => ({
        x: new Date(m.timestamp).getTime(),
        y: m.heapTotal
      }))
    }
  ]
})

// Watch for theme changes and update chart options in-place
watch(isDark, () => {
  // Update theme mode for each chart without replacing the object
  if (wsChartOptions.value) {
    wsChartOptions.value.theme.mode = isDark.value ? 'dark' : 'light'
    wsChartOptions.value.xaxis.labels.style.colors = isDark.value ? '#9ca3af' : '#6b7280'
    wsChartOptions.value.yaxis.labels.style.colors = isDark.value ? '#9ca3af' : '#6b7280'
    wsChartOptions.value.tooltip.theme = isDark.value ? 'dark' : 'light'
    wsChartOptions.value.grid.borderColor = isDark.value ? '#374151' : '#e5e7eb'
  }

  if (processCpuChartOptions.value) {
    processCpuChartOptions.value.theme.mode = isDark.value ? 'dark' : 'light'
    processCpuChartOptions.value.xaxis.labels.style.colors = isDark.value ? '#9ca3af' : '#6b7280'
    processCpuChartOptions.value.yaxis.labels.style.colors = isDark.value ? '#9ca3af' : '#6b7280'
    processCpuChartOptions.value.tooltip.theme = isDark.value ? 'dark' : 'light'
    processCpuChartOptions.value.grid.borderColor = isDark.value ? '#374151' : '#e5e7eb'
  }

  if (processMemoryChartOptions.value) {
    processMemoryChartOptions.value.theme.mode = isDark.value ? 'dark' : 'light'
    processMemoryChartOptions.value.xaxis.labels.style.colors = isDark.value ? '#9ca3af' : '#6b7280'
    processMemoryChartOptions.value.yaxis.labels.style.colors = isDark.value ? '#9ca3af' : '#6b7280'
    processMemoryChartOptions.value.tooltip.theme = isDark.value ? 'dark' : 'light'
    processMemoryChartOptions.value.grid.borderColor = isDark.value ? '#374151' : '#e5e7eb'
  }
})
</script>
