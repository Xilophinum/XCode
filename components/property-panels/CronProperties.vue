<template>
    <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Cron Expression <span class="text-red-500">*</span>
        </label>
        <input
            v-model="nodeData.data.cronExpression"
            type="text"
            class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono"
            placeholder="0 0 * * * (every hour at minute 0)"
        />
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Enter a cron expression. Format: minute hour day month dayOfWeek
        </p>
        
        <!-- Cron presets -->
        <div class="mt-2">
            <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Quick Presets:</label>
            <div class="grid grid-cols-2 gap-1">
            <button
                @click="nodeData.data.cronExpression = '0 * * * *'"
                class="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded"
            >
                Every hour
            </button>
            <button
                @click="nodeData.data.cronExpression = '0 0 * * *'"
                class="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded"
            >
                Daily at midnight
            </button>
            <button
                @click="nodeData.data.cronExpression = '0 0 * * 1'"
                class="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded"
            >
                Weekly (Monday)
            </button>
            <button
                @click="nodeData.data.cronExpression = '0 0 1 * *'"
                class="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded"
            >
                Monthly (1st)
            </button>
            </div>
        </div>
        
        <!-- Cron status -->
        <div class="mt-3 p-2 bg-amber-50 dark:bg-amber-950 rounded text-xs">
            <div class="font-medium text-amber-800 dark:text-amber-200 mb-1">⏰ Scheduling Status:</div>
            <div class="text-amber-700 dark:text-amber-300">
            <div v-if="nodeData.data.cronExpression && cronInfo.isValid" class="space-y-1">
                <div class="font-medium">{{ cronInfo.description }}</div>
                <div v-if="cronInfo.nextRun" class="text-xs">
                Next run: {{ new Date(cronInfo.nextRun).toLocaleString() }}
                </div>
                <div class="text-xs opacity-75">
                Expression: {{ nodeData.data.cronExpression }}
                </div>
            </div>
            <div v-else-if="nodeData.data.cronExpression && !cronInfo.isValid" class="text-red-600 dark:text-red-400">
                {{ cronInfo.description }}
            </div>
            <span v-else class="text-red-600 dark:text-red-400">
                No cron expression configured
            </span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Cron } from 'croner'

const props = defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})

// Computed property for cron information
const cronInfo = ref({ description: 'No cron expression configured', nextRun: null, isValid: false })

// Cron expression parsing and formatting
const parseCronExpression = async (cronExpression) => {
  if (!cronExpression || typeof cronExpression !== 'string') {
    return {
      description: 'Invalid cron expression',
      nextRun: null,
      isValid: false
    }
  }

  try {
    // Create a cron instance to validate and get next run time
    const cron = new Cron(cronExpression, { paused: true })
    
    // Get next execution time
    const nextRun = cron.nextRun()
    
    // Generate human-readable description
    const description = getCronDescription(cronExpression)
    
    return {
      description,
      nextRun,
      isValid: true
    }
  } catch (error) {
    return {
      description: 'Invalid cron expression',
      nextRun: null,
      isValid: false
    }
  }
}

const getCronDescription = (cronExpression) => {
  const parts = cronExpression.trim().split(/\s+/)
  if (parts.length !== 5) {
    return 'Invalid format (should be: minute hour day month dayOfWeek)'
  }

  const [minute, hour, day, month, dayOfWeek] = parts

  // Common patterns
  const commonPatterns = {
    '0 0 * * *': 'Daily at midnight',
    '0 * * * *': 'Every hour',
    '*/5 * * * *': 'Every 5 minutes',
    '*/10 * * * *': 'Every 10 minutes',
    '*/15 * * * *': 'Every 15 minutes',
    '*/30 * * * *': 'Every 30 minutes',
    '0 0 * * 0': 'Weekly on Sunday at midnight',
    '0 0 * * 1': 'Weekly on Monday at midnight',
    '0 0 1 * *': 'Monthly on the 1st at midnight',
    '0 0 1 1 *': 'Yearly on January 1st at midnight',
    '0 9 * * 1-5': 'Weekdays at 9:00 AM',
    '0 18 * * 1-5': 'Weekdays at 6:00 PM'
  }

  if (commonPatterns[cronExpression]) {
    return commonPatterns[cronExpression]
  }

  // Build description from parts
  let description = ''

  // Minute
  if (minute === '*') {
    description += 'every minute'
  } else if (minute.includes('/')) {
    const interval = minute.split('/')[1]
    description += `every ${interval} minutes`
  } else if (minute.includes(',')) {
    description += `at minutes ${minute}`
  } else {
    description += `at minute ${minute}`
  }

  // Hour
  if (hour !== '*') {
    if (hour.includes('/')) {
      const interval = hour.split('/')[1]
      description += `, every ${interval} hours`
    } else if (hour.includes(',')) {
      description += `, at hours ${hour}`
    } else {
      const hourNum = parseInt(hour)
      const ampm = hourNum < 12 ? 'AM' : 'PM'
      const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum
      description += `, at ${displayHour}:${minute.padStart(2, '0')} ${ampm}`
    }
  }

  // Day of month
  if (day !== '*') {
    if (day.includes('/')) {
      const interval = day.split('/')[1]
      description += `, every ${interval} days`
    } else {
      description += `, on day ${day} of the month`
    }
  }

  // Month
  if (month !== '*') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    if (month.includes(',')) {
      const monthNums = month.split(',').map(m => months[parseInt(m) - 1])
      description += `, in ${monthNums.join(', ')}`
    } else {
      description += `, in ${months[parseInt(month) - 1]}`
    }
  }

  // Day of week
  if (dayOfWeek !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    if (dayOfWeek.includes(',')) {
      const dayNums = dayOfWeek.split(',').map(d => days[parseInt(d)])
      description += `, on ${dayNums.join(', ')}`
    } else if (dayOfWeek.includes('-')) {
      const [start, end] = dayOfWeek.split('-').map(d => parseInt(d))
      description += `, from ${days[start]} to ${days[end]}`
    } else if (dayOfWeek === '1-5') {
      description += ', on weekdays'
    } else if (dayOfWeek === '0,6') {
      description += ', on weekends'
    } else {
      description += `, on ${days[parseInt(dayOfWeek)]}`
    }
  }

  // Capitalize first letter
  return description.charAt(0).toUpperCase() + description.slice(1)
}

// Watch for changes to selected node cron expression
watch(() => props.nodeData?.data?.cronExpression, async (newExpression) => {
  if (newExpression && props.nodeData?.data?.nodeType === 'cron') {
    cronInfo.value = await parseCronExpression(newExpression)
  } else {
    cronInfo.value = { description: 'No cron expression configured', nextRun: null, isValid: false }
  }
}, { immediate: true })
</script>