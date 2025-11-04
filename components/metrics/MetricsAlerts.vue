<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Active Alerts
        </h3>
        <UBadge v-if="alertCount > 0" :color="criticalAlertCount > 0 ? 'red' : 'yellow'">
          {{ alertCount }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-3">
      <!-- No Alerts -->
      <div v-if="alerts.length === 0" class="text-center py-8">
        <UIcon name="i-lucide-check-circle" class="w-12 h-12 mx-auto text-green-500 dark:text-green-400 mb-3" />
        <p class="text-gray-600 dark:text-gray-400">All systems operating normally</p>
      </div>

      <!-- Alert List -->
      <div v-for="alert in alerts" :key="alert.id" class="flex items-start gap-3 p-4 rounded-lg border" :class="getAlertClasses(alert.severity)">
        <UIcon :name="getAlertIcon(alert.type)" class="w-5 h-5 flex-shrink-0 mt-0.5" :class="getAlertIconColor(alert.severity)" />

        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-1">
            <h4 class="font-medium text-gray-900 dark:text-white">
              {{ alert.title }}
            </h4>
            <UBadge :color="getAlertSeverityColor(alert.severity)" size="xs">
              {{ alert.severity }}
            </UBadge>
          </div>

          <p class="text-sm text-gray-600 dark:text-gray-300 mb-2">
            {{ alert.message }}
          </p>

          <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{{ alert.agentName || 'Server' }}</span>
            <span>•</span>
            <span>{{ formatTimestamp(alert.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup>
import { computed } from 'vue'
const metricsStore = useMetricsStore()
const { toLocalTime, getRelativeTime } = useTimezone()

// Alert thresholds
const THRESHOLDS = {
  cpu: { warning: 70, critical: 90 },
  memory: { warning: 75, critical: 90 },
  disk: { warning: 80, critical: 95 }
}

const alerts = computed(() => {
  const alertList = []

  // Check server metrics
  if (metricsStore.summary?.server) {
    const server = metricsStore.summary.server

    // Server CPU
    if (server.cpu?.percent >= THRESHOLDS.cpu.critical) {
      alertList.push({
        id: 'server-cpu-critical',
        type: 'cpu',
        severity: 'critical',
        title: 'Server CPU Critical',
        message: `CPU usage at ${server.cpu.percent}% (threshold: ${THRESHOLDS.cpu.critical}%)`,
        timestamp: new Date().toISOString(),
        agentName: null
      })
    } else if (server.cpu?.percent >= THRESHOLDS.cpu.warning) {
      alertList.push({
        id: 'server-cpu-warning',
        type: 'cpu',
        severity: 'warning',
        title: 'Server CPU High',
        message: `CPU usage at ${server.cpu.percent}% (threshold: ${THRESHOLDS.cpu.warning}%)`,
        timestamp: new Date().toISOString(),
        agentName: null
      })
    }

    // Server Memory
    if (server.memory?.percent >= THRESHOLDS.memory.critical) {
      alertList.push({
        id: 'server-memory-critical',
        type: 'memory',
        severity: 'critical',
        title: 'Server Memory Critical',
        message: `Memory usage at ${server.memory.percent}% (threshold: ${THRESHOLDS.memory.critical}%)`,
        timestamp: new Date().toISOString(),
        agentName: null
      })
    } else if (server.memory?.percent >= THRESHOLDS.memory.warning) {
      alertList.push({
        id: 'server-memory-warning',
        type: 'memory',
        severity: 'warning',
        title: 'Server Memory High',
        message: `Memory usage at ${server.memory.percent}% (threshold: ${THRESHOLDS.memory.warning}%)`,
        timestamp: new Date().toISOString(),
        agentName: null
      })
    }
  }

  // Check agent metrics
  if (metricsStore.summary?.agents?.agents) {
    metricsStore.summary.agents.agents.forEach(agent => {
      const agentMetrics = agent.systemMetrics || {}

      // Agent CPU
      if (agentMetrics.cpuUsage >= THRESHOLDS.cpu.critical) {
        alertList.push({
          id: `agent-${agent.id}-cpu-critical`,
          type: 'cpu',
          severity: 'critical',
          title: `Agent CPU Critical`,
          message: `CPU usage at ${agentMetrics.cpuUsage}% (threshold: ${THRESHOLDS.cpu.critical}%)`,
          timestamp: agentMetrics.timestamp || new Date().toISOString(),
          agentName: agent.name
        })
      } else if (agentMetrics.cpuUsage >= THRESHOLDS.cpu.warning) {
        alertList.push({
          id: `agent-${agent.id}-cpu-warning`,
          type: 'cpu',
          severity: 'warning',
          title: `Agent CPU High`,
          message: `CPU usage at ${agentMetrics.cpuUsage}% (threshold: ${THRESHOLDS.cpu.warning}%)`,
          timestamp: agentMetrics.timestamp || new Date().toISOString(),
          agentName: agent.name
        })
      }

      // Agent Memory
      if (agentMetrics.memoryUsage >= THRESHOLDS.memory.critical) {
        alertList.push({
          id: `agent-${agent.id}-memory-critical`,
          type: 'memory',
          severity: 'critical',
          title: `Agent Memory Critical`,
          message: `Memory usage at ${agentMetrics.memoryUsage}% (threshold: ${THRESHOLDS.memory.critical}%)`,
          timestamp: agentMetrics.timestamp || new Date().toISOString(),
          agentName: agent.name
        })
      } else if (agentMetrics.memoryUsage >= THRESHOLDS.memory.warning) {
        alertList.push({
          id: `agent-${agent.id}-memory-warning`,
          type: 'memory',
          severity: 'warning',
          title: `Agent Memory High`,
          message: `Memory usage at ${agentMetrics.memoryUsage}% (threshold: ${THRESHOLDS.memory.warning}%)`,
          timestamp: agentMetrics.timestamp || new Date().toISOString(),
          agentName: agent.name
        })
      }

      // Agent Disk
      if (agentMetrics.diskUsage >= THRESHOLDS.disk.critical) {
        alertList.push({
          id: `agent-${agent.id}-disk-critical`,
          type: 'disk',
          severity: 'critical',
          title: `Agent Disk Critical`,
          message: `Disk usage at ${agentMetrics.diskUsage}% (threshold: ${THRESHOLDS.disk.critical}%)`,
          timestamp: agentMetrics.timestamp || new Date().toISOString(),
          agentName: agent.name
        })
      } else if (agentMetrics.diskUsage >= THRESHOLDS.disk.warning) {
        alertList.push({
          id: `agent-${agent.id}-disk-warning`,
          type: 'disk',
          severity: 'warning',
          title: `Agent Disk High`,
          message: `Disk usage at ${agentMetrics.diskUsage}% (threshold: ${THRESHOLDS.disk.warning}%)`,
          timestamp: agentMetrics.timestamp || new Date().toISOString(),
          agentName: agent.name
        })
      }

      // Agent Offline
      if (agent.status === 'offline') {
        alertList.push({
          id: `agent-${agent.id}-offline`,
          type: 'status',
          severity: 'warning',
          title: `Agent Offline`,
          message: `Agent has disconnected or timed out`,
          timestamp: agent.lastHeartbeat || new Date().toISOString(),
          agentName: agent.name
        })
      }
    })
  }

  // Sort by severity (critical first) then by timestamp
  return alertList.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1
    if (a.severity !== 'critical' && b.severity === 'critical') return 1
    return new Date(b.timestamp) - new Date(a.timestamp)
  })
})

const alertCount = computed(() => alerts.value.length)
const criticalAlertCount = computed(() => alerts.value.filter(a => a.severity === 'critical').length)

function getAlertClasses(severity) {
  const classes = {
    critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
  }
  return classes[severity] || classes.info
}

function getAlertIcon(type) {
  const icons = {
    cpu: 'i-lucide-cpu',
    memory: 'i-lucide-monitor',
    disk: 'i-lucide-server',
    status: 'i-lucide-alert-circle'
  }
  return icons[type] || 'i-lucide-triangle-alert'
}

function getAlertIconColor(severity) {
  const colors = {
    critical: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400'
  }
  return colors[severity] || colors.info
}

function getAlertSeverityColor(severity) {
  const colors = {
    critical: 'danger',
    warning: 'warning',
    info: 'blue'
  }
  return colors[severity] || 'neutral'
}

function formatTimestamp(timestamp) {
  const relativeTime = getRelativeTime(timestamp)
  // If it's a relative time (not a date), return it
  if (relativeTime.includes('ago') || relativeTime === 'Just now') {
    return relativeTime
  }
  // Otherwise return the formatted local time
  return toLocalTime(timestamp)
}
</script>
