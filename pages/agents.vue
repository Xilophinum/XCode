<template>
  <div class="min-h-screen bg-gray-50 dark:bg-neutral-900">
    <!-- Navigation -->
    <AppNavigation :breadcrumbs="['agents']" />

    <!-- Main Content -->
    <main class="max-w-8xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Build Agents</h1>
          <p class="mt-2 text-gray-600 dark:text-gray-300">
            Manage and monitor your build agents. Agents execute your pipeline jobs on distributed machines.
          </p>
        </div>
        <div class="flex gap-2">
          <button
            @click="showAddAgentModal = true"
            class="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto w-full"
          >
            <Icon name="plus" class="w-4 h-4 mr-2" />
            Add Agent
          </button>
        </div>
      </div>

      <!-- Agent Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white dark:bg-neutral-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-md flex items-center justify-center">
                  <Icon name="check" class="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Online Agents</dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ onlineAgents.length }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-neutral-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-md flex items-center justify-center">
                  <Icon name="clock" class="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Busy Agents</dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ busyAgents.length }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-neutral-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-md flex items-center justify-center">
                  <Icon name="xCircle" class="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Offline Agents</dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ offlineAgents.length }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-neutral-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center">
                  <Icon name="fileText" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Agents</dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ agents.length }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Agents Table -->
      <div class="bg-white dark:bg-neutral-800 shadow overflow-hidden sm:rounded-md">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">Build Agents</h3>
          
          <div v-if="initialLoading" class="text-center py-8">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p class="mt-4 text-gray-500 dark:text-gray-400">Loading agents...</p>
          </div>

          <div v-else-if="!initialLoading && agents.length === 0" class="text-center py-8">
            <Icon name="fileText" class="mx-auto h-12 w-12 text-gray-400" />
            <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No agents</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by clicking "Add Agent" above to create your first build agent.</p>
          </div>

          <div v-else-if="!initialLoading" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-neutral-700">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agent</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Platform</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Capabilities</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Jobs</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Seen</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="agent in agents" :key="agent.id" class="hover:bg-gray-50 dark:hover:bg-neutral-700">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <Icon name="monitor" class="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        </div>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900 dark:text-white">{{ agent.name }}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">
                          {{ agent.hostname || 'Not connected' }}
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
                      <Icon name="monitor" class="w-4 h-4 mr-2" />
                      <span v-if="agent.platform" class="capitalize">{{ agent.platform }}</span>
                      <span v-else class="text-gray-400 dark:text-gray-500">Unknown</span>
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
                          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                        >
                          <span v-if="!expandedCapabilities.has(agent.id)">+{{ agent.capabilities.length - 3 }} more</span>
                          <span v-else>Show less</span>
                          <Icon name="chevronDown" 
                            class="ml-1 w-3 h-3 transition-transform duration-200"
                            :class="{ 'rotate-180': expandedCapabilities.has(agent.id) }"
                          />
                        </button>
                      </div>
                      
                      <!-- Expanded capabilities -->
                      <div 
                        v-if="expandedCapabilities.has(agent.id) && agent.capabilities.length > 3"
                        class="flex flex-wrap gap-1 pt-2 border-t border-gray-200 dark:border-gray-600"
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
                      Not detected
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {{ agent.currentJobs }}/{{ agent.maxConcurrentJobs }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span v-if="agent.lastHeartbeat" v-tooltip="new Date(agent.lastHeartbeat).toLocaleString()">
                      {{ formatRelativeTime(agent.lastHeartbeat) }}
                    </span>
                    <span v-else>Never</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end space-x-2">
                      <button
                        @click="editAgent(agent)"
                        class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        v-tooltip="'Edit agent'"
                      >
                        <Icon name="edit" class="w-4 h-4" />
                      </button>
                      <button
                        v-if="!agent.isLocal"
                        @click="confirmDeleteAgent(agent)"
                        class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        v-tooltip="'Delete agent'"
                      >
                        <Icon name="delete" class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>

    <!-- Add Agent Modal -->
    <div v-if="showAddAgentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New Agent</h3>
          
          <form @submit.prevent="createAgent" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agent Name</label>
              <input
                v-model="newAgent.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="My Build Agent"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Concurrent Jobs</label>
              <input
                v-model.number="newAgent.maxConcurrentJobs"
                type="number"
                min="1"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="1"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
              <textarea
                v-model="newAgent.description"
                v-auto-resize
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none overflow-hidden"
                placeholder="Description of this agent"
              ></textarea>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="showAddAgentModal = false"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="creating"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <span v-if="creating">Creating...</span>
                <span v-else>Create Agent</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Agent Modal -->
    <div v-if="showEditAgentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Edit Agent</h3>
          
          <form @submit.prevent="updateAgent" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agent Name</label>
              <input
                v-model="editAgentForm.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Concurrent Jobs</label>
              <input
                v-model.number="editAgentForm.maxConcurrentJobs"
                type="number"
                min="1"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
            </div>
            
            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="showEditAgentModal = false"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update Agent
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Agent Token Modal -->
    <div v-if="showTokenModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div class="mt-3">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <Icon name="check" class="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4 text-center">Agent Created Successfully</h3>
          
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Your agent has been created. Use this token to connect your agent to the server:
          </p>
          
          <div class="bg-gray-50 dark:bg-gray-700 rounded-md p-3 mb-4">
            <div class="flex items-center justify-between">
              <code class="text-sm font-mono break-all">{{ createdAgentToken }}</code>
              <button
                @click="copyToken"
                class="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                v-tooltip="'Copy token'"
              >
                <Icon name="copy" class="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
            <p class="text-sm text-blue-800 dark:text-blue-200">
              <strong>Important:</strong> Save this token securely. You won't be able to see it again. 
              The agent will use this token to authenticate with the server.
            </p>
          </div>
          
          <div class="flex justify-end">
            <button
              @click="closeTokenModal"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Agent Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" @click="cancelDeleteAgent">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full" @click.stop>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Delete Agent</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Are you sure you want to delete agent "{{ agentToDelete?.name }}"? This action cannot be undone.
        </p>
        <div class="flex justify-end space-x-4">
          <button
            @click="cancelDeleteAgent"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            @click="deleteAgent"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

import Icon from '~/components/Icon.vue'

const { isDark } = useDarkMode()
const authStore = useAuthStore()
const { success, error } = useNotifications()

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
    error('Failed to create agent. Please try again.')
  } finally {
    creating.value = false
  }
}

// Token modal methods
const copyToken = async () => {
  try {
    await navigator.clipboard.writeText(createdAgentToken.value)
    success('Agent token copied to clipboard!')
  } catch (error) {
    logger.error('Failed to copy token:', error)
    error('Failed to copy agent token')
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
    error('Failed to update agent. Please try again.')
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
    success('Agent deleted successfully')
    showDeleteModal.value = false
    agentToDelete.value = null
  } catch (error) {
    logger.error('Error deleting agent:', error)
    error('Failed to delete agent: ' + (error.data?.message || error.message))
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
  if (!dateString) return 'Never'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
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
  const { agentId, status, currentJobs, lastHeartbeat, hostname, platform, architecture, capabilities, version } = event.detail
  
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
    if (version) agent.version = version
    
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