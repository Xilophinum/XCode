<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950" @click="closeAllMenus">
    <!-- Navigation -->
    <AppNavigation />

    <!-- Main Content -->
    <main class="max-w-8xl mx-auto py-4 sm:px-6 lg:px-8">
      <div class="px-4 sm:px-0">
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-950 dark:text-white">Dashboard</h2>
          <p class="text-gray-600 dark:text-gray-300">Manage your hierarchical project folders</p>
        </div>

        <!-- Dashboard Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <!-- Projects Count -->
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Projects</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ totalProjects }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Online Agents -->
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Online Agents</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ onlineAgentsCount }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Busy Agents -->
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Busy Agents</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ busyAgentsCount }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Build Success Rate -->
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Build Success Rate</dt>
                    <dd 
                      :class="['text-lg font-medium', buildSuccessRate > 80 ? 'text-green-600 dark:text-green-400' : buildSuccessRate > 70 ? 'text-yellow-600 dark:text-yellow-400' : buildSuccessRate > 55 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400']"
                    >{{ buildSuccessRate }}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Admin Tools (for admin users only) -->
        <div v-if="authStore.user?.role === 'admin'" class="mb-8">
          <h3 class="text-lg font-medium text-gray-950 dark:text-white mb-4">Admin Tools</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Agents Management Card -->
            <NuxtLink
              to="/agents"
              class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow group"
            >
              <div class="p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-md flex items-center justify-center">
                      <svg class="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
                      </svg>
                    </div>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <h4 class="text-lg font-medium text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      Build Agents
                    </h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Manage and monitor your build agents. View agent status, capabilities, and job history.
                    </p>
                    <div class="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <span class="inline-flex items-center">
                        <div class="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                        {{ onlineAgentsCount }} online
                      </span>
                      <span class="mx-2">•</span>
                      <span class="inline-flex items-center">
                        <div class="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                        {{ busyAgentsCount }} busy
                      </span>
                    </div>
                  </div>
                  <div class="flex-shrink-0">
                    <svg class="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </NuxtLink>

            <!-- Failed Builds Card -->
            <NuxtLink
              to="/failures"
              class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow group"
            >
              <div class="p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-md flex items-center justify-center">
                      <svg class="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <h4 class="text-lg font-medium text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      Failed Projects
                    </h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Projects where latest build failed. View logs and quickly rebuild.
                    </p>
                  </div>
                  <div class="flex-shrink-0">
                    <svg class="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </NuxtLink>

            <!-- Admin Panel Card -->
            <NuxtLink
              to="/admin"
              class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow group"
            >
              <div class="p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-md flex items-center justify-center">
                      <svg class="w-7 h-7 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                    </div>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <h4 class="text-lg font-medium text-gray-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                      Admin Panel
                    </h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      System settings, environment variables, security configuration, and user management.
                    </p>
                    <div class="mt-2 flex items-center text-sm text-yellow-600 dark:text-yellow-400">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0h-2m9-7a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Admin Access Required
                    </div>
                  </div>
                  <div class="flex-shrink-0">
                    <svg class="w-5 h-5 text-gray-400 group-hover:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Folders Section -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg leading-6 font-medium text-gray-950 dark:text-white">
                Folders
              </h3>
              <button
                @click="showCreateFolderModal = true"
                class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                New Folder
              </button>
            </div>

            <div v-if="projectsStore.isLoading" class="text-center py-8">
              <p class="text-gray-600 dark:text-gray-300">Loading folders...</p>
            </div>

            <div v-else-if="rootFolders.length === 0" class="text-center py-8">
              <p class="text-gray-600 dark:text-gray-300 mb-4">No folders yet. Create your first folder!</p>
            </div>

            <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div
                v-for="folder in rootFolders"
                :key="folder.id"
                class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow bg-slate-50 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-800/30 relative group"
              >
                <!-- Folder Actions Menu -->
                <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div class="relative">
                    <button
                      @click.stop="toggleFolderMenu(folder.id)"
                      class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    
                    <!-- Dropdown Menu -->
                    <div
                      v-if="activeFolderMenu === folder.id"
                      class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10"
                    >
                      <div class="py-1">
                        <button
                          @click.stop="startEditFolder(folder)"
                          class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Edit
                        </button>
                        <button
                          @click.stop="confirmMoveItem(folder)"
                          class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Move
                        </button>
                        <button
                          @click.stop="confirmDeleteFolder(folder)"
                          class="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Folder Content (clickable) -->
                <div 
                  @click="openFolder(folder)"
                  class="cursor-pointer"
                >
                  <h4 class="font-medium text-gray-950 dark:text-white mb-2">{{ folder.name }}</h4>
                  <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">{{ folder.description || '' }}</p>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    Updated {{ formatDate(folder.updatedAt) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Folder Modal -->
    <div v-if="showCreateFolderModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-950 dark:text-white mb-4">Create New Folder</h3>
          <form @submit.prevent="handleCreateFolder">
            <div class="mb-4">
              <label for="folderName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Folder Name</label>
              <input
                id="folderName"
                v-model="folderForm.name"
                type="text"
                required
                class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
                placeholder="Enter folder name"
              >
            </div>
            <div class="mb-4">
              <label for="folderDescription" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
              <textarea
                id="folderDescription"
                v-model="folderForm.description"
                rows="3"
                class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
                placeholder="Enter folder description"
              ></textarea>
            </div>
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                @click="showCreateFolderModal = false"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!folderForm.name.trim()"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                Create Folder
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Folder Modal -->
    <div v-if="showEditFolderModal" class="fixed inset-0 bg-gray-600  bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-950 dark:text-white mb-4">Edit Folder</h3>
          <form @submit.prevent="handleEditFolder">
            <div class="mb-4">
              <label for="editFolderName" class="block text-sm font-medium text-gray-700">Folder Name</label>
              <input
                id="editFolderName"
                v-model="editForm.name"
                type="text"
                required
                class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter folder name"
              >
            </div>
            <div class="mb-4">
              <label for="editFolderDescription" class="block text-sm font-medium text-gray-700">Description (Optional)</label>
              <textarea
                id="editFolderDescription"
                v-model="editForm.description"
                rows="3"
                class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter folder description"
              ></textarea>
            </div>
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                @click="cancelEdit"
                class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!editForm.name.trim()"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirmModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div class="mt-3">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
            <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-950 dark:text-white mb-2 text-center">Delete Folder</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
            Are you sure you want to delete "<strong>{{ folderToDelete?.name }}</strong>"?
          </p>
          <p class="text-sm text-red-600 dark:text-red-400 mb-4 text-center">
            <strong>Warning:</strong> This will also delete all folders and projects inside this folder. This action cannot be undone.
          </p>
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="cancelDelete"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="handleDeleteFolder"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Delete Folder
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Move Item Modal -->
    <div v-if="showMoveModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" @click="cancelMove">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full" @click.stop>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Move Folder
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Moving "{{ itemToMove?.name }}" to a new location.
          All contents will move with the folder.
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
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const webSocketStore = useWebSocketStore()
const { success, error } = useNotifications()

