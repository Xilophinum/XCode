<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Navigation -->
    <AppNavigation :breadcrumbs="['agents']" />

    <!-- Main Content -->
    <main class="max-w-8xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ $t('agents.title') }}</h1>
          <p class="mt-2 text-gray-600 dark:text-gray-300">
            {{ $t('agents.subtitle') }}
          </p>
        </div>
        <div class="flex gap-2">
          <button
            @click="showAddAgentModal = true"
            class="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto w-full"
          >
            <UIcon name="i-lucide-plus" class="w-4 h-4 mr-2" />
            {{ $t('agents.addAgent') }}
          </button>
        </div>
      </div>

      <!-- Agent Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <!-- Online Agents -->
        <UCard class="shadow-sm">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <UIcon name="i-lucide-check-circle" class="w-8 h-8 text-green-500" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('agents.onlineAgents') }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ onlineAgents.length }}</p>
            </div>
          </div>
        </UCard>

        <!-- Busy Agents -->
        <UCard class="shadow-sm">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <UIcon name="i-lucide-clock" class="w-8 h-8 text-yellow-500" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('agents.busyAgents') }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ busyAgents.length }}</p>
            </div>
          </div>
        </UCard>

        <!-- Offline Agents -->
        <UCard class="shadow-sm">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <UIcon name="i-lucide-x-circle" class="w-8 h-8 text-red-500" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('agents.offlineAgents') }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ offlineAgents.length }}</p>
            </div>
          </div>
        </UCard>

        <!-- Total Agents -->
        <UCard class="shadow-sm">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <UIcon name="i-lucide-file-text" class="w-8 h-8 text-blue-500" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('agents.totalAgents') }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ agents.length }}</p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Agents Table -->
      <UCard class="shadow-sm">
        <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">{{ $t('agents.buildAgents') }}</h3>
        
        <div v-if="initialLoading" class="text-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-500 dark:text-gray-400">{{ $t('agents.loadingAgents') }}</p>
        </div>

        <div v-else-if="!initialLoading && agents.length === 0" class="text-center py-8">
          <UIcon name="i-lucide-file-text" class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ $t('agents.noAgents') }}</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ $t('agents.noAgentsDesc') }}</p>
        </div>

        <div v-else-if="!initialLoading" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead class="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('agents.agent') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('agents.status') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('agents.platform') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('agents.capabilities') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('agents.jobs') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('agents.lastSeen') }}</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('agents.actions') }}</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              <tr v-for="agent in agents" :key="agent.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <UIcon name="i-lucide-monitor" class="h-6 w-6 text-gray-600 dark:text-gray-400" />
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900 dark:text-white">{{ agent.name }}</div>
                      <div class="text-sm text-gray-500 dark:text-gray-400">
                        {{ agent.hostname || $t('agents.notConnected') }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getStatusBadgeClass(agent.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                    <span :class="getStatusDotClass(agent.status)" class="w-1.5 h-1.5 rounded-full mr-1.5"></span>
                    {{ agent.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div class="flex items-center">
                    <UIcon name="i-lucide-monitor" class="w-4 h-4 mr-2" />
                    <span v-if="agent.platform" class="capitalize">{{ agent.platform }}</span>
                    <span v-else class="text-gray-400 dark:text-gray-500">{{ $t('agents.unknown') }}</span>
                    <span v-if="agent.architecture" class="text-gray-400 dark:text-gray-500 ml-1">({{ agent.architecture }})</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="agent.capabilities && agent.capabilities.length > 0" class="space-y-2">
                    <!-- Always visible capabilities -->
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="capability in agent.capabilities.slice(0, 9)"
                        :key="capability"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {{ capability }}
                      </span>
                      <button
                        v-if="agent.capabilities.length > 3"
                        @click="toggleCapabilities(agent.id)"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      >
                        <span v-if="!expandedCapabilities.has(agent.id)">+{{ agent.capabilities.length - 3 }} {{ $t('agents.more') }}</span>
                        <span v-else>{{ $t('agents.showLess') }}</span>
                        <UIcon name="i-lucide-chevron-down" 
                          class="ml-1 w-3 h-3 transition-transform duration-200"
                          :class="{ 'rotate-180': expandedCapabilities.has(agent.id) }"
                        />
                      </button>
                    </div>
                    
                    <!-- Expanded capabilities -->
                    <div
                      v-if="expandedCapabilities.has(agent.id) && agent.capabilities.length > 3"
                      class="flex flex-wrap gap-1 pt-2 border-t border-gray-200 dark:border-gray-700"
                    >
                      <span
                        v-for="capability in agent.capabilities.slice(3)"
                        :key="capability"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {{ capability }}
                      </span>
                    </div>
                  </div>
                  <div v-else class="text-sm text-gray-400 dark:text-gray-500">
                    {{ $t('agents.notDetected') }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ agent.currentJobs }}/{{ agent.maxConcurrentJobs }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <UTooltip v-if="agent.lastHeartbeat" :text="new Date(agent.lastHeartbeat).toLocaleString()">
                    <span v-if="agent.lastHeartbeat">
                      {{ formatRelativeTime(agent.lastHeartbeat) }}
                    </span>
                    <span v-else>{{ $t('agents.never') }}</span>
                  </UTooltip>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end space-x-2">
                    <UTooltip :text="$t('agents.editAgent')">
                        <UButton
                          @click="editAgent(agent)"
                          color="secondary"
                          variant="ghost"
                          size="sm"
                          icon="i-lucide-edit-2"
                        />
                    </UTooltip>
                    <UTooltip :text="$t('agents.deleteAgent')" v-if="!agent.isLocal">
                      <UButton
                        v-if="!agent.isLocal"
                        @click="confirmDeleteAgent(agent)"
                        color="error"
                        variant="outline"
                        size="sm"
                        icon="i-lucide-trash-2"
                      />
                    </UTooltip>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </main>

    <!-- Add Agent Modal -->
    <ModalWrapper v-model="showAddAgentModal" class="max-w-md">
      <UCard class="shadow-md">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ $t('agents.addNewAgent') }}</h3>
        
        <form @submit.prevent="createAgent" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('agents.agentName') }}</label>
            <input
              v-model="newAgent.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              :placeholder="$t('agents.agentNamePlaceholder')"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('agents.maxConcurrentJobs') }}</label>
            <input
              v-model.number="newAgent.maxConcurrentJobs"
              type="number"
              min="1"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="1"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('agents.description') }}</label>
            <textarea
              v-model="newAgent.description"
              v-auto-resize
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none overflow-hidden"
              :placeholder="$t('agents.descriptionPlaceholder')"
            ></textarea>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="showAddAgentModal = false"
              class="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {{ $t('agents.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="creating"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <span v-if="creating">{{ $t('agents.creating') }}</span>
              <span v-else>{{ $t('agents.createAgent') }}</span>
            </button>
          </div>
        </form>
      </UCard>
    </ModalWrapper>

    <!-- Edit Agent Modal -->
    <ModalWrapper v-model="showEditAgentModal" class="max-w-md">
      <UCard class="shadow-md">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ $t('agents.editAgentTitle') }}</h3>
        
        <form @submit.prevent="updateAgent" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('agents.agentName') }}</label>
            <input
              v-model="editAgentForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t('agents.maxConcurrentJobs') }}</label>
            <input
              v-model.number="editAgentForm.maxConcurrentJobs"
              type="number"
              min="1"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="showEditAgentModal = false"
              class="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {{ $t('agents.cancel') }}
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {{ $t('agents.updateAgent') }}
            </button>
          </div>
        </form>
      </UCard>
    </ModalWrapper>

    <!-- Agent Token Modal -->
    <ModalWrapper v-model="showTokenModal" class="max-w-md">
      <UCard class="shadow-md">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
          <UIcon name="i-lucide-check" class="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4 text-center">{{ $t('agents.agentCreatedTitle') }}</h3>
        
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {{ $t('agents.agentCreatedDesc') }}
        </p>
        
        <div class="bg-gray-100 dark:bg-gray-800 rounded-md p-3 mb-4">
          <div class="flex items-center justify-between">
            <code class="text-sm font-mono break-all">{{ createdAgentToken }}</code>
            <UTooltip :text="$t('agents.copyToken')">
              <UButton
                @click="copyToken"
                color="secondary"
                icon="i-lucide-clipboard-copy"
              />
            </UTooltip>
          </div>
        </div>
        
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <strong>{{ $t('agents.important') }}</strong> {{ $t('agents.tokenWarning') }}
          </p>
        </div>
        
        <div class="flex justify-end">
          <button
            @click="closeTokenModal"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {{ $t('agents.gotIt') }}
          </button>
        </div>
      </UCard>
    </ModalWrapper>

    <!-- Delete Agent Confirmation Modal -->
    <ModalWrapper v-model="showDeleteModal" class="max-w-md">
      <UCard class="shadow-md">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ $t('agents.deleteAgentTitle') }}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">
          {{ $t('agents.deleteAgentConfirm').replace('{name}', agentToDelete?.name || '') }}
        </p>
        <div class="flex justify-end space-x-4">
          <button
            @click="cancelDeleteAgent"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {{ $t('agents.cancel') }}
          </button>
          <button
            @click="deleteAgent"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            {{ $t('agents.delete') }}
          </button>
        </div>
      </UCard>
    </ModalWrapper>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

