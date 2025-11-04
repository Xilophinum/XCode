<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="metricsStore.serverLoading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="metricsStore.serverError"
      color="red"
      variant="soft"
      :title="metricsStore.serverError"
      icon="i-lucide-triangle-alert"
    />

    <!-- Charts -->
    <div v-else-if="serverMetrics" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- CPU Chart -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            CPU Usage
          </h3>
        </template>
        <ClientOnly>
          <apexchart
            type="area"
            height="300"
            :options="cpuChartOptions"
            :series="cpuChartSeries"
          />
        </ClientOnly>
      </UCard>

      <!-- Memory Chart -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Memory Usage
          </h3>
        </template>
        <ClientOnly>
          <apexchart
            type="area"
            height="300"
            :options="memoryChartOptions"
            :series="memoryChartSeries"
          />
        </ClientOnly>
      </UCard>

      <!-- WebSocket Connections -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            WebSocket Connections
          </h3>
        </template>
        <ClientOnly>
          <apexchart
            type="line"
            height="300"
            :options="wsChartOptions"
            :series="wsChartSeries"
          />
        </ClientOnly>
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
      custom: undefined // Ensure no custom tooltip overrides theme
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

// CPU Chart
const cpuChartOptions = ref(createChartOptions('cpu', ['#3b82f6'], {
  min: 0,
  max: 100,
  labels: {
    formatter: (val) => `${val.toFixed(0)}%`
  }
}))

const cpuChartSeries = computed(() => {
  if (!serverMetrics.value?.server_cpu) return []

  return [{
    name: 'CPU %',
    data: serverMetrics.value.server_cpu.map(m => ({
      x: new Date(m.timestamp).getTime(),
      y: m.percent
    }))
  }]
})

// Memory Chart
const memoryChartOptions = ref(createChartOptions('memory', ['#10b981', '#6b7280'], {
  labels: {
    formatter: (val) => `${val.toFixed(0)} MB`
  }
}))

const memoryChartSeries = computed(() => {
  if (!serverMetrics.value?.server_memory) return []

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
    }
  ]
})

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

// Watch for theme changes and update chart options
watch(isDark, () => {
  cpuChartOptions.value = createChartOptions('cpu', ['#3b82f6'], {
    min: 0,
    max: 100,
    labels: {
      formatter: (val) => `${val.toFixed(0)}%`
    }
  })

  memoryChartOptions.value = createChartOptions('memory', ['#10b981', '#6b7280'], {
    labels: {
      formatter: (val) => `${val.toFixed(0)} MB`
    }
  })

  wsChartOptions.value = createChartOptions('ws', ['#8b5cf6'], {
    labels: {
      formatter: (val) => val.toFixed(0)
    }
  })
})
</script>
