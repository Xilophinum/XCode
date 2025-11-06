<template>
  <div>
    <div class="h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 flex flex-col" @click="closeAllMenus">
    <!-- Navigation -->
    <AppNavigation :breadcrumbs="pathSegments" />

    <!-- Main Content -->
    <main class="flex-1 overflow-hidden flex flex-col max-w-8xl mx-auto w-full py-4 sm:px-6 lg:px-8">
      <div class="flex-1 overflow-hidden flex flex-col px-4 sm:px-0">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-950 dark:text-white">
              {{ currentFolderName || 'Browse Folders' }}
            </h1>
            <p class="text-gray-600 dark:text-gray-300 mt-1">
              {{ currentFolderDescription || '' }}
            </p>
          </div>
          
          <div class="flex space-x-3">
            <UButton color="secondary"
              @click="showCreateFolderModal = true"
              icon="i-lucide-plus"
              class="text-black dark:text-slate-700"
            >
              New Folder
            </UButton>
            
            <UButton
              @click="showCreateProjectModal = true"
              icon="i-lucide-plus"
              class="text-black dark:text-slate-700"
            >
              New Project
            </UButton>
          </div>
        </div>

        <!-- Quick Stats Bar -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-6">
              <div class="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <UIcon name="i-lucide-cog" class="h-4 w-4 text-blue-600 dark:text-blue-400 mr-3 animate-spin" />
                <span class="font-medium">{{ totalProjectsInCurrentPath }}</span>
                <span class="ml-1">{{ totalProjectsInCurrentPath === 1 ? 'project' : 'projects' }}</span>
              </div>
              <div class="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <UIcon name="i-lucide-folder" class="w-4 h-4 mr-1.5 text-blue-500" />
                <span class="font-medium">{{ totalFoldersInCurrentPath }}</span>
                <span class="ml-1">{{ totalFoldersInCurrentPath === 1 ? 'folder' : 'folders' }}</span>
              </div>
              <div class="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <UIcon name="i-lucide-check" class="w-4 h-4 mr-1.5 text-green-500" />
                <span class="font-medium">{{ onlineAgentsCount }}</span>
                <span class="ml-1">online agents</span>
              </div>
              
              <div class="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <UIcon name="i-lucide-clock" class="w-4 h-4 mr-1.5 text-yellow-500" />
                <span class="font-medium">{{ busyAgentsCount }}</span>
                <span class="ml-1">busy</span>
              </div>
            </div>
            
            <NuxtLink
              to="/agents"
              class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              Manage Agents →
            </NuxtLink>
          </div>
        </div>

        <!-- Scrollable Container -->
        <div class="flex-1 overflow-y-auto overflow-x-hidden overscroll-none" style="scrollbar-gutter: stable;">
          <!-- Loading State -->
          <div v-if="projectsStore.isLoading" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p class="mt-2 text-gray-600 dark:text-gray-300">Loading...</p>
          </div>

          <!-- Content Grid -->
          <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 pb-6">
          <!-- Folders -->
          <UContextMenu
            v-for="folder in foldersAtCurrentPath"
            :key="folder.id"
            :items="getFolderMenuItems(folder)"
          >
            <UTooltip text="Right Click For More Options" placement="top">
              <div
                @click="navigateToFolder(folder.name)"
                class="cursor-pointer border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30 relative group"
              >
                <div class="flex items-center mb-2">
                  <UIcon name="i-lucide-folder" class="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
                  <h3 class="font-medium text-gray-950 dark:text-white">{{ folder.name }}</h3>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">{{ folder.description || '' }}</p>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  Updated: {{ formatDate(folder.updatedAt) }}
                </div>
              </div>
            </UTooltip>
          </UContextMenu>

          <!-- Projects -->
          <UContextMenu
            v-for="project in projectsAtCurrentPath"
            :key="project.id"
            :items="getProjectMenuItems(project)"
          >
            <UTooltip text="Right Click For More Options" placement="top">
              <div
                @click="openProject(project)"
                :class="[
                  'cursor-pointer border rounded-lg p-4 hover:shadow-md transition-shadow relative group',
                  project.status === 'disabled' ? 'opacity-60 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800' : getProjectColor(projectBuildStats.get(project.id))
                ]"
              >
              <div class="flex items-center mb-2">
                <UIcon name="i-lucide-cog" class="h-7 w-7 text-blue-600 dark:text-blue-400 mr-3 animate-spin" />
                <h3 class="font-medium" :class="getProjectTextColor(projectBuildStats.get(project.id))">{{ project.name }}</h3>
                <span v-if="project.status === 'disabled'" class="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-500 text-white rounded-full">
                  Disabled
                </span>
              </div>
              <p class="text-sm mb-3" :class="getProjectTextColor(projectBuildStats.get(project.id))">{{ project.description || '' }}</p>
              
              <!-- Build Stats Summary with History Link -->
              <div v-if="projectBuildStats.get(project.id)" class="flex items-center justify-between mb-2">
                <div class="text-xs" :class="getProjectTextColor(projectBuildStats.get(project.id))">
                  {{ projectBuildStats.get(project.id).totalBuilds || 0 }} builds • 
                  {{ Math.round(projectBuildStats.get(project.id).successRate * 100) }}% success •
                  Last: {{ projectBuildStats.get(project.id).lastBuildStatus || 'None' }}
                </div>
                <button
                  @click.stop="viewBuildHistory(project)"
                  class="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
                  :class="getProjectTextColor(projectBuildStats.get(project.id))"
                >
                  Build History
                </button>
              </div>
              
              <div v-else class="flex items-center justify-between mb-2">
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  No builds yet
                </div>
                <button
                  @click.stop="viewBuildHistory(project)"
                  class="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
                >
                  Build History
                </button>
              </div>
              
              <div class="text-xs" :class="getProjectTextColor(projectBuildStats.get(project.id))">
                Updated: {{ formatDate(project.updatedAt) }}
              </div>
              
              <!-- Progress Bar -->
              <ProjectProgressBar
                :projectId="project.id"
                :buildStats="projectBuildStats.get(project.id)"
              />
              </div>
            </UTooltip>
          </UContextMenu>

          <!-- Empty State -->
          <div v-if="foldersAtCurrentPath.length === 0 && projectsAtCurrentPath.length === 0" class="col-span-full text-center py-8">
            <UIcon name="i-lucide-folder" class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 class="mt-2 text-sm font-medium text-gray-950 dark:text-white">No items found</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new folder or project.</p>
          </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Folder Modal -->
    <ModalWrapper :model-value="showCreateFolderModal" @update:model-value="showCreateFolderModal = $event" class="max-w-md">
      <div class="m-4">
        <h3 class="text-lg font-medium text-gray-950 dark:text-white mb-4">Create New Folder</h3>
        <form @submit.prevent="handleCreateFolder">
          <div class="mb-4">
            <label for="folderName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Folder Name</label>
            <input
              id="folderName"
              v-model="folderForm.name"
              type="text"
              required
              class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
              placeholder="Enter folder name"
            >
          </div>
          <div class="mb-4">
            <label for="folderDescription" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
            <textarea
              id="folderDescription"
              v-model="folderForm.description"
              v-auto-resize
              class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white resize-none overflow-hidden"
              placeholder="Enter folder description"
            ></textarea>
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="showCreateFolderModal = false"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!folderForm.name.trim()"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
            >
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>

    <!-- Create Project Modal -->
    <ModalWrapper :model-value="showCreateProjectModal" @update:model-value="showCreateProjectModal = $event" class="max-w-md">
      <div class="m-4">
        <h3 class="text-lg font-medium text-gray-950 dark:text-white mb-4">Create New Project</h3>
        <form @submit.prevent="handleCreateProject">
          <div class="mb-4">
            <label for="projectName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Name</label>
            <input
              id="projectName"
              v-model="projectForm.name"
              type="text"
              required
              class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
              placeholder="Enter project name"
            >
          </div>
          <div class="mb-4">
            <label for="projectTemplate" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Template (Optional)</label>
            <select
              id="projectTemplate"
              v-model="projectForm.templateId"
              class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
            >
              <option :value="null">Blank Project</option>
              <option v-for="template in availableTemplates" :key="template.id" :value="template.id">
                {{ template.name }}
              </option>
            </select>
            <p v-if="selectedTemplate" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ selectedTemplate.description || 'No description' }}
            </p>
          </div>
          <div class="mb-4">
            <label for="projectDescription" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
            <textarea
              id="projectDescription"
              v-model="projectForm.description"
              v-auto-resize
              class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white resize-none overflow-hidden"
              placeholder="Enter project description"
            ></textarea>
          </div>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="showCreateProjectModal = false"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!projectForm.name.trim()"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  </div>
  <!-- Delete Project Confirmation Modal -->
  <ModalWrapper :model-value="showDeleteProjectModal" @update:model-value="cancelDeleteProject" class="max-w-md">
    <div class="m-4">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Delete {{ projectToDelete?.type === 'folder' ? 'Folder' : 'Project' }}</h3>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">
        Are you sure you want to delete the {{ projectToDelete?.type === 'folder' ? 'folder' : 'project' }} "{{ projectToDelete?.name }}"?
        {{ projectToDelete?.type === 'folder' ? 'This will also delete all projects and subfolders within it. ' : '' }}
        This action cannot be undone.
      </p>
      <div class="flex justify-end space-x-4">
        <button
          @click="cancelDeleteProject"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          @click="handleDeleteProject"
          class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Delete
        </button>
      </div>
    </div>
  </ModalWrapper>  <!-- Move Item Modal -->
  <ModalWrapper :model-value="showMoveModal" @update:model-value="cancelMove" class="max-w-md">
    <div class="m-4">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Move {{ itemToMove?.type === 'folder' ? 'Folder' : 'Project' }}
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Moving "{{ itemToMove?.name }}" to a new location.
        {{ itemToMove?.type === 'folder' ? 'All contents will move with the folder.' : '' }}
      </p>

      <div class="mb-4">
        <label for="destinationPath" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Destination Path
        </label>
        <input
          id="destinationPath"
          v-model="destinationPath"
          @input="filterPaths"
          type="text"
          placeholder="Type to search paths..."
          class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
        >

        <!-- Path suggestions dropdown -->
        <div v-if="filteredPaths.length > 0" class="mt-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
          <button
            v-for="path in filteredPaths.slice(0, 10)"
            :key="path.displayPath"
            @click="destinationPath = path.displayPath"
            class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-600"
          >
            {{ path.displayPath }}
          </button>
        </div>
      </div>

      <div class="flex justify-end space-x-4">
        <button
          @click="cancelMove"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          @click="handleMoveItem"
          :disabled="!destinationPath.trim()"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Move
        </button>
      </div>
    </div>
  </ModalWrapper>

  <!-- Rename Item Modal -->
  <ModalWrapper :model-value="showRenameModal" @update:model-value="cancelRename" class="max-w-md">
    <div class="m-4">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Rename {{ itemToRename?.type === 'folder' ? 'Folder' : 'Project' }}
      </h3>

      <form @submit.prevent="handleRenameItem">
        <div class="mb-4">
          <label for="renameName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Name
          </label>
          <input
            id="renameName"
            v-model="renameForm.name"
            type="text"
            required
            class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
            placeholder="Enter new name"
          >
        </div>

        <div class="mb-4">
          <label for="renameDescription" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description (Optional)
          </label>
          <textarea
            id="renameDescription"
            v-model="renameForm.description"
            v-auto-resize
            class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white resize-none overflow-hidden"
            placeholder="Enter description"
          ></textarea>
        </div>

        <div class="flex justify-end space-x-4">
          <button
            type="button"
            @click="cancelRename"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!renameForm.name.trim()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Rename
          </button>
        </div>
      </form>
    </div>
  </ModalWrapper>

  <!-- Access Settings Modal -->
  <ModalWrapper :model-value="showAccessModal" @update:model-value="cancelAccessSettings" class="max-w-md">
    <div class="m-4">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Access Settings - {{ itemForAccess?.name }}
      </h3>

      <form @submit.prevent="handleAccessUpdate">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Access Policy
          </label>
          <select
            v-model="accessForm.access_policy"
            class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
          >
            <option value="public">Public - All users can access</option>
            <option value="owner">Owner Only - Only creator can access</option>
            <option value="groups">Groups - Only specified groups can access</option>
          </select>
        </div>

        <div v-if="accessForm.access_policy === 'groups'" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Allowed Groups
          </label>

          <!-- Selected Groups -->
          <div v-if="accessForm.allowed_groups.length > 0" class="mb-2">
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(groupId, index) in accessForm.allowed_groups"
                :key="index"
                class="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
              >
                {{ groups.find(g => g.id === groupId)?.name || groupId }}
                <button
                  type="button"
                  @click="removeGroupFromAccess(index)"
                  class="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  ×
                </button>
              </span>
            </div>
          </div>

          <!-- Available Groups -->
          <div v-if="availableGroupsForAccess.length > 0">
            <select
              @change="addGroupToAccess($event.target.value); $event.target.value = ''"
              class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
            >
              <option value="">Select a group to add...</option>
              <option
                v-for="group in availableGroupsForAccess"
                :key="group.id"
                :value="group.id"
              >
                {{ group.name }}
              </option>
            </select>
          </div>

          <p v-else class="text-sm text-gray-500 dark:text-gray-400 mt-2">
            No groups available. Groups are created from user LDAP memberships or manual assignment.
          </p>
        </div>

        <div class="flex justify-end space-x-4">
          <button
            type="button"
            @click="cancelAccessSettings"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Update Access
          </button>
        </div>
      </form>
    </div>
  </ModalWrapper>

  <AuditHistoryModal
    v-model="showAuditModal"
    :isOpen="showAuditModal"
    :entityId="selectedEntityForAudit?.id"
    :entityName="selectedEntityForAudit?.name"
    :entityType="selectedEntityForAudit?.type"
    @close="handleAuditModalClose"
    @reverted="handleProjectReverted"
  />
  </div>