import ModalWrapper from '~/components/ModalWrapper.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()

// State
const agents = ref([])
const initialLoading = ref(true) // Only true for the very first load
const showAddAgentModal = ref(false)
const showTokenModal = ref(false)
const creating = ref(false)
const createdAgentToken = ref('')
const expandedCapabilities = ref(new Set()) // Track which agents have expanded capabilities

const newAgent = ref({
  name: '',
  maxConcurrentJobs: 1,
  description: ''
})

// Computed
const onlineAgents = computed(() => agents.value.filter(agent => agent.status === 'online'))
const busyAgents = computed(() => agents.value.filter(agent => agent.status === 'busy'))
const offlineAgents = computed(() => agents.value.filter(agent => agent.status === 'offline' || agent.status === 'disconnected'))

// Methods
const loadAgents = async (isInitialLoad = false) => {
  try {
    // Only show loading spinner on initial load
    if (isInitialLoad) {
      initialLoading.value = true
    }
    
    // Use the general agents endpoint for initial load only
    const data = await $fetch('/api/admin/agents')
    agents.value = data
    console.log(data)
  } catch (error) {
    logger.error('Error loading agents:', error)
  } finally {
    if (isInitialLoad) {
      initialLoading.value = false
    }
  }
}


const createAgent = async () => {
  try {
    creating.value = true
    
    const agentData = {
      name: newAgent.value.name,
      description: newAgent.value.description,
      maxConcurrentJobs: newAgent.value.maxConcurrentJobs
    }
    
    const createdAgent = await $fetch('/api/admin/agents', {
      method: 'POST',
      body: agentData
    })
    
    // Store the token to display to the user
    createdAgentToken.value = createdAgent.token
    
    // Close create modal and show token modal
    showAddAgentModal.value = false
    showTokenModal.value = true
    
    // Reset form
    newAgent.value = {
      name: '',
      maxConcurrentJobs: 1,
      description: ''
    }
    
    // Immediately refresh to show the new agent
    await loadAgents(false) // Pass false since this is not initial load
  } catch (error) {
    logger.error('Error creating agent:', error)
    toast.add({ title: t('agents.failedToCreateAgent'), icon: 'i-lucide-x-circle' })
  } finally {
    creating.value = false
  }
}

