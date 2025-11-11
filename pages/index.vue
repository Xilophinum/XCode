<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950" @click="closeAllMenus">
    <!-- Navigation -->
    <AppNavigation />

    <!-- Main Content -->
    <main class="max-w-8xl mx-auto py-4 sm:px-6 lg:px-8">
      <div class="px-4 sm:px-0">
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-950 dark:text-white">{{ $t('dashboard.title') }}</h2>
          <p class="text-gray-600 dark:text-gray-300">{{ $t('dashboard.subtitle') }}</p>
        </div>

        <!-- Dashboard Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <!-- Projects Count -->
          <UCard class="shadow-sm">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <UIcon name="i-lucide-briefcase" class="w-8 h-8 text-blue-500" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('dashboard.projects') }}</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalProjects }}</p>
              </div>
            </div>
          </UCard>

          <!-- Online Agents -->
          <UCard class="shadow-sm">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <UIcon name="i-lucide-check-circle" class="w-8 h-8 text-green-500" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('dashboard.onlineAgents') }}</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ onlineAgentsCount }}</p>
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
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('dashboard.busyAgents') }}</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ busyAgentsCount }}</p>
              </div>
            </div>
          </UCard>

          <!-- Build Success Rate -->
          <UCard class="shadow-sm">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <UIcon name="i-lucide-bar-chart" class="w-8 h-8 text-purple-500" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t('dashboard.buildSuccessRate') }}</p>
                <p
                  class="text-2xl font-bold"
                  :class="buildSuccessRate > 80 ? 'text-green-600 dark:text-green-400' : buildSuccessRate > 70 ? 'text-yellow-600 dark:text-yellow-400' : buildSuccessRate > 55 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'"
                >
                  {{ buildSuccessRate }}%
                </p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Admin Tools (for admin users only) -->
        <div class="mb-8">
          <h3 class="text-lg font-medium text-gray-950 dark:text-white mb-4">{{ $t('dashboard.quickLinks') }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Agents Management Card -->
            <UCard class="shadow-sm hover:shadow-md transition-shadow group cursor-pointer" @click="navigateTo('/agents')" v-show="authStore.user?.role === 'admin'">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-md flex items-center justify-center">
                    <UIcon name="i-lucide-monitor" class="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <h4 class="text-lg font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    {{ $t('dashboard.buildAgents') }}
                  </h4>
                  <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {{ $t('dashboard.buildAgentsDesc') }}
                  </p>
                </div>
                <div class="flex-shrink-0">
                  <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
                </div>
              </div>
            </UCard>
            <!-- Failed Builds Card -->
            <UCard class="shadow-sm hover:shadow-md transition-shadow group cursor-pointer" @click="navigateTo('/failures')">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-md flex items-center justify-center">
                    <UIcon name="i-lucide-alert-circle" class="w-7 h-7 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <h4 class="text-lg font-medium text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    {{ $t('dashboard.failedProjects') }}
                  </h4>
                  <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {{ $t('dashboard.failedProjectsDesc') }}
                  </p>
                </div>
                <div class="flex-shrink-0">
                  <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                </div>
              </div>
            </UCard>
            <!-- Metrics Panel Card -->
            <UCard class="shadow-sm hover:shadow-md transition-shadow group cursor-pointer" @click="navigateTo('/metrics')" v-show="authStore.user?.role === 'admin'">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center">
                    <UIcon name="i-lucide-settings" class="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <h4 class="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {{ $t('dashboard.systemMetrics') }}
                  </h4>
                  <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {{ $t('dashboard.systemMetricsDesc') }}
                  </p>
                </div>
                <div class="flex-shrink-0">
                  <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            </UCard>

            <!-- Admin Panel Card -->
            <UCard class="shadow-sm hover:shadow-md transition-shadow group cursor-pointer" @click="navigateTo('/admin')" v-show="authStore.user?.role === 'admin'">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-md flex items-center justify-center">
                    <UIcon name="i-lucide-settings" class="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <h4 class="text-lg font-medium text-gray-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                    {{ $t('dashboard.adminPanel') }}
                  </h4>
                  <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {{ $t('dashboard.adminPanelDesc') }}
                  </p>
                </div>
                <div class="flex-shrink-0">
                  <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-gray-400 group-hover:text-yellow-500 transition-colors" />
                </div>
              </div>
            </UCard>
          </div>
        </div>

        <!-- Folders Section -->
        <UCard class="shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg leading-6 font-medium text-gray-950 dark:text-white">
              {{ $t('dashboard.folders') }}
            </h3>
            <UButton
              @click="showCreateFolderModal = true"
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {{ $t('dashboard.newFolder') }}
            </UButton>
          </div>

          <div v-if="projectsStore.isLoading" class="text-center py-8">
            <p class="text-gray-600 dark:text-gray-300">{{ $t('dashboard.loadingFolders') }}</p>
          </div>

          <div v-else-if="rootFolders.length === 0" class="text-center py-8">
            <p class="text-gray-600 dark:text-gray-300 mb-4">{{ $t('dashboard.noFolders') }}</p>
          </div>

          <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <UContextMenu 
              v-for="folder in rootFolders"
              :key="folder.id"
              :items="getFolderMenuItems(folder)"
            >
              <UTooltip :text="$t('dashboard.rightClickOptions')" placement="top">
                <div 
                  @click="openFolder(folder)"
                  class="cursor-pointer border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow bg-slate-50 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-800/30 relative group"
                >
                  <h4 class="font-medium text-gray-950 dark:text-white mb-2">{{ folder.name }}</h4>
                  <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">{{ folder.description || '' }}</p>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ $t('dashboard.updated') }} {{ formatDate(folder.updatedAt) }}
                  </div>
                </div>
              </UTooltip>
            </UContextMenu>
          </div>
        </UCard>
      </div>
    </main>

    <!-- Create Folder Modal -->
    <ModalWrapper v-model="showCreateFolderModal" class="max-w-lg">
      <div class="m-4">
        <h3 class="text-lg font-medium text-gray-950 dark:text-white mb-4">{{ $t('folder.createTitle') }}</h3>
        <form @submit.prevent="handleCreateFolder">
          <div class="mb-4">
            <label for="folderName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ $t('folder.name') }}</label>
            <input
              id="folderName"
              v-model="folderForm.name"
              type="text"
              required
              class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
              :placeholder="$t('folder.namePlaceholder')"
            >
          </div>
          <div class="mb-4">
            <label for="folderDescription" class="block text-sm font-medium text-gray-700 dark:text-gray-300">{{ $t('folder.description') }}</label>
            <textarea
              id="folderDescription"
              v-model="folderForm.description"
              v-auto-resize
              class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-950 dark:text-white resize-none overflow-hidden"
              :placeholder="$t('folder.descriptionPlaceholder')"
            ></textarea>
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="showCreateFolderModal = false"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="!folderForm.name.trim()"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {{ $t('folder.createButton') }}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
    
    <!-- Edit Folder Modal -->
    <ModalWrapper v-model="showEditFolderModal" class="max-w-lg">
      <div class="m-4">
        <h3 class="text-lg font-medium text-gray-950 dark:text-white mb-4">{{ $t('folder.editTitle') }}</h3>
        <form @submit.prevent="handleEditFolder">
          <div class="mb-4">
            <label for="editFolderName" class="block text-sm font-medium text-gray-700">{{ $t('folder.name') }}</label>
            <input
              id="editFolderName"
              v-model="editForm.name"
              type="text"
              required
              class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              :placeholder="$t('folder.namePlaceholder')"
            >
          </div>
          <div class="mb-4">
            <label for="editFolderDescription" class="block text-sm font-medium text-gray-700">{{ $t('folder.description') }}</label>
            <textarea
              id="editFolderDescription"
              v-model="editForm.description"
              v-auto-resize
              class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 resize-none overflow-hidden"
              :placeholder="$t('folder.descriptionPlaceholder')"
            ></textarea>
          </div>
          <div class="flex justify-end space-x-3">
            <UButton
              @click="cancelEdit"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {{ $t('common.cancel') }}
            </UButton>
            <UButton
              type="submit"
              :disabled="!editForm.name.trim()"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {{ $t('common.save') }}
            </UButton>
          </div>
        </form>
      </div>
    </ModalWrapper>

    <!-- Delete Confirmation Modal -->
    <ModalWrapper v-model="showDeleteConfirmModal" class="max-w-lg">
      <div class="m-4">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
          <UIcon name="i-lucide-alert-triangle" class="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-950 dark:text-white mb-2 text-center">{{ $t('folder.deleteTitle') }}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
          {{ $t('folder.deleteConfirm') }} "<strong>{{ folderToDelete?.name }}</strong>"?
        </p>
        <p class="text-sm text-red-600 dark:text-red-400 mb-4 text-center">
          <strong>{{ $t('common.warning') }}:</strong> {{ $t('folder.deleteWarning') }}
        </p>
        <div class="flex justify-end space-x-3">
          <UButton
            @click="cancelDelete"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            {{ $t('common.cancel') }}
          </UButton>
          <UButton
            @click="handleDeleteFolder"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            {{ $t('folder.deleteButton') }}
          </UButton>
        </div>
      </div>
    </ModalWrapper>

    <!-- Move Item Modal -->
    <ModalWrapper v-model="showMoveModal" class="max-w-lg">
      <div class="m-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {{ $t('folder.moveTitle') }}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {{ $t('folder.moveDesc').replace('{name}', itemToMove?.name || '') }}
        </p>
        
        <div class="mb-4">
          <label for="destinationPath" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ $t('folder.destinationPath') }}
          </label>
          <input
            id="destinationPath"
            v-model="destinationPath"
            @input="filterPaths"
            type="text"
            :placeholder="$t('folder.destinationPlaceholder')"
            class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
          >
          
          <!-- Path suggestions dropdown -->
          <div v-if="filteredPaths.length > 0" class="mt-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
            <UButton
              v-for="path in filteredPaths.slice(0, 10)"
              :key="path.displayPath"
              @click="destinationPath = path.displayPath"
              class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-600"
            >
              {{ path.displayPath }}
            </UButton>
          </div>
        </div>
        
        <div class="flex justify-end space-x-4">
          <UButton
            @click="cancelMove"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {{ $t('common.cancel') }}
          </UButton>
          <UButton
            @click="handleMoveItem"
            :disabled="!destinationPath.trim()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {{ $t('common.move') }}
          </UButton>
        </div>
      </div>
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
const projectsStore = useProjectsStore()
const webSocketStore = useWebSocketStore()

