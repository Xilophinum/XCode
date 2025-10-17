<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 overflow-y-auto"
      @click.self="closeModal"
    >
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>

      <!-- Modal content -->
      <div class="flex min-h-screen items-center justify-center p-4">
        <div
          class="relative w-full max-w-4xl transform rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                Audit History
              </h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ entityName }} - {{ entityType === 'project' ? 'Project' : 'Folder' }}
              </p>
            </div>
            <button
              @click="closeModal"
              class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="border-b border-gray-200 dark:border-gray-700 px-6">
            <nav class="-mb-px flex space-x-8">
              <button
                @click="activeTab = 'logs'"
                :class="[
                  activeTab === 'logs'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
                  'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                ]"
              >
                Activity Log
              </button>
              <button
                v-if="entityType === 'project'"
                @click="activeTab = 'versions'"
                :class="[
                  activeTab === 'versions'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
                  'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                ]"
              >
                Version History
              </button>
            </nav>
          </div>

          <!-- Content -->
          <div class="max-h-[600px] overflow-y-auto p-6">
            <!-- Activity Log Tab -->
            <div v-if="activeTab === 'logs'">
              <div v-if="loading" class="flex justify-center py-8">
                <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              </div>

              <div v-else-if="auditLogs.length === 0" class="text-center py-8">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No activity recorded yet</p>
              </div>

              <div v-else class="space-y-4">
                <div
                  v-for="log in auditLogs"
                  :key="log.id"
                  class="flex gap-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <!-- Icon -->
                  <div class="flex-shrink-0">
                    <div :class="[
                      'flex h-10 w-10 items-center justify-center rounded-full',
                      getActionColor(log.action)
                    ]">
                      <component :is="getActionIcon(log.action)" class="h-5 w-5" />
                    </div>
                  </div>

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between">
                      <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                          {{ log.changesSummary || `${log.action} ${log.entityType}` }}
                        </p>
                        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          by {{ log.userName }} • {{ formatDate(log.createdAt) }}
                        </p>
                      </div>
                      <span :class="[
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        getActionBadgeColor(log.action)
                      ]">
                        {{ log.action }}
                      </span>
                    </div>

                    <!-- Show changes if available -->
                    <div v-if="log.previousData || log.newData" class="mt-3">
                      <button
                        @click="toggleDetails(log.id)"
                        class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {{ expandedLogs.has(log.id) ? 'Hide' : 'Show' }} details
                      </button>

                      <div v-if="expandedLogs.has(log.id)" class="mt-2 space-y-2">
                        <!-- Show diagram changes if available -->
                        <div v-if="log.previousData?.diagramChanges" class="rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                          <p class="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2">
                            📊 Diagram Changes
                          </p>

                          <!-- Nodes Added -->
                          <div v-if="log.previousData.diagramChanges.nodesAdded?.length > 0" class="mb-3">
                            <p class="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                              ✅ Added Nodes ({{ log.previousData.diagramChanges.nodesAdded.length }}):
                            </p>
                            <ul class="list-disc list-inside space-y-1">
                              <li v-for="node in log.previousData.diagramChanges.nodesAdded" :key="node.id"
                                  class="text-xs text-gray-700 dark:text-gray-300 ml-2">
                                <span class="font-medium">"{{ node.label }}"</span>
                                <span class="text-gray-500 dark:text-gray-400"> ({{ node.type }})</span>
                              </li>
                            </ul>
                          </div>

                          <!-- Nodes Deleted -->
                          <div v-if="log.previousData.diagramChanges.nodesDeleted?.length > 0" class="mb-3">
                            <p class="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                              ❌ Deleted Nodes ({{ log.previousData.diagramChanges.nodesDeleted.length }}):
                            </p>
                            <ul class="list-disc list-inside space-y-1">
                              <li v-for="node in log.previousData.diagramChanges.nodesDeleted" :key="node.id"
                                  class="text-xs text-gray-700 dark:text-gray-300 ml-2">
                                <span class="font-medium line-through">"{{ node.label }}"</span>
                                <span class="text-gray-500 dark:text-gray-400"> ({{ node.type }})</span>
                              </li>
                            </ul>
                          </div>

                          <!-- Nodes Modified -->
                          <div v-if="log.previousData.diagramChanges.nodesModified?.length > 0" class="mb-3">
                            <p class="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
                              ✏️ Modified Nodes ({{ log.previousData.diagramChanges.nodesModified.length }}):
                            </p>
                            <div v-for="node in log.previousData.diagramChanges.nodesModified" :key="node.id"
                                 class="mb-2 ml-2 border-l-2 border-blue-300 dark:border-blue-600 pl-2">
                              <p class="text-xs font-medium text-gray-800 dark:text-gray-200">
                                "{{ node.label }}"
                              </p>
                              <div v-for="mod in node.modifications" :key="mod.field" class="mt-1">
                                <p class="text-xs text-gray-600 dark:text-gray-400">
                                  <span class="font-medium">{{ mod.field }}:</span>
                                </p>
                                <div class="flex gap-2 items-start mt-0.5">
                                  <div class="flex-1 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
                                    <p class="text-xs text-red-700 dark:text-red-400 font-mono break-words">
                                      {{ formatFieldValue(mod.field, mod.before) }}
                                    </p>
                                  </div>
                                  <span class="text-xs text-gray-400">→</span>
                                  <div class="flex-1 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">
                                    <p class="text-xs text-green-700 dark:text-green-400 font-mono break-words">
                                      {{ formatFieldValue(mod.field, mod.after) }}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <!-- Connections Added -->
                          <div v-if="log.previousData.diagramChanges.edgesAdded?.length > 0" class="mb-3">
                            <p class="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                              🔗 Added Connections ({{ log.previousData.diagramChanges.edgesAdded.length }}):
                            </p>
                            <ul class="list-disc list-inside space-y-1">
                              <li v-for="edge in log.previousData.diagramChanges.edgesAdded" :key="`${edge.source}-${edge.target}`"
                                  class="text-xs text-gray-700 dark:text-gray-300 ml-2">
                                "{{ edge.sourceLabel }}" → "{{ edge.targetLabel }}"
                              </li>
                            </ul>
                          </div>

                          <!-- Connections Deleted -->
                          <div v-if="log.previousData.diagramChanges.edgesDeleted?.length > 0" class="mb-3">
                            <p class="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                              ⛓️‍💥 Deleted Connections ({{ log.previousData.diagramChanges.edgesDeleted.length }}):
                            </p>
                            <ul class="list-disc list-inside space-y-1">
                              <li v-for="edge in log.previousData.diagramChanges.edgesDeleted" :key="`${edge.source}-${edge.target}`"
                                  class="text-xs text-gray-700 dark:text-gray-300 ml-2 line-through">
                                "{{ edge.sourceLabel }}" → "{{ edge.targetLabel }}"
                              </li>
                            </ul>
                          </div>
                        </div>

                        <!-- Show other field changes -->
                        <div v-if="log.previousData" class="rounded bg-gray-100 dark:bg-gray-700 p-2">
                          <p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Before:</p>
                          <pre class="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ formatData(log.previousData) }}</pre>
                        </div>
                        <div v-if="log.newData" class="rounded bg-gray-100 dark:bg-gray-700 p-2">
                          <p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">After:</p>
                          <pre class="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ formatData(log.newData) }}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Version History Tab (Projects only) -->
            <div v-if="activeTab === 'versions'">
              <div v-if="loadingSnapshots" class="flex justify-center py-8">
                <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              </div>

              <div v-else-if="snapshots.length === 0" class="text-center py-8">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No versions saved yet</p>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="snapshot in snapshots"
                  :key="snapshot.id"
                  class="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div class="flex items-center gap-4">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                      <svg class="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">
                        Version {{ snapshot.version }}
                        <span v-if="snapshot.snapshotType === 'manual'" class="ml-2 text-xs text-blue-600 dark:text-blue-400">(Manual)</span>
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ snapshot.description || 'No description' }}
                      </p>
                      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        by {{ snapshot.createdByName }} • {{ formatDate(snapshot.createdAt) }}
                      </p>
                    </div>
                  </div>

                  <button
                    @click="revertToVersion(snapshot.version)"
                    :disabled="reverting"
                    class="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Revert
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  entityId: {
    type: String,
    required: true
  },
  entityName: {
    type: String,
    required: true
  },
  entityType: {
    type: String,
    required: true,
    validator: (value) => ['folder', 'project'].includes(value)
  }
})