</template>

<script setup>
import ProjectProgressBar from '@/components/ProjectProgressBar.vue'
import AuditHistoryModal from '@/components/modals/AuditHistoryModal.vue'
import ModalWrapper from '@/components/ModalWrapper.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const webSocketStore = useWebSocketStore()
const toast = useToast()

import { nextTick, onMounted, onUnmounted, watch } from 'vue'

// Build stats for project colors
const projectBuildStats = ref(new Map())

// Agent state
const agents = ref([])

// Function to get build stats for a project
const getBuildStats = async (projectId) => {
  try {
    const [buildsResponse, statusResponse] = await Promise.all([
      $fetch(`/api/projects/${projectId}/builds`, { query: { page: 1, limit: 10 } }),
      $fetch(`/api/projects/${projectId}/status`)
    ])
    
    if (!buildsResponse.success || !buildsResponse.builds) return null
    
    const builds = buildsResponse.builds
    const totalBuilds = builds.length
    if (totalBuilds === 0) return null
    
    const successfulBuilds = builds.filter(b => b.status === 'success').length
    const successRate = totalBuilds > 0 ? successfulBuilds / totalBuilds : 0
    const lastBuild = builds[0]
    
    const stats = statusResponse.success ? statusResponse.buildStats : {}
    
    return {
      totalBuilds,
      successRate,
      lastBuildStatus: lastBuild?.status || 'None',
      averageDuration: stats?.averageDuration || 0,
      fastestBuild: stats?.fastestBuild || 0,
      slowestBuild: stats?.slowestBuild || 0
    }
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 500) {
      return null
    }
    logger.warn(`Failed to fetch build stats for project ${projectId}:`, error)
    return null
  }
}