// Token modal methods
const copyToken = async () => {
  try {
    await navigator.clipboard.writeText(createdAgentToken.value)
    toast.add({ title: t('agents.agentTokenCopied'), icon: 'i-lucide-check-circle' })
  } catch (error) {
    logger.error('Failed to copy token:', error)
    toast.add({ title: t('agents.failedToCopyToken'), icon: 'i-lucide-x-circle' })
  }
}

const closeTokenModal = () => {
  showTokenModal.value = false
  createdAgentToken.value = ''
}

const toggleCapabilities = (agentId) => {
  if (expandedCapabilities.value.has(agentId)) {
    expandedCapabilities.value.delete(agentId)
  } else {
    expandedCapabilities.value.add(agentId)
  }
}

// Edit agent modal state
const showEditAgentModal = ref(false)
const editingAgent = ref(null)
const editAgentForm = ref({
  name: '',
  maxConcurrentJobs: 1
})

const editAgent = (agent) => {
  editingAgent.value = agent
  editAgentForm.value = {
    name: agent.name,
    maxConcurrentJobs: agent.maxConcurrentJobs
  }
  showEditAgentModal.value = true
}

const updateAgent = async () => {
  try {
    await $fetch(`/api/admin/agents/${editingAgent.value.id}`, {
      method: 'PUT',
      body: editAgentForm.value
    })
    
    showEditAgentModal.value = false
    await loadAgents(false)
  } catch (error) {
    logger.error('Error updating agent:', error)
    toast.add({ title: t('agents.failedToUpdateAgent'), icon: 'i-lucide-x-circle' })
  }
}

