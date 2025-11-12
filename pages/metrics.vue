<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Navigation -->
    <AppNavigation :breadcrumbs="['metrics']">
      <template #mobile-actions>
        <!-- Mobile: Time Range + Refresh -->
        <USelect
          v-model="selectedTimeRange"
          :items="timeRangeOptions"
          :placeholder="$t('metrics.range')"
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
          :placeholder="$t('metrics.selectTimeRange')"
          class="w-48"
        />
        <UButton
          :variant="autoRefresh ? 'solid' : 'outline'"
          @click="toggleAutoRefresh"
        >
          <UIcon name="i-lucide-refresh-cw" class="h-5 w-5 text-black animate-spin" v-if="autoRefresh"/>
          <UIcon name="i-lucide-pause" class="h-5 w-5 text-primary animate-pulse" v-else/>
          {{ autoRefresh ? $t('metrics.autoRefresh') : $t('metrics.paused') }}
        </UButton>
        <UButton
          v-if ="!autoRefresh"
          icon="i-lucide-refresh-cw"
          variant="outline"
          :loading="isLoading"
          @click="refreshAll"
        >
          {{ $t('metrics.refresh') }}
        </UButton>
      </template>
    </AppNavigation>

    <!-- Main Content -->
    <main class="max-w-8xl mx-auto py-4 sm:px-6 lg:px-8">
      <div class="px-4 sm:px-0">
        <!-- Page Header -->
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-950 dark:text-white">{{ $t('metrics.title') }}</h1>
          <div class="flex items-center justify-between mt-2">
            <p class="text-gray-600 dark:text-gray-300">
              {{ $t('metrics.subtitle') }}
            </p>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ $t('metrics.lastUpdated') }} {{ getReactiveRelativeTime(lastRefresh) }}
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
const timeRangeOptions = computed(() => [
  { label: $t('metrics.lastHour'), value: '1h' },
  { label: $t('metrics.last8Hours'), value: '8h' },
  { label: $t('metrics.last24Hours'), value: '24h' },
  { label: $t('metrics.last3Days'), value: '3d' },
  { label: $t('metrics.last7Days'), value: '7d' }
])

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
  { slot: 'overview', label: isMobile.value ? '' : $t('metrics.overview'), icon: 'i-lucide-bar-chart' },
  { slot: 'server', label: isMobile.value ? '' : $t('metrics.server'), icon: 'i-lucide-server' },
  { slot: 'agents', label: isMobile.value ? '' : $t('metrics.agents'), icon: 'i-lucide-cpu' },
  { slot: 'builds', label: isMobile.value ? '' : $t('metrics.builds'), icon: 'i-lucide-box' },
  { slot: 'api', label: isMobile.value ? '' : $t('metrics.apiPerformance'), icon: 'i-lucide-activity' },
  { slot: 'alerts', label: isMobile.value ? '' : $t('metrics.alerts'), icon: 'i-lucide-bell-ring' },
  { slot: 'comparison', label: isMobile.value ? '' : $t('metrics.comparison'), icon: 'i-lucide-grid-2x2' }
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
  if (!dateString) return $t('metrics.never')

  const date = new Date(dateString)
  const diffInSeconds = Math.floor((currentTime.value - date.getTime()) / 1000)
  if (diffInSeconds < 5) return $t('metrics.justNow')
  if (diffInSeconds < 60) return $t('metrics.secondsAgo').replace('{count}', diffInSeconds)
  if (diffInSeconds < 3600) return $t('metrics.minutesAgo').replace('{count}', Math.floor(diffInSeconds / 60))
  if (diffInSeconds < 86400) return $t('metrics.hoursAgo').replace('{count}', Math.floor(diffInSeconds / 3600))
  return $t('metrics.daysAgo').replace('{count}', Math.floor(diffInSeconds / 86400))
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