// Modal state
const showCreateFolderModal = ref(false)
const showEditFolderModal = ref(false)
const showDeleteConfirmModal = ref(false)
const showMoveModal = ref(false)
const activeFolderMenu = ref(null)

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
    displayPath: 'Root',
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
    success('Folder created successfully')
    folderForm.value = { name: '', description: '' }
    showCreateFolderModal.value = false
  } else {
    logger.error('Failed to create folder:', result.error)
    error('Failed to create folder. Please try again.')
  }
}

const toggleFolderMenu = (folderId) => {
  activeFolderMenu.value = activeFolderMenu.value === folderId ? null : folderId
}

const closeAllMenus = () => {
  activeFolderMenu.value = null
}

const startEditFolder = (folder) => {
  editForm.value = {
    id: folder.id,
    name: folder.name,
    description: folder.description || ''
  }
  showEditFolderModal.value = true
  activeFolderMenu.value = null
}

const handleEditFolder = async () => {
  if (!editForm.value.name.trim()) return
  
  const result = await projectsStore.editFolder(
    editForm.value.id,
    editForm.value.name.trim(),
    editForm.value.description.trim()
  )
  
  if (result.success) {
    success('Folder updated successfully')
    cancelEdit()
  } else {
    logger.error('Failed to edit folder:', result.error)
    error('Failed to update folder. Please try again.')
  }
}

const cancelEdit = () => {
  editForm.value = { id: '', name: '', description: '' }
  showEditFolderModal.value = false
}

const confirmDeleteFolder = (folder) => {
  folderToDelete.value = folder
  showDeleteConfirmModal.value = true
  activeFolderMenu.value = null
}

const handleDeleteFolder = async () => {
  if (!folderToDelete.value) return
  
  const result = await projectsStore.deleteFolder(folderToDelete.value.id)
  
  if (result.success) {
    success('Folder deleted successfully')
    cancelDelete()
  } else {
    logger.error('Failed to delete folder:', result.error)
    error('Failed to delete folder. Please try again.')
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
  activeFolderMenu.value = null
}

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
    success('Folder moved successfully')
    cancelMove()
  } else {
    logger.error('Failed to move item:', result.error)
    error('Failed to move item. Please try again.')
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
  // Ensure authentication is initialized before loading data
  if (!authStore.isAuthenticated) {
    await authStore.initializeAuth()
  }
  
  // Only load data if authenticated
  if (authStore.isAuthenticated) {
    await projectsStore.loadData()
    await loadAgents()
  }
  webSocketStore.unsubscribeFromAllProjects()
})

onUnmounted(() => {
  // Cleanup is handled by the @click handler on the main div
})
</script>
