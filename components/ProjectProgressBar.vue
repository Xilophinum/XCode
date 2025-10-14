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
  
  if (!fastestBuild || !slowestBuild) return 0
  
  const range = slowestBuild - fastestBuild
  if (range <= 0) return 50 // Default to 50% if no range
  
  const progressInRange = (elapsedTime.value - fastestBuild) / range
  return Math.max(0, Math.min(100, progressInRange * 100))
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
  }
}

onMounted(() => {
  if (isRunning.value) {
    updateElapsedTime()
    intervalId.value = setInterval(updateElapsedTime, 1000)
  }
})

onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value)
  }
})

// Watch for job status changes
watch(isRunning, (newValue) => {
  if (newValue) {
    updateElapsedTime()
    intervalId.value = setInterval(updateElapsedTime, 1000)
  } else {
    if (intervalId.value) {
      clearInterval(intervalId.value)
      intervalId.value = null
    }
    elapsedTime.value = 0
  }
})
</script>