// Delete confirmation modal state
const showDeleteModal = ref(false)
const agentToDelete = ref(null)

const confirmDeleteAgent = (agent) => {
  agentToDelete.value = agent
  showDeleteModal.value = true
}

const deleteAgent = async () => {
  if (!agentToDelete.value) return
  
  try {
    await $fetch(`/api/admin/agents/${agentToDelete.value.id}`, {
      method: 'DELETE'
    })
    
    // No need to refresh - WebSocket updates will handle removal
    logger.info(`🗑️ Agent ${agentToDelete.value.name} deleted successfully`)
    toast.add({ title: t('agents.agentDeletedSuccess'), icon: 'i-lucide-check-circle' })
    showDeleteModal.value = false
    agentToDelete.value = null
  } catch (error) {
    logger.error('Error deleting agent:', error)
    toast.add({ title: t('agents.failedToDeleteAgent') + ' ' + (error.data?.message || error.message), icon: 'i-lucide-x-circle' })
  }
}

const cancelDeleteAgent = () => {
  showDeleteModal.value = false
  agentToDelete.value = null
}

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'online':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'busy':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'offline':
    case 'disconnected':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
}

const getStatusDotClass = (status) => {
  switch (status) {
    case 'online':
      return 'bg-green-400'
    case 'busy':
      return 'bg-yellow-400'
    case 'offline':
    case 'disconnected':
      return 'bg-red-400'
    default:
      return 'bg-gray-400'
  }
}

const formatRelativeTime = (dateString) => {
  if (!dateString) return t('agents.never')
  
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)
  
  if (diffInSeconds < 60) return t('agents.justNow')
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

// Initialize
onMounted(async () => {
  if (!authStore.isAuthenticated) {
    await authStore.initializeAuth()
  }
  
  if (authStore.isAuthenticated) {
    await loadAgents(true) // Initial load only - real-time updates handle the rest
    
    // Listen for real-time agent status updates via WebSocket
    if (typeof window !== 'undefined') {
      window.addEventListener('agentStatusUpdate', handleAgentStatusUpdate)
    }
  }
})

// Handle real-time agent status updates
const handleAgentStatusUpdate = (event) => {
  const { agentId, status, currentJobs, lastHeartbeat, hostname, platform, architecture, capabilities, agentVersion } = event.detail
  
  // Find and update the agent in our local array
  const agentIndex = agents.value.findIndex(agent => agent.id === agentId)
  if (agentIndex !== -1) {
    const agent = agents.value[agentIndex]
    agent.status = status
    agent.currentJobs = currentJobs || 0
    agent.lastHeartbeat = lastHeartbeat
    
    // Update system info if provided (registration updates)
    if (hostname) agent.hostname = hostname
    if (platform) agent.platform = platform
    if (architecture) agent.architecture = architecture
    if (capabilities) agent.capabilities = capabilities
    if (agentVersion) agent.agentVersion = agentVersion
    
    agents.value[agentIndex] = { ...agent } // Trigger reactivity
    logger.info(`🔄 Updated agent ${agentId} status: ${status}`)
  } else {
    logger.info(`Agent ${agentId} not found in local array - refreshing agent list`)
    loadAgents(false) // Reload if agent not found (new agent connected)
  }
}

onUnmounted(() => {
  // Clean up agent status update listener
  if (typeof window !== 'undefined') {
    window.removeEventListener('agentStatusUpdate', handleAgentStatusUpdate)
  }
})
</script>