// Function to get project color based on build stats
const getProjectColor = (stats) => {
  if (!stats || stats.totalBuilds === 0) {
    return 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600' // Default gray for no builds
  }
  
  const successRate = stats.successRate * 100 // Convert to percentage
  
  if (successRate >= 80) {
    return 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-600'
  } else if (successRate >= 60) {
    return 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-600'
  } else if (successRate >= 30) {
    return 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-600'
  } else {
    return 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-600'
  }
}

// Function to get project text color based on build stats
const getProjectTextColor = (stats) => {
  if (!stats || stats.totalBuilds === 0) {
    return 'text-gray-700 dark:text-gray-300' // Default for no builds
  }
  
  const successRate = stats.successRate * 100 // Convert to percentage
  
  if (successRate >= 80) {
    return 'text-green-800 dark:text-green-200'
  } else if (successRate >= 60) {
    return 'text-yellow-800 dark:text-yellow-200'
  } else if (successRate >= 30) {
    return 'text-orange-800 dark:text-orange-200'
  } else {
    return 'text-red-800 dark:text-red-200'
  }
}

// Load build stats for projects (with error handling)
const loadBuildStats = async (projects) => {
  if (!projects || projects.length === 0) return
  
  const statsPromises = projects.map(async (project) => {
    const stats = await getBuildStats(project.id)
    if (stats) {
      projectBuildStats.value.set(project.id, stats)
    }
  })
  
  // Wait for all stats to load (or fail gracefully)
  await Promise.allSettled(statsPromises)
}

