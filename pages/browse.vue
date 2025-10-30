<template>
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
            <button
              @click="showCreateFolderModal = true"
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Folder
            </button>
            
            <button
              @click="showCreateProjectModal = true"
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Project
            </button>
          </div>
        </div>

        <!-- Quick Stats Bar -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-6">
              <div class="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <svg class="w-4 h-4 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0"></path>
                </svg>
                <span class="font-medium">{{ totalProjectsInCurrentPath }}</span>
                <span class="ml-1">{{ totalProjectsInCurrentPath === 1 ? 'project' : 'projects' }}</span>
              </div>
              
              <div class="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <svg class="w-4 h-4 mr-1.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="font-medium">{{ onlineAgentsCount }}</span>
                <span class="ml-1">online agents</span>
              </div>
              
              <div class="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <svg class="w-4 h-4 mr-1.5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
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
          <div
            v-for="folder in foldersAtCurrentPath"
            :key="folder.id"
            class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30 relative group"
          >
            <!-- Folder Actions Menu -->
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <!-- Audit History Button -->
              <button
                @click.stop="showAuditHistory(folder)"
                class="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                v-tooltip="'View history'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <div class="relative">
                <button
                  @click.stop="toggleFolderMenu(folder.id)"
                  class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                      @click.stop="confirmRenameItem(folder)"
                      class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Rename
                    </button>
                    <button
                      @click.stop="confirmMoveItem(folder)"
                      class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Move
                    </button>
                    <button
                      @click.stop="showAccessSettings(folder)"
                      class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Access Settings
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
              @click.stop="navigateToFolder(folder.name)"
              class="cursor-pointer"
            >
              <div class="flex items-center mb-2">
                <svg class="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h3 class="font-medium text-gray-950 dark:text-white">{{ folder.name }}</h3>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">{{ folder.description || '' }}</p>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatDate(folder.updatedAt) }}
              </div>
            </div>
          </div>

          <!-- Projects -->
          <div
            v-for="project in projectsAtCurrentPath"
            :key="project.id"
            :class="[
              'border rounded-lg p-4 hover:shadow-md transition-shadow relative group',
              project.status === 'disabled' ? 'opacity-60 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800' : getProjectColor(projectBuildStats.get(project.id))
            ]"
          >
            <!-- Project Actions Menu -->
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <!-- Audit History Button -->
              <button
                @click.stop="showAuditHistory(project)"
                class="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                v-tooltip="'View history'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <div class="relative">
                <button
                  @click.stop="toggleProjectMenu(project.id)"
                  class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                
                <!-- Dropdown Menu -->
                <div
                  v-if="activeProjectMenu === project.id"
                  class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10"
                >
                  <div class="py-1">
                    <button
                      @click.stop="confirmRenameItem(project)"
                      class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Rename
                    </button>
                    <button
                      @click.stop="confirmMoveItem(project)"
                      class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Move
                    </button>
                    <button
                      @click.stop="showAccessSettings(project)"
                      class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Access Settings
                    </button>
                    <button
                      @click.stop="toggleProjectStatus(project)"
                      :class="[
                        'block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                        project.status === 'disabled' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                      ]"
                    >
                      {{ project.status === 'disabled' ? 'Enable' : 'Disable' }}
                    </button>
                    <button
                      @click.stop="confirmDeleteProject(project)"
                      class="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Delete
                    </button>
                    
                  </div>
                </div>
              </div>
            </div>

            <!-- Project Content (clickable) -->
            <div 
              @click.stop="openProject(project)"
              class="cursor-pointer"
            >
              <div class="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><defs><symbol id="SVGf9bFLczd"><path d="M15.24 6.37C15.65 6.6 16.04 6.88 16.38 7.2C16.6 7.4 16.8 7.61 16.99 7.83C17.46 8.4 17.85 9.05 18.11 9.77C18.2 10.03 18.28 10.31 18.35 10.59C18.45 11.04 18.5 11.52 18.5 12"><animate fill="freeze" attributeName="d" begin="0.9s" dur="0.2s" values="M15.24 6.37C15.65 6.6 16.04 6.88 16.38 7.2C16.6 7.4 16.8 7.61 16.99 7.83C17.46 8.4 17.85 9.05 18.11 9.77C18.2 10.03 18.28 10.31 18.35 10.59C18.45 11.04 18.5 11.52 18.5 12;M15.24 6.37C15.65 6.6 16.04 6.88 16.38 7.2C16.38 7.2 19 6.12 19.01 6.14C19.01 6.14 20.57 8.84 20.57 8.84C20.58 8.87 18.35 10.59 18.35 10.59C18.45 11.04 18.5 11.52 18.5 12"/></path></symbol></defs><g fill="none" stroke="currentColor" stroke-width="2"><g stroke-linecap="round"><path stroke-dasharray="20" stroke-dashoffset="20" d="M12 9c1.66 0 3 1.34 3 3c0 1.66 -1.34 3 -3 3c-1.66 0 -3 -1.34 -3 -3c0 -1.66 1.34 -3 3 -3Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.2s" values="20;0"/></path><path stroke-dasharray="48" stroke-dashoffset="48" d="M12 5.5c3.59 0 6.5 2.91 6.5 6.5c0 3.59 -2.91 6.5 -6.5 6.5c-3.59 0 -6.5 -2.91 -6.5 -6.5c0 -3.59 2.91 -6.5 6.5 -6.5Z"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.2s" dur="0.6s" values="48;0"/><set fill="freeze" attributeName="opacity" begin="0.9s" to="0"/></path></g><g opacity="0"><use href="#SVGf9bFLczd"/><use href="#SVGf9bFLczd" transform="rotate(60 12 12)"/><use href="#SVGf9bFLczd" transform="rotate(120 12 12)"/><use href="#SVGf9bFLczd" transform="rotate(180 12 12)"/><use href="#SVGf9bFLczd" transform="rotate(240 12 12)"/><use href="#SVGf9bFLczd" transform="rotate(300 12 12)"/><set fill="freeze" attributeName="opacity" begin="0.9s" to="1"/><animateTransform attributeName="transform" dur="30s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/></g></g></svg>
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
                  v-tooltip="'View build history'"
                >
                  View History
                </button>
              </div>
              
              <div v-else class="flex items-center justify-between mb-2">
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  No builds yet
                </div>
                <button
                  @click.stop="viewBuildHistory(project)"
                  class="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
                  v-tooltip="'View build history'"
                >
                  View History
                </button>
              </div>
              
              <div class="text-xs" :class="getProjectTextColor(projectBuildStats.get(project.id))">
                {{ formatDate(project.updatedAt) }}
              </div>
              
              <!-- Progress Bar -->
              <ProjectProgressBar 
                :projectId="project.id"
                :buildStats="projectBuildStats.get(project.id)"
              />
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="foldersAtCurrentPath.length === 0 && projectsAtCurrentPath.length === 0" class="col-span-full text-center py-8">
            <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-950 dark:text-white">No items found</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new folder or project.</p>
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
                class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
                placeholder="Enter folder name"
              >
            </div>
            <div class="mb-4">
              <label for="folderDescription" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
              <textarea
                id="folderDescription"
                v-model="folderForm.description"
                rows="3"
                class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
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
      </div>
    </div>

    <!-- Create Project Modal -->
    <div v-if="showCreateProjectModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div class="mt-3">
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
              <label for="projectDescription" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
              <textarea
                id="projectDescription"
                v-model="projectForm.description"
                rows="3"
                class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
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
      </div>
    </div>
  </div>
  <!-- Delete Project Confirmation Modal -->
  <div v-if="showDeleteProjectModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" @click="cancelDeleteProject">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full" @click.stop>
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
  </div>

  <!-- Move Item Modal -->
  <div v-if="showMoveModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" @click="cancelMove">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full" @click.stop>
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
  </div>

  <!-- Rename Item Modal -->
  <div v-if="showRenameModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" @click="cancelRename">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full" @click.stop>
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
            rows="3"
            class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
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
  </div>

  <!-- Access Settings Modal -->
  <div v-if="showAccessModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" @click="cancelAccessSettings">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full" @click.stop>
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
                v-for="(group, index) in accessForm.allowed_groups"
                :key="index"
                class="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
              >
                {{ group }}
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
          <div v-if="availableGroups.length > 0">
            <select
              @change="addGroupToAccess($event.target.value); $event.target.value = ''"
              class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
            >
              <option value="">Select a group to add...</option>
              <option
                v-for="group in availableGroups.filter(g => !accessForm.allowed_groups.includes(g))"
                :key="group"
                :value="group"
              >
                {{ group }}
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
  </div>

  <AuditHistoryModal
    :isOpen="showAuditModal"
    :entityId="selectedEntityForAudit?.id"
    :entityName="selectedEntityForAudit?.name"
    :entityType="selectedEntityForAudit?.type"
    @close="handleAuditModalClose"
  />
