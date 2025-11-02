<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              System Metrics
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Monitor server, agent, and build performance
            </p>
          </div>

          <div class="flex items-center gap-4">
            <!-- Time Range Selector -->
            <USelect
              v-model="selectedTimeRange"
              :options="timeRangeOptions"
              placeholder="Select time range"
              class="w-48"
            />

            <!-- Auto-refresh Toggle -->
            <UButton
              :icon="autoRefresh ? 'i-lucide-refresh-cw' : 'i-lucide-pause'"
              :variant="autoRefresh ? 'solid' : 'outline'"
              :label="autoRefresh ? 'Auto-refresh' : 'Paused'"
              @click="toggleAutoRefresh"
            />

            <!-- Manual Refresh -->
            <UButton
              icon="i-lucide-refresh-cw"
              variant="outline"
              :loading="isLoading"
              @click="refreshAll"
            >
              Refresh
            </UButton>
          </div>
        </div>

        <!-- Last Updated -->
        <div v-if="lastRefresh" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Last updated: {{ formatTimestamp(lastRefresh) }}
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <UTabs :items="tabs" :unmountOnHide="false" @update:modelValue="changTab" />

      <!-- Tab Content - Always mounted, toggled with v-show -->
      <div class="mt-6">
        <div v-show="activeTab === 0">
          <MetricsOverview />
        </div>
        <div v-show="activeTab === 1">
          <MetricsServer />
        </div>
        <div v-show="activeTab === 2">
          <MetricsAgents />
        </div>
        <div v-show="activeTab === 3">
          <MetricsBuilds />
        </div>
        <div v-show="activeTab === 4">
          <MetricsAPI />
        </div>
        <div v-show="activeTab === 5">
          <MetricsAlerts />
        </div>
        <div v-show="activeTab === 6">
          <MetricsComparison />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MetricsOverview from '~/components/metrics/MetricsOverview.vue'
import MetricsServer from '~/components/metrics/MetricsServer.vue'
import MetricsAgents from '~/components/metrics/MetricsAgents.vue'
import MetricsBuilds from '~/components/metrics/MetricsBuilds.vue'
import MetricsAPI from '~/components/metrics/MetricsAPI.vue'
import MetricsAlerts from '~/components/metrics/MetricsAlerts.vue'
import MetricsComparison from '~/components/metrics/MetricsComparison.vue'

// Authentication check
const authStore = useAuthStore()
const router = useRouter()
const darkMode = useDarkMode()

if (!authStore.isAuthenticated || authStore.user?.role !== 'admin') {
  router.push('/login')
}

definePageMeta({
  layout: false,
  middleware: ['auth', 'admin']
})

// Stores
const metricsStore = useMetricsStore()
const wsStore = useWebSocketStore()

// State
const activeTab = ref(0)
const refreshIntervalId = ref(null)

// Time range options
const timeRangeOptions = [
  { label: 'Last Hour', value: '1h' },
  { label: 'Last 24 Hours', value: '24h' },
  { label: 'Last 7 Days', value: '7d' }
]

// Computed
const selectedTimeRange = computed({
  get: () => metricsStore.timeRange,
  set: (value) => metricsStore.setTimeRange(value)
})

const autoRefresh = computed(() => metricsStore.autoRefresh)
const lastRefresh = computed(() => metricsStore.lastRefresh)

const isLoading = computed(() =>
  metricsStore.summaryLoading ||
  metricsStore.serverLoading ||
  metricsStore.agentLoading ||
  metricsStore.buildLoading ||
  metricsStore.apiLoading
)

// Tabs
const tabs = [
  { slot: 'overview', label: 'Overview', icon: 'i-lucide-bar-chart' },
  { slot: 'server', label: 'Server', icon: 'i-lucide-server' },
  { slot: 'agents', label: 'Agents', icon: 'i-lucide-cpu' },
  { slot: 'builds', label: 'Builds', icon: 'i-lucide-box' },
  { slot: 'api', label: 'API Performance', icon: 'i-lucide-activity' },
  { slot: 'alerts', label: 'Alerts', icon: 'i-lucide-bell-ring' },
  { slot: 'comparison', label: 'Comparison', icon: 'i-lucide-grid-2x2' }
]

// Methods
function toggleAutoRefresh() {
  metricsStore.toggleAutoRefresh()

  if (metricsStore.autoRefresh) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

function refreshAll() {
  metricsStore.fetchAll()
}

function changTab(index) {
  activeTab.value = Number(index)
}

function startAutoRefresh() {
  stopAutoRefresh()

  refreshIntervalId.value = setInterval(() => {
    if (metricsStore.autoRefresh) {
      metricsStore.fetchAll()
    }
  }, metricsStore.refreshInterval)
}

function stopAutoRefresh() {
  if (refreshIntervalId.value) {
    clearInterval(refreshIntervalId.value)
    refreshIntervalId.value = null
  }
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`

  return date.toLocaleString()
}

// WebSocket listener for real-time updates
function handleMetricsUpdate(data) {
  metricsStore.handleRealtimeUpdate(data)
}

// Lifecycle
onMounted(async () => {
  // Initial fetch
  await metricsStore.fetchAll()

  // Start auto-refresh if enabled
  if (metricsStore.autoRefresh) {
    startAutoRefresh()
  }

  // Listen for WebSocket metrics updates
  if (wsStore.socket) {
    wsStore.socket.on('metrics_update', handleMetricsUpdate)
  }
})

onUnmounted(() => {
  stopAutoRefresh()

  // Remove WebSocket listener
  if (wsStore.socket) {
    wsStore.socket.off('metrics_update', handleMetricsUpdate)
  }
})
</script>