// Modal state
const showCreateFolderModal = ref(false)
const showEditFolderModal = ref(false)
const showDeleteConfirmModal = ref(false)
const showMoveModal = ref(false)
const toast = useToast()
// Form data
const folderForm = ref({
  name: '',
  description: ''
})

const editForm = ref({
  id: '',
  name: '',
  description: ''
})

const folderToDelete = ref(null)

// Agent state
const agents = ref([])

// Move-related state
const itemToMove = ref(null)
const destinationPath = ref('')
const filteredPaths = ref([])

// Get root level folders (folders with empty path)
const rootFolders = computed(() => {
  return projectsStore.getFoldersAtPath([]).sort((a, b) => a.name.localeCompare(b.name))
})

// Get all available paths for move destination
const allAvailablePaths = computed(() => {
  const paths = []
  const addPaths = (items, currentPath = []) => {
    items.forEach(item => {
      if (item.type === 'folder') {
        const fullPath = [...currentPath, item.name]
        paths.push({
          path: fullPath,
          displayPath: fullPath.join(' / ') || 'Root',
          item: item
        })
        if (item.children) {
          addPaths(item.children, fullPath)
        }
      }
    })
  }
  
  // Add root path
  paths.push({
    path: [],
    displayPath: t('folder.root'),
    item: null
  })
  
  addPaths(projectsStore.allItems)
  return paths
})