</template>

<script setup>
import ProjectProgressBar from '@/components/ProjectProgressBar.vue'
import AuditHistoryModal from '@/components/AuditHistoryModal.vue'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const webSocketStore = useWebSocketStore()

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

// Menu states
const activeProjectMenu = ref(null)
const activeFolderMenu = ref(null)

// Audit history state
const selectedEntityForAudit = ref(null)

// Form data
const folderForm = ref({
  name: '',
  description: ''
})

const projectForm = ref({
  name: '',
  description: ''
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
const availableGroups = computed(() => {
  return groups.value.map(g => g.name)
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

// Project menu handlers
const toggleProjectMenu = (projectId) => {
  activeProjectMenu.value = activeProjectMenu.value === projectId ? null : projectId
}

// Folder menu handlers
const toggleFolderMenu = (folderId) => {
  activeFolderMenu.value = activeFolderMenu.value === folderId ? null : folderId
}

const closeAllMenus = () => {
  activeProjectMenu.value = null
  activeFolderMenu.value = null
}

// Audit history handlers
const showAuditHistory = (entity) => {
  selectedEntityForAudit.value = entity
  showAuditModal.value = true
  activeProjectMenu.value = null
  activeFolderMenu.value = null
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
const confirmMoveItem = (item) => {
  itemToMove.value = item
  destinationPath.value = ''
  filteredPaths.value = allAvailablePaths.value
  showMoveModal.value = true
  activeProjectMenu.value = null
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
    alert('Item is already in the selected location.')
    return
  }
  
  // Check if trying to move folder into itself or its children
  if (itemToMove.value.type === 'folder') {
    const itemFullPath = [...currentPath, itemToMove.value.name]
    if (destination.path.length >= itemFullPath.length && 
        JSON.stringify(destination.path.slice(0, itemFullPath.length)) === JSON.stringify(itemFullPath)) {
      alert('Cannot move a folder into itself or its children.')
      return
    }
  }
  
  const result = await projectsStore.moveItem(itemToMove.value.id, destination.path)
  
  if (result.success) {
    cancelMove()
  } else {
    logger.error('Failed to move item:', result.error)
    alert('Failed to move item. Please try again.')
  }
}

const cancelMove = () => {
  showMoveModal.value = false
  itemToMove.value = null
  destinationPath.value = ''
  filteredPaths.value = []
}

// Rename handlers
const confirmRenameItem = (item) => {
  itemToRename.value = item
  renameForm.value.name = item.name
  renameForm.value.description = item.description || ''
  showRenameModal.value = true
  activeProjectMenu.value = null
  activeFolderMenu.value = null
}

const handleRenameItem = async () => {
  if (!itemToRename.value || !renameForm.value.name.trim()) return
  
  const result = await projectsStore.updateItem(itemToRename.value.id, {
    name: renameForm.value.name.trim(),
    description: renameForm.value.description.trim()
  })
  
  if (result.success) {
    cancelRename()
  } else {
    logger.error('Failed to rename item:', result.error)
    alert('Failed to rename item. Please try again.')
  }
}

const cancelRename = () => {
  showRenameModal.value = false
  itemToRename.value = null
  renameForm.value = { name: '', description: '' }
}

// Access settings handlers
const showAccessSettings = async (item) => {
  itemForAccess.value = item
  accessForm.value.access_policy = item.accessPolicy || 'public'
  accessForm.value.allowed_groups = item.allowedGroups || []
  
  await loadGroups()
  
  showAccessModal.value = true
  activeProjectMenu.value = null
  activeFolderMenu.value = null
}

const loadGroups = async () => {
  try {
    const settings = await $fetch('/api/admin/system-settings')
    const groupsSetting = Object.values(settings).flat().find(s => s.key === 'user_groups')
    if (groupsSetting?.value) {
      groups.value = JSON.parse(groupsSetting.value).map((name, index) => ({ id: index, name }))
    } else {
      groups.value = []
    }
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
    
    cancelAccessSettings()
  } catch (error) {
    logger.error('Failed to update access settings:', error)
    alert('Failed to update access settings. Please try again.')
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

const confirmDeleteProject = (project) => {
  projectToDelete.value = project
  activeProjectMenu.value = null
  showDeleteProjectModal.value = true
}

const toggleProjectStatus = async (project) => {
  activeProjectMenu.value = null
  
  const result = await projectsStore.toggleProjectStatus(project.id)
  
  if (result.success) {
    logger.info(`Project ${result.status}: ${project.name}`)
  } else {
    logger.error('Failed to toggle project status:', result.error)
    alert('Failed to change project status. Please try again.')
  }
}

const handleDeleteProject = async () => {
  if (!projectToDelete.value) return
  
  const result = await projectsStore.deleteItem(projectToDelete.value.id)
  
  if (result.success) {
    showDeleteProjectModal.value = false
    projectToDelete.value = null
  } else {
    logger.error('Failed to delete project:', result.error)
    alert('Failed to delete project. Please try again.')
  }
}

const cancelDeleteProject = () => {
  showDeleteProjectModal.value = false
  projectToDelete.value = null
}

// Folder delete handlers
const confirmDeleteFolder = (folder) => {
  // For now, use the same modal structure - you could create a separate one
  projectToDelete.value = folder
  showDeleteProjectModal.value = true
  activeFolderMenu.value = null
}

// Form handlers
const handleCreateFolder = async () => {
  if (!folderForm.value.name.trim()) return
  
  const result = await projectsStore.createFolder(
    folderForm.value.name.trim(),
    folderForm.value.description.trim(),
    pathSegments.value
  )
  
  if (result.success) {
    folderForm.value = { name: '', description: '' }
    showCreateFolderModal.value = false
  } else {
    logger.error('Failed to create folder:', result.error)
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
    projectForm.value = { name: '', description: '' }
    showCreateProjectModal.value = false
    // Navigate to the new project
    openProject(result.project)
  } else {
    logger.error('Failed to create project:', result.error)
  }
}

const formatDate = (date) => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
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