const emit = defineEmits(['close', 'reverted'])

const activeTab = ref('logs')
const auditLogs = ref([])
const snapshots = ref([])
const loading = ref(false)
const loadingSnapshots = ref(false)
const reverting = ref(false)
const expandedLogs = ref(new Set())

// Watch for modal open to fetch data
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    activeTab.value = 'logs'
    await fetchAuditLogs()
    if (props.entityType === 'project') {
      await fetchSnapshots()
    }
  }
})

const fetchAuditLogs = async () => {
  loading.value = true
  try {
    const response = await $fetch(`/api/audit/${props.entityId}`, {
      params: { limit: 50 }
    })
    auditLogs.value = response.logs || []
  } catch (error) {
    console.error('Error fetching audit logs:', error)
  } finally {
    loading.value = false
  }
}

const fetchSnapshots = async () => {
  loadingSnapshots.value = true
  try {
    const response = await $fetch(`/api/projects/${props.entityId}/snapshots`, {
      params: { limit: 20 }
    })
    snapshots.value = response.snapshots || []
  } catch (error) {
    console.error('Error fetching snapshots:', error)
  } finally {
    loadingSnapshots.value = false
  }
}

const revertToVersion = async (version) => {
  if (!confirm(`Are you sure you want to revert to version ${version}? This will overwrite the current configuration.`)) {
    return
  }

  reverting.value = true
  try {
    const response = await $fetch(`/api/projects/${props.entityId}/revert`, {
      method: 'POST',
      body: { version }
    })

    alert(`Successfully reverted to version ${version}`)
    emit('reverted', response.project)

    // Refresh logs and snapshots
    await fetchAuditLogs()
    await fetchSnapshots()
  } catch (error) {
    console.error('Error reverting:', error)
    alert('Failed to revert to version: ' + (error.data?.message || error.message))
  } finally {
    reverting.value = false
  }
}