// Agent computed properties
const totalProjects = computed(() => {
  return projectsStore.getAllProjects.length
})

const onlineAgentsCount = computed(() => {
  return agents.value.filter(agent => agent.status === 'online').length
})

const busyAgentsCount = computed(() => {
  return agents.value.filter(agent => agent.status === 'busy').length
})

const buildSuccessRate = ref(0)

const { data: projectStats } = await useLazyAsyncData('project-stats', () => $fetch('/api/projects/stats'))

watchEffect(() => {
  if (projectStats.value?.length) {
    buildSuccessRate.value = Math.round(
      (projectStats.value.reduce((acc, project) => acc + project.successRate, 0) / projectStats.value.length) * 100
    )
  }
})

// Actions
const openFolder = (folder) => {
  navigateTo(`/browse?path=${folder.name}`)
}

const handleCreateFolder = async () => {
  if (!folderForm.value.name.trim()) return
  
  const result = await projectsStore.createFolder(
    folderForm.value.name.trim(),
    folderForm.value.description.trim(),
    [] // Root level
  )
  
  if (result.success) {
    toast.add({ title: 'Folder created successfully', icon: 'i-lucide-check-circle' })
    folderForm.value = { name: '', description: '' }
    showCreateFolderModal.value = false
  } else {
    logger.error('Failed to create folder:', result.error)
    toast.add({ title: 'Failed to create folder. Please try again.', icon: 'i-lucide-x-circle' })
  }
}

const closeAllMenus = () => {
  // Cleanup is handled by UDropdown automatically
}

const startEditFolder = (folder) => {
  editForm.value = {
    id: folder.id,
    name: folder.name,
    description: folder.description || ''
  }
  showEditFolderModal.value = true
}

const handleEditFolder = async () => {
  if (!editForm.value.name.trim()) return
  
  const result = await projectsStore.editFolder(
    editForm.value.id,
    editForm.value.name.trim(),
    editForm.value.description.trim()
  )
  
  if (result.success) {
    toast.add({ title: 'Folder updated successfully', icon: 'i-lucide-check-circle' })
    cancelEdit()
  } else {
    logger.error('Failed to edit folder:', result.error)
    toast.add({ title: 'Failed to update folder. Please try again.', icon: 'i-lucide-x-circle' })
  }
}

const cancelEdit = () => {
  editForm.value = { id: '', name: '', description: '' }
  showEditFolderModal.value = false
}