// Get path from query parameter instead of route params
const pathSegments = computed(() => {
  const pathParam = route.query.path
  if (!pathParam) return []
  
  // Handle both array and string formats
  if (Array.isArray(pathParam)) {
    return pathParam.filter(Boolean)
  }
  
  // Split string path by '/' to create segments
  return pathParam.split('/').filter(Boolean)
})

// Load build stats when projects change
watch(
  () => projectsStore.getProjectsAtPath(pathSegments.value),
  async (newProjects) => {
    projectBuildStats.value.clear()
    await loadBuildStats(newProjects)
  },
  { immediate: false }
)

// Load build stats after store is initialized
onMounted(async () => {
  // Wait for store to be loaded
  await nextTick()
  
  // Small delay to ensure everything is ready
  setTimeout(async () => {
    if (projectsStore.isLoaded) {
      const projects = projectsStore.getProjectsAtPath(pathSegments.value)
      await loadBuildStats(projects)
    }
  }, 100)
})

// Modal states
const showCreateFolderModal = ref(false)
const showCreateProjectModal = ref(false)
const showDeleteProjectModal = ref(false)
const showMoveModal = ref(false)
const showRenameModal = ref(false)
const showAuditModal = ref(false)
const showAccessModal = ref(false)

// Audit history state
const selectedEntityForAudit = ref(null)

