<template>
  <div v-if="isRunning" class="mt-2">
    <div class="flex items-center justify-between text-xs mb-1">
      <span :class="progressTextColor">Running {{ formatDuration(elapsedTime) }}</span>
      <span :class="progressTextColor">{{ Math.round(progress) }}%</span>
    </div>
    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div 
        :class="progressBarColor"
        class="h-2 rounded-full transition-all duration-300"
        :style="{ width: `${Math.min(progress, 100)}%` }"
      ></div>
    </div>
  </div>
  <div v-else class="mt-2 mb-1 h-8"></div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  },
  buildStats: {
    type: Object,
    default: null
  }
})

const webSocketStore = useWebSocketStore()
const elapsedTime = ref(0)
const intervalId = ref(null)

const currentJob = computed(() => {
  return webSocketStore.getCurrentJob(props.projectId)
})

const isRunning = computed(() => {
  return webSocketStore.isProjectJobRunning(props.projectId)
})

const progress = computed(() => {
  if (!isRunning.value || !props.buildStats) return 0

  const { fastestBuild, slowestBuild, averageDuration } = props.buildStats

  // If no historical data, use average duration for estimation
  if (!fastestBuild || !slowestBuild || !averageDuration) {
    if (averageDuration > 0) {
      const calc = (elapsedTime.value / averageDuration) * 100
      return calc
    }
    const calc = (elapsedTime.value / 60000) * 100
    return calc
  }

  // Use average duration for more predictable progress
  // The old "range" method caused 0% for the first fastestBuild milliseconds
  const calc = Math.min(100, (elapsedTime.value / averageDuration) * 100)
  return calc
})

const isOverAverage = computed(() => {
  if (!props.buildStats?.averageDuration) return false
  return elapsedTime.value > (props.buildStats.averageDuration + 30000) // +30 seconds
})

const progressBarColor = computed(() => {
  if (isOverAverage.value) {
    return 'bg-red-500 dark:bg-red-600'
  }
  return 'bg-blue-500 dark:bg-blue-600'
})

const progressTextColor = computed(() => {
  if (isOverAverage.value) {
    return 'text-red-600 dark:text-red-400'
  }
  return 'text-blue-600 dark:text-blue-400'
})

const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${remainingSeconds}s`
}

const updateElapsedTime = () => {
  if (currentJob.value?.startTime) {
    const startTime = new Date(currentJob.value.startTime).getTime()
    elapsedTime.value = Date.now() - startTime
  } else {
    console.warn(`⚠️ [${props.projectId}] Cannot update elapsed time - no startTime available`, currentJob.value)
  }
}

const startProgressTracking = () => {
  // Clear any existing interval
  if (intervalId.value) {
    clearInterval(intervalId.value)
    intervalId.value = null
  }

  // Update immediately to sync with current time
  updateElapsedTime()

  // Start interval
  intervalId.value = setInterval(updateElapsedTime, 1000)
}

const stopProgressTracking = () => {
  if (intervalId.value) {
    clearInterval(intervalId.value)
    intervalId.value = null
  }
  elapsedTime.value = 0
}

onMounted(() => {
  if (isRunning.value) {
    startProgressTracking()
  }
})

onUnmounted(() => {
  stopProgressTracking()
})

// Watch for job status changes
watch(isRunning, (newValue, oldValue) => {
  if (newValue) {
    startProgressTracking()
  } else {
    stopProgressTracking()
  }
})

// Watch for currentJob changes (in case job data arrives after mount)
watch(currentJob, (newJob, oldJob) => {
  if (newJob && !oldJob) {
    if (isRunning.value && !intervalId.value) {
      startProgressTracking()
    }
  }
}, { deep: true })
</script>