const toggleDetails = (logId) => {
  if (expandedLogs.value.has(logId)) {
    expandedLogs.value.delete(logId)
  } else {
    expandedLogs.value.add(logId)
  }
}

const closeModal = () => {
  emit('close')
}

const getActionIcon = (action) => {
  const icons = {
    create: 'svg',
    update: 'svg',
    delete: 'svg',
    restore: 'svg'
  }
  // Return raw SVG component (simplified for now)
  return 'svg'
}

const getActionColor = (action) => {
  const colors = {
    create: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    update: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    delete: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
    restore: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
  }
  return colors[action] || 'bg-gray-100 text-gray-600'
}

const getActionBadgeColor = (action) => {
  const colors = {
    create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    restore: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
  }
  return colors[action] || 'bg-gray-100 text-gray-800'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatData = (data) => {
  if (!data) return 'N/A'

  // Create a copy without the diagramChanges (shown separately)
  const { diagramChanges, ...rest } = data

  // Only show relevant fields for display
  const filtered = {
    name: rest.name,
    description: rest.description,
    status: rest.status,
    maxBuildsToKeep: rest.maxBuildsToKeep,
    maxLogDays: rest.maxLogDays,
    allowedGroups: rest.allowedGroups
  }

  // Remove undefined fields
  Object.keys(filtered).forEach(key => {
    if (filtered[key] === undefined) {
      delete filtered[key]
    }
  })

  return JSON.stringify(filtered, null, 2)
}

const formatFieldValue = (field, value) => {
  if (!value && value !== 0 && value !== false) return '(empty)'

  // For script/code fields, show a preview if too long
  if ((field === 'script' || field === 'code') && value.length > 100) {
    return value.substring(0, 100) + '... (' + value.length + ' chars)'
  }

  // For configuration fields, try to parse and format nicely
  if (field.includes('_config') || field === 'webhook_config' || field === 'job_trigger_config') {
    try {
      const parsed = JSON.parse(value)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return value
    }
  }

  // For cron expressions, show as-is
  if (field === 'cron_expression') {
    return value
  }

  // For conditions, show as-is
  if (field === 'condition') {
    return value
  }

  return value
}
</script>