// Form data
const folderForm = ref({
  name: '',
  description: ''
})

const projectForm = ref({
  name: '',
  description: '',
  templateId: null
})

// Templates
const availableTemplates = ref([])
const selectedTemplate = computed(() => {
  return availableTemplates.value.find(t => t.id === projectForm.value.templateId)
})

// Project to delete
const projectToDelete = ref(null)

// Move-related state
const itemToMove = ref(null)
const destinationPath = ref('')
const filteredPaths = ref([])

// Rename-related state
const itemToRename = ref(null)
const renameForm = ref({
  name: '',
  description: ''
})

// Access settings state
const itemForAccess = ref(null)
const accessForm = ref({
  access_policy: 'public',
  allowed_groups: []
})
const groups = ref([])
const availableGroupsForAccess = computed(() => {
  return groups.value.filter(g => !accessForm.value.allowed_groups.includes(g.id))
})

// Get items at current path
const foldersAtCurrentPath = computed(() => {
  return projectsStore.getFoldersAtPath(pathSegments.value)
})

const projectsAtCurrentPath = computed(() => {
  return projectsStore.getProjectsAtPath(pathSegments.value)
})

// Current folder info (if we're in a folder)
const currentFolderName = computed(() => {
  return pathSegments.value.length > 0 ? pathSegments.value[pathSegments.value.length - 1] : null
})

const currentFolderDescription = computed(() => {
  if (pathSegments.value.length === 0) return null
  const currentFolder = projectsStore.getItemByFullPath(pathSegments.value)
  return currentFolder?.description || null
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
    displayPath: 'Root',
    item: null
  })
  
  addPaths(projectsStore.allItems)
  return paths
})

// Agent computed properties
const totalProjectsInCurrentPath = computed(() => {
  return projectsAtCurrentPath.value.length
})

const totalFoldersInCurrentPath = computed(() => {
  return foldersAtCurrentPath.value.length
})

const onlineAgentsCount = computed(() => {
  return agents.value.filter(agent => agent.status === 'online').length
})

const busyAgentsCount = computed(() => {
  return agents.value.filter(agent => agent.status === 'busy').length
})

// Navigation helpers
const navigateToFolder = (folderName) => {
  const newPath = [...pathSegments.value, folderName]
  router.push(`/browse?path=${newPath.join('/')}`)
}

const openProject = async (project) => {
  // Unsubscribe from all browse projects before navigating to editor
  for (const projectId of subscribedProjectIds.value) {
    await webSocketStore.unsubscribeFromProject(projectId)
  }
  subscribedProjectIds.value.clear()
  projectsStore.setCurrentProject(project)
  const projectPath = [...project.path, project.name]
  router.push(`/${projectPath.join('/')}/editor`)
}

const viewBuildHistory = (project) => {
  const projectPath = [...project.path, project.name]
  router.push(`/${projectPath.join('/')}/builds`)
}

