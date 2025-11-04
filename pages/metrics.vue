<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Navigation -->
    <AppNavigation :breadcrumbs="['metrics']">
      <template #mobile-actions>
        <!-- Mobile: Time Range + Refresh -->
        <USelect
          v-model="selectedTimeRange"
          :items="timeRangeOptions"
          placeholder="Range"
          class="w-32"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          variant="outline"
          size="sm"
          :loading="isLoading"
          @click="refreshAll"
        />
      </template>
      <template #actions>
        <!-- Desktop: Full Controls -->
        <USelect
          v-model="selectedTimeRange"
          :items="timeRangeOptions"
          placeholder="Select time range"
          class="w-48"
        />
        <UButton
          :variant="autoRefresh ? 'solid' : 'outline'"
          @click="toggleAutoRefresh"
        >
          <UIcon name="i-lucide-refresh-cw" class="h-5 w-5 text-black animate-spin" v-if="autoRefresh"/>
          <UIcon name="i-lucide-pause" class="h-5 w-5 text-primary animate-pulse" v-else/>
          {{ autoRefresh ? 'Auto-Refresh' : 'Paused' }}
        </UButton>
        <UButton
          v-if ="!autoRefresh"
          icon="i-lucide-refresh-cw"
          variant="outline"
          :loading="isLoading"
          @click="refreshAll"
        >
          Refresh
        </UButton>
      </template>
    </AppNavigation>

    <!-- Main Content -->
    <main class="max-w-8xl mx-auto py-4 sm:px-6 lg:px-8">
      <div class="px-4 sm:px-0">
        <!-- Page Header -->
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-950 dark:text-white">System Metrics</h1>
          <div class="flex items-center justify-between mt-2">
            <p class="text-gray-600 dark:text-gray-300">
              Monitor server, agent, and build performance
            </p>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {{ getReactiveRelativeTime(lastRefresh) }}
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="mb-6">
          <UTabs
            :items="tabs"
            :unmountOnHide="false"
            @update:modelValue="changTab"
          />
        </div>

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
    </main>
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

// Stores
const authStore = useAuthStore()
const router = useRouter()

definePageMeta({
  layout: false,
  middleware: ['auth', 'admin']
})

const metricsStore = useMetricsStore()
const wsStore = useWebSocketStore()

// Timezone composable
const { fetchTimezone } = useTimezone()

// State
const activeTab = ref(0)
const isAuthorized = ref(false)
const refreshIntervalId = ref(null)
const currentTime = ref(Date.now())

// Time range options
const timeRangeOptions = [
  { label: 'Last Hour', value: '1h' },
  { label: 'Last 8 Hours', value: '8h' },
  { label: 'Last 24 Hours', value: '24h' },
  { label: 'Last 3 Days', value: '3d' },
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

// Tabs - Responsive labels
const isMobile = ref(false)

// Check viewport width
const checkViewport = () => {
  isMobile.value = window.innerWidth < 768 // md breakpoint
}

const tabs = computed(() => [
  { slot: 'overview', label: isMobile.value ? '' : 'Overview', icon: 'i-lucide-bar-chart' },
  { slot: 'server', label: isMobile.value ? '' : 'Server', icon: 'i-lucide-server' },
  { slot: 'agents', label: isMobile.value ? '' : 'Agents', icon: 'i-lucide-cpu' },
  { slot: 'builds', label: isMobile.value ? '' : 'Builds', icon: 'i-lucide-box' },
  { slot: 'api', label: isMobile.value ? '' : 'API Performance', icon: 'i-lucide-activity' },
  { slot: 'alerts', label: isMobile.value ? '' : 'Alerts', icon: 'i-lucide-bell-ring' },
  { slot: 'comparison', label: isMobile.value ? '' : 'Comparison', icon: 'i-lucide-grid-2x2' }
])

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
let timeUpdateInterval = null
// Lifecycle
onMounted(async () => {
  // Check authorization first
  if (!authStore.isAuthenticated || authStore.user?.role !== 'admin') {
    router.push('/login')
    return
  }
  
  isAuthorized.value = true

  // Check viewport for responsive tabs
  checkViewport()
  window.addEventListener('resize', checkViewport)
  timeUpdateInterval = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)

  // Fetch timezone setting
  await fetchTimezone()

  // Initial fetch
  await metricsStore.fetchAll()

  // Start auto-refresh if enabled
  if (metricsStore.autoRefresh) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  // Cleanup resize listener
  window.removeEventListener('resize', checkViewport)
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
  }
  stopAutoRefresh()
})
</script>

<style scoped>
html {
  scroll-behavior: smooth;
}
</style>