const confirmDeleteFolder = (folder) => {
  folderToDelete.value = folder
  showDeleteConfirmModal.value = true
}

const handleDeleteFolder = async () => {
  if (!folderToDelete.value) return
  
  const result = await projectsStore.deleteFolder(folderToDelete.value.id)
  
  if (result.success) {
    toast.add({ title: 'Folder deleted successfully', icon: 'i-lucide-check-circle' })
    cancelDelete()
  } else {
    logger.error('Failed to delete folder:', result.error)
    toast.add({ title: 'Failed to delete folder. Please try again.', icon: 'i-lucide-x-circle' })
  }
}

const cancelDelete = () => {
  folderToDelete.value = null
  showDeleteConfirmModal.value = false
}

// Move handlers
const confirmMoveItem = (item) => {
  itemToMove.value = item
  destinationPath.value = ''
  filteredPaths.value = allAvailablePaths.value
  showMoveModal.value = true
}

const handleMoveItem = async () => {
  if (!itemToMove.value || !destinationPath.value) return
  
  // Find the destination path array
  const destination = filteredPaths.value.find(p => p.displayPath === destinationPath.value)
  if (!destination) return
  
  // Check if trying to move item to its current location
  const currentPath = itemToMove.value.path || []
  if (JSON.stringify(currentPath) === JSON.stringify(destination.path)) {
    toast.add({ title: 'Item is already in the selected location.', icon: 'i-lucide-x-circle' })
    return
  }
  
  // Check if trying to move folder into itself or its children
  if (itemToMove.value.type === 'folder') {
    const itemFullPath = [...currentPath, itemToMove.value.name]
    if (destination.path.length >= itemFullPath.length && 
        JSON.stringify(destination.path.slice(0, itemFullPath.length)) === JSON.stringify(itemFullPath)) {
      toast.add({ title: 'Cannot move a folder into itself or its children.', icon: 'i-lucide-x-circle' })
      return
    }
  }
  
  const result = await projectsStore.moveItem(itemToMove.value.id, destination.path)
  
  if (result.success) {
    toast.add({ title: 'Folder moved successfully', icon: 'i-lucide-check-circle' })
    cancelMove()
  } else {
    logger.error('Failed to move item:', result.error)
    toast.add({ title: 'Failed to move item. Please try again.', icon: 'i-lucide-x-circle' })
  }
}

const cancelMove = () => {
  showMoveModal.value = false
  itemToMove.value = null
  destinationPath.value = ''
  filteredPaths.value = []
}

const filterPaths = () => {
  if (!destinationPath.value.trim()) {
    filteredPaths.value = allAvailablePaths.value
    return
  }
  
  const search = destinationPath.value.toLowerCase()
  filteredPaths.value = allAvailablePaths.value.filter(path => 
    path.displayPath.toLowerCase().includes(search)
  )
}

// Folder menu methods for UDropdown
const getFolderMenuItems = (folder) => {
  return [
    {
      label: t('common.edit'),
      icon: 'i-lucide-edit-2',
      onSelect: () => startEditFolder(folder)
    },
    {
      label: t('common.move'),
      icon: 'i-lucide-move',
      onSelect: () => confirmMoveItem(folder)
    },
    {
      label: t('common.delete'),
      icon: 'i-lucide-trash-2',
      onSelect: () => confirmDeleteFolder(folder),
      class: 'text-red-600 dark:text-red-400'
    }
  ]
}


const formatDate = (date) => {
  const dateObj = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44)) // Average days per month
  
  // Format time as HH:MM AM/PM
  const timeString = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  })
  
  if (diffHours < 1) {
    return `Recently, at ${timeString} Today`
  } else if (diffHours < 24) {
    const hourText = diffHours === 1 ? 'hour' : 'hours'
    return `${diffHours} ${hourText} ago, at ${timeString}`
  } else if (diffDays < 30) {
    const dayText = diffDays === 1 ? 'day' : 'days'
    return `${diffDays} ${dayText} ago, at ${timeString}`
  } else {
    const monthText = diffMonths === 1 ? 'Month' : 'Months'
    return `${diffMonths} ${monthText} ago, at ${timeString}`
  }
}

// Load agents data
const loadAgents = async () => {
  try {
    const data = await $fetch('/api/admin/agents')
    agents.value = data
  } catch (error) {
    logger.error('Error loading agents:', error)
    agents.value = []
  }
}

// Load data on page mount
onMounted(async () => {
  // Always re-initialize auth to ensure we have fresh user data
  await authStore.initializeAuth()
  // Only load data if authenticated
  if (authStore.isAuthenticated && authStore.user) {
    await projectsStore.loadData()
    await loadAgents()
  }
  webSocketStore.unsubscribeFromAllProjects()
})

onUnmounted(() => {
  // Cleanup is handled by the @click handler on the main div
})
</script>