// Context menu item functions
const getFolderMenuItems = (folder) => {
  return [
    {
      label: 'Audit History',
      icon: 'i-lucide-clock',
      onSelect: () => {
        selectedEntityForAudit.value = folder
        showAuditModal.value = true
      }
    },
    {
      label: 'Rename',
      icon: 'i-lucide-edit-2',
      onSelect: () => {
        itemToRename.value = folder
        renameForm.value.name = folder.name
        renameForm.value.description = folder.description || ''
        showRenameModal.value = true
      }
    },
    {
      label: 'Move',
      icon: 'i-lucide-move',
      onSelect: () => {
        itemToMove.value = folder
        destinationPath.value = ''
        filteredPaths.value = allAvailablePaths.value
        showMoveModal.value = true
      }
    },
    {
      label: 'Access Settings',
      icon: 'i-lucide-shield',
      onSelect: async () => {
        itemForAccess.value = folder
        accessForm.value.access_policy = folder.accessPolicy || 'public'
        accessForm.value.allowed_groups = folder.allowedGroups || []
        await loadGroups()
        showAccessModal.value = true
      }
    },
    {
      label: 'Delete',
      icon: 'i-lucide-trash-2',
      onSelect: () => {
        projectToDelete.value = folder
        showDeleteProjectModal.value = true
      },
      class: 'text-red-600 dark:text-red-400'
    }
  ]
}

const getProjectMenuItems = (project) => {
  const hasPermissions = authStore.getCurrentUser.role === 'admin' || authStore.getCurrentUser.id === project.ownerId
  return [
    {
      label: 'Audit History',
      icon: 'i-lucide-clock',
      onSelect: () => {
        selectedEntityForAudit.value = project
        showAuditModal.value = true
      }
    },
    {
      label: 'Rename',
      icon: 'i-lucide-edit-2',
      onSelect: () => {
        itemToRename.value = project
        renameForm.value.name = project.name
        renameForm.value.description = project.description || ''
        showRenameModal.value = true
      },
      disabled: !hasPermissions
    },
    {
      label: 'Move',
      icon: 'i-lucide-move',
      onSelect: () => {
        itemToMove.value = project
        destinationPath.value = ''
        filteredPaths.value = allAvailablePaths.value
        showMoveModal.value = true
      },
      disabled: !hasPermissions
    },
    {
      label: 'Access Settings',
      icon: 'i-lucide-shield',
      onSelect: async () => {
        itemForAccess.value = project
        accessForm.value.access_policy = project.accessPolicy || 'public'
        accessForm.value.allowed_groups = project.allowedGroups || []
        await loadGroups()
        showAccessModal.value = true
      },
      disabled: !hasPermissions
    },
    {
      label: project.status === 'disabled' ? 'Enable' : 'Disable',
      icon: project.status === 'disabled' ? 'i-lucide-check-circle' : 'i-lucide-ban',
      onSelect: async () => {
        const result = await projectsStore.toggleProjectStatus(project.id)
        if (result.success) {
          logger.info(`Project ${result.status}: ${project.name}`)
          toast.add({ title: `Project ${result.status === 'active' ? 'enabled' : 'disabled'} successfully`, icon: 'i-lucide-check-circle' })
        } else {
          logger.error('Failed to toggle project status:', result.error)
          toast.add({ title: 'Failed to change project status. Please try again.', icon: 'i-lucide-x-circle' })
        }
      },
      class: project.status === 'disabled' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
    },
    {
      label: 'Delete',
      icon: 'i-lucide-trash-2',
      onSelect: () => {
        projectToDelete.value = project
        showDeleteProjectModal.value = true
      },
      disabled: !hasPermissions,
      class: 'text-red-600 dark:text-red-400'
    }
  ]
}

const handleAuditModalClose = () => {
  showAuditModal.value = false
  selectedEntityForAudit.value = null
}

const handleProjectReverted = async (updatedProject) => {
  // Refresh the projects store to get the latest data
  await projectsStore.loadData()

  // Reload build stats for the reverted project
  const stats = await getBuildStats(updatedProject.id)
  if (stats) {
    projectBuildStats.value.set(updatedProject.id, stats)
  }

  showAuditModal.value = false
  selectedEntityForAudit.value = null
}

// Move handlers

const handleMoveItem = async () => {
  if (!itemToMove.value || !destinationPath.value) return
  
  // Find the destination path array
  const destination = filteredPaths.value.find(p => p.displayPath === destinationPath.value)
  if (!destination) return
  
  // Check if trying to move item to its current location
  const currentPath = itemToMove.value.path || []
  if (JSON.stringify(currentPath) === JSON.stringify(destination.path)) {
    error('Item is already in the selected location.')
    return
  }
  
  // Check if trying to move folder into itself or its children
  if (itemToMove.value.type === 'folder') {
    const itemFullPath = [...currentPath, itemToMove.value.name]
    if (destination.path.length >= itemFullPath.length && 
        JSON.stringify(destination.path.slice(0, itemFullPath.length)) === JSON.stringify(itemFullPath)) {
      error('Cannot move a folder into itself or its children.')
      return
    }
  }
  
  const result = await projectsStore.moveItem(itemToMove.value.id, destination.path)
  
  if (result.success) {
    toast.add({ title: 'Item moved successfully', icon: 'i-lucide-check-circle' })
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

// Rename handlers
const handleRenameItem = async () => {
  if (!itemToRename.value || !renameForm.value.name.trim()) return
  
  const result = await projectsStore.updateItem(itemToRename.value.id, {
    name: renameForm.value.name.trim(),
    description: renameForm.value.description.trim()
  })
  
  if (result.success) {
    toast.add({ title: 'Item renamed successfully', icon: 'i-lucide-check-circle' })
    cancelRename()
  } else {
    logger.error('Failed to rename item:', result.error)
    toast.add({ title: 'Failed to rename item. Please try again.', icon: 'i-lucide-x-circle' })
  }
}

const cancelRename = () => {
  showRenameModal.value = false
  itemToRename.value = null
  renameForm.value = { name: '', description: '' }
}

// Access settings handlers
const loadGroups = async () => {
  try {
    groups.value = await $fetch('/api/admin/groups')
  } catch (error) {
    logger.error('Failed to load groups:', error)
    groups.value = []
  }
}

const handleAccessUpdate = async () => {
  if (!itemForAccess.value) return
  
  try {
    await $fetch(`/api/items/${itemForAccess.value.id}`, {
      method: 'PUT',
      body: {
        accessPolicy: accessForm.value.access_policy,
        allowedGroups: accessForm.value.allowed_groups
      }
    })
    
    // Update local item
    itemForAccess.value.accessPolicy = accessForm.value.access_policy
    itemForAccess.value.allowedGroups = accessForm.value.allowed_groups
    toast.add({ title: 'Access settings updated successfully', icon: 'i-lucide-check-circle' })
    cancelAccessSettings()
  } catch (error) {
    logger.error('Failed to update access settings:', error)
    toast.add({ title: 'Failed to update access settings. Please try again.', icon: 'i-lucide-x-circle' })
  }
}

const cancelAccessSettings = () => {
  showAccessModal.value = false
  itemForAccess.value = null
  accessForm.value = { access_policy: 'public', allowed_groups: [] }
}

const addGroupToAccess = (group) => {
  if (!accessForm.value.allowed_groups.includes(group)) {
    accessForm.value.allowed_groups.push(group)
  }
}

const removeGroupFromAccess = (index) => {
  accessForm.value.allowed_groups.splice(index, 1)
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

// Delete and status handlers
const handleDeleteProject = async () => {
  if (!projectToDelete.value) return
  
  const result = await projectsStore.deleteItem(projectToDelete.value.id)
  
  if (result.success) {
    toast.add({ title: 'Item deleted successfully', icon: 'i-lucide-check-circle' })
    showDeleteProjectModal.value = false
    projectToDelete.value = null
  } else {
    logger.error('Failed to delete project:', result.error)
    toast.add({ title: 'Failed to delete item. Please try again.', icon: 'i-lucide-x-circle' })
  }
}

const cancelDeleteProject = () => {
  showDeleteProjectModal.value = false
  projectToDelete.value = null
}

// Folder delete handlers

// Form handlers
const handleCreateFolder = async () => {
  if (!folderForm.value.name.trim()) return
  
  const result = await projectsStore.createFolder(
    folderForm.value.name.trim(),
    folderForm.value.description.trim(),
    pathSegments.value
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

const handleCreateProject = async () => {
  if (!projectForm.value.name.trim()) return

  const result = await projectsStore.createProject(
    projectForm.value.name.trim(),
    projectForm.value.description.trim(),
    pathSegments.value
  )

  if (result.success) {
    // If a template was selected, apply it to the project
    if (projectForm.value.templateId) {
      try {
        const templateResponse = await $fetch(`/api/templates/${projectForm.value.templateId}`)
        if (templateResponse.success && templateResponse.template) {
          // Update the project with the template's diagram data
          await projectsStore.updateProject(result.project.id, {
            diagramData: templateResponse.template.diagramData
          })
          toast.add({ title: 'Project created from template successfully', icon: 'i-lucide-check-circle' })
        }
      } catch (error) {
        logger.error('Failed to apply template:', error)
        toast.add({ title: 'Project created but failed to apply template', icon: 'i-lucide-alert-circle' })
      }
    } else {
      toast.add({ title: 'Project created successfully', icon: 'i-lucide-check-circle' })
    }

    projectForm.value = { name: '', description: '', templateId: null }
    showCreateProjectModal.value = false
    // Navigate to the new project
    openProject(result.project)
  } else {
    logger.error('Failed to create project:', result.error)
    toast.add({ title: 'Failed to create project. Please try again.', icon: 'i-lucide-x-circle' })
  }
}

const formatDate = (date) => {
  const dateObj = date instanceof Date ? date : typeof date === 'string' ? new Date(date) : new Date()
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44)) // Average days per month
  
  // Format time as HH:MM AM/PM
  const timeString = dateObj.toLocaleTimeString('en-US', { 
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
    loadAgents() // Reload if agent not found (new agent connected)
  }
}

// Track currently subscribed projects
const subscribedProjectIds = ref(new Set())

// Setup WebSocket subscriptions for visible projects
const setupProjectSubscriptions = async () => {
  try {
    if (!webSocketStore.isConnected) {
      await webSocketStore.connect()
    }

    // Get current visible projects
    const visibleProjects = [...projectsAtCurrentPath.value]
    const visibleProjectIds = new Set(visibleProjects.map(p => p.id))

    // Unsubscribe from projects that are no longer visible
    for (const projectId of subscribedProjectIds.value) {
      if (!visibleProjectIds.has(projectId)) {
        await webSocketStore.unsubscribeFromProject(projectId)
        subscribedProjectIds.value.delete(projectId)
      }
    }

    // Subscribe to newly visible projects
    for (const project of visibleProjects) {
      if (!subscribedProjectIds.value.has(project.id)) {
        await webSocketStore.subscribeToProject(project.id)
        subscribedProjectIds.value.add(project.id)
      }
    }
  } catch (error) {
    logger.error('Failed to setup project subscriptions:', error)
  }
}

// Watch for path changes and update subscriptions
watch(
  () => pathSegments.value,
  async () => {
    await setupProjectSubscriptions()
  },
  { deep: true }
)

// Watch for create project modal opening to load templates
watch(showCreateProjectModal, async (isOpen) => {
  if (isOpen) {
    try {
      const response = await $fetch('/api/templates')
      if (response.success) {
        availableTemplates.value = response.templates
      }
    } catch (error) {
      logger.error('Failed to load templates:', error)
    }
  }
})

// Load data on mount
onMounted(async () => {
  try {
    // Ensure authentication is initialized before loading data
    if (!authStore.isAuthenticated) {
      await authStore.initializeAuth()
    }

    // Only load data if authenticated
    if (authStore.isAuthenticated) {
      await projectsStore.loadData()
      await loadAgents()
      await setupProjectSubscriptions()

      // Listen for real-time agent status updates
      if (typeof window !== 'undefined') {
        window.addEventListener('agentStatusUpdate', handleAgentStatusUpdate)
      }
    }
  } catch (error) {
    logger.error('Failed to initialize page:', error)
  }
})

// Clean up event listener and subscriptions on unmount
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('agentStatusUpdate', handleAgentStatusUpdate)
  }

  // Unsubscribe from all projects we subscribed to
  for (const projectId of subscribedProjectIds.value) {
    webSocketStore.unsubscribeFromProject(projectId)
  }
  subscribedProjectIds.value.clear()
})
</script>

<style scoped>
/* Smooth scrolling for the grid container */
.overflow-y-auto {
  scroll-behavior: smooth;
}

/* Prevent overscroll bounce */
.overscroll-none {
  overscroll-behavior: none;
}

/* Custom scrollbar styling for webkit browsers */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}

/* Dark mode scrollbar */
.dark .overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.5);
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(75, 85, 99, 0.7);
}
</style>