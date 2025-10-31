<template>
  <div class="h-screen bg-neutral-50 dark:bg-neutral-900 overflow-hidden">
    <!-- Navigation -->
    <AppNavigation :breadcrumbs="pathSegments">
      <template #mobile-actions>
        <!-- Mobile: Only show Run/Cancel and Save buttons -->
        <div class="inline-flex rounded-md shadow-sm">
          <NuxtLink
            v-if="isExecuting && currentBuildNumber"
            :to="`/${pathSegments.slice(0, -1).join('/')}/build/${currentBuildNumber}`"
            class="relative inline-flex items-center px-2 py-2 border border-transparent text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 rounded-md"
          >
            <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </NuxtLink>
          <button
            v-else
            @click="executeGraph"
            :disabled="isExecuting || project?.status === 'disabled'"
            class="relative inline-flex items-center px-2 py-2 border border-transparent text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 rounded-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-dasharray="40" stroke-dashoffset="40" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 6l10 6l-10 6Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.5s" dur="0.5s" values="0;1"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.5s" values="40;0"/></path></svg>
          </button>

        </div>
        <button
          @click="saveProject"
          :disabled="isSaving"
          class="inline-flex items-center px-2 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M20 7.423v10.962q0 .69-.462 1.153T18.384 20H5.616q-.691 0-1.153-.462T4 18.384V5.616q0-.691.463-1.153T5.616 4h10.961zm-8.004 9.115q.831 0 1.417-.582T14 14.543t-.582-1.418t-1.413-.586t-1.419.581T10 14.535t.582 1.418t1.414.587M6.769 9.77h7.423v-3H6.77z"/></svg>
        </button>
      </template>
      <template #actions>
        <!-- Run/Cancel Split Button -->
        <div class="inline-flex rounded-md shadow-sm">
          <!-- Main Run Button or View Build Link -->
          <NuxtLink
            v-if="isExecuting && currentBuildNumber"
            :to="`/${pathSegments.slice(0, -1).join('/')}/build/${currentBuildNumber}`"
            class="relative inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 rounded-md"
          >
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            View Build #{{ currentBuildNumber }}
          </NuxtLink>
          <button
            v-else
            @click="executeGraph"
            :disabled="isExecuting || project?.status === 'disabled'"
            class="relative inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 rounded-md"
          >
            <svg v-if="isExecuting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="mr-2"><path fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-dasharray="40" stroke-dashoffset="40" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 6l10 6l-10 6Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.5s" dur="0.5s" values="0;1"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.5s" values="40;0"/></path></svg>Run
            </span>
          </button>
          

        </div>

        <button
          @click="saveProject"
          :disabled="isSaving"
          class="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          <svg v-if="isSaving" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span v-if="isSaving">Saving...</span>
          <span v-else class="inline-flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M20 7.423v10.962q0 .69-.462 1.153T18.384 20H5.616q-.691 0-1.153-.462T4 18.384V5.616q0-.691.463-1.153T5.616 4h10.961zm-8.004 9.115q.831 0 1.417-.582T14 14.543t-.582-1.418t-1.413-.586t-1.419.581T10 14.535t.582 1.418t1.414.587M6.769 9.77h7.423v-3H6.77z"/></svg>Save
          </span>
        </button>

        <!-- Project Status Toggle -->
        <button
          @click="toggleProjectStatus"
          :disabled="isTogglingStatus"
          :class="[
            'inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50',
            project?.status === 'disabled' 
              ? 'text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:ring-green-500' 
              : 'text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 focus:ring-amber-500'
          ]"
        >
          <svg v-if="isTogglingStatus" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span v-if="isTogglingStatus">{{ project?.status === 'disabled' ? 'Enabling...' : 'Disabling...' }}</span>
          <span v-else class="inline-flex items-center">
            <svg v-if="project?.status === 'disabled'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="mr-2">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="mr-2">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
            </svg>
            {{ project?.status === 'disabled' ? 'Enable' : 'Disable' }}
          </span>
        </button>

        <!-- Build History Link -->
        <NuxtLink
          :to="`/${pathSegments.slice(0, -1).join('/')}/builds`"
          class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          v-tooltip="'View build history'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="mr-2">
            <path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
          </svg>
          Build History
        </NuxtLink>

        <!-- Retention Settings Button -->
        <button
          @click="showRetentionModal = true"
          class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          v-tooltip="'Configure build retention policies'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="mr-2">
            <path fill="currentColor" d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64"/>
          </svg>
          Settings
        </button>
      </template>
    </AppNavigation>

    <!-- Execution Warning Banner -->
    <div v-if="isExecuting && currentBuildNumber" class="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
      <div class="px-4 py-3 sm:px-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-blue-800 dark:text-blue-200">
              Build #{{ currentBuildNumber }} is currently executing
            </p>
            <p class="text-xs text-blue-700 dark:text-blue-300 mt-1">
              This project is currently running. Click "View Build" to monitor progress or cancel execution.
            </p>
          </div>
          <div class="ml-auto">
            <NuxtLink
              :to="`/${pathSegments.slice(0, -1).join('/')}/build/${currentBuildNumber}`"
              class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Build #{{ currentBuildNumber }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Disabled Project Warning Banner -->
    <div v-if="project?.status === 'disabled'" class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
      <div class="px-4 py-3 sm:px-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-amber-800 dark:text-amber-200">
              This project is disabled
            </p>
            <p class="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Cron jobs will not run, manual execution is blocked, job triggers will not fire, and webhooks will be ignored. Click "Enable" to reactivate.
            </p>
          </div>
          <div class="ml-auto">
            <button
              @click="toggleProjectStatus"
              :disabled="isTogglingStatus"
              class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-800 hover:bg-amber-200 dark:hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
            >
              {{ isTogglingStatus ? 'Enabling...' : 'Enable Project' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Editor Content -->
    <main class="flex-1 overflow-hidden">
      <div class="flex" :style="{ height: `calc(100vh - 64px - ${project?.status === 'disabled' ? '60px' : '0px'} - ${isExecuting && currentBuildNumber ? '60px' : '0px'})` }">
        <!-- Nodes Sidebar -->
        <div 
          v-if="showNodesPanel"
          class="w-64 bg-white dark:bg-neutral-800 shadow-sm border-r border-neutral-200 dark:border-neutral-700 overflow-y-auto transition-all duration-300 ease-in-out"
        >
          <div class="p-4">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-medium text-neutral-900 dark:text-white">Nodes</h3>
              <button
                @click="toggleNodesPanel"
                class="p-1 rounded-md text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                v-tooltip="'Hide Nodes Panel'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <!-- Node Categories -->
            <div class="space-y-4">
              <div>
                <h4 class="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Source Control</h4>
                <div class="space-y-2">
                  <div
                    v-for="nodeType in sourceControlNodes"
                    :key="nodeType.type"
                    class="p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    :class="[isDragging ? 'cursor-grabbing' : 'cursor-grab']"
                    :draggable="true" 
                    @dragstart="onDragStart($event, nodeType)"
                  >
                    <div class="font-medium text-sm text-neutral-900 dark:text-white">{{ nodeType.name }}</div>
                    <div class="text-xs text-neutral-500 dark:text-neutral-400">{{ nodeType.description }}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 class="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Triggers</h4>
                <div class="space-y-2">
                  <div
                    v-for="nodeType in triggerNodes"
                    :key="nodeType.type"
                    class="p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    :class="[isDragging ? 'cursor-grabbing' : 'cursor-grab']"
                    :draggable="true" 
                    @dragstart="onDragStart($event, nodeType)"
                  >
                    <div class="font-medium text-sm text-neutral-900 dark:text-white">{{ nodeType.name }}</div>
                    <div class="text-xs text-neutral-500 dark:text-neutral-400">{{ nodeType.description }}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 class="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Parameters</h4>
                <div class="space-y-2">
                  <div
                    v-for="nodeType in parameterNodes"
                    :key="nodeType.type"
                    class="p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    :class="[isDragging ? 'cursor-grabbing' : 'cursor-grab']"
                    :draggable="true" 
                    @dragstart="onDragStart($event, nodeType)"
                  >
                    <div class="font-medium text-sm text-neutral-900 dark:text-white">{{ nodeType.name }}</div>
                    <div class="text-xs text-neutral-500 dark:text-neutral-400">{{ nodeType.description }}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 class="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Dependencies</h4>
                <div class="space-y-2">
                  <div
                    v-for="nodeType in dependencyNodes"
                    :key="nodeType.type"
                    class="p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    :class="[isDragging ? 'cursor-grabbing' : 'cursor-grab']"
                    :draggable="true" 
                    @dragstart="onDragStart($event, nodeType)"
                  >
                    <div class="font-medium text-sm text-neutral-900 dark:text-white">{{ nodeType.name }}</div>
                    <div class="text-xs text-neutral-500 dark:text-neutral-400">{{ nodeType.description }}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 class="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Execution</h4>
                <div class="space-y-2">
                  <div
                    v-for="nodeType in executionNodes"
                    :key="nodeType.type"
                    class="p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    :class="[isDragging ? 'cursor-grabbing' : 'cursor-grab']"
                    :draggable="true" 
                    @dragstart="onDragStart($event, nodeType)"
                  >
                    <div class="font-medium text-sm text-neutral-900 dark:text-white">{{ nodeType.name }}</div>
                    <div class="text-xs text-neutral-500 dark:text-neutral-400">{{ nodeType.description }}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 class="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Control</h4>
                <div class="space-y-2">
                  <div
                    v-for="nodeType in controlNodes"
                    :key="nodeType.type"
                    class="p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    :class="[isDragging ? 'cursor-grabbing' : 'cursor-grab']"
                    :draggable="true" 
                    @dragstart="onDragStart($event, nodeType)"
                  >
                    <div class="font-medium text-sm text-neutral-900 dark:text-white">{{ nodeType.name }}</div>
                    <div class="text-xs text-neutral-500 dark:text-neutral-400">{{ nodeType.description }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Editor Area -->
        <div class="flex-1 flex flex-col">
          <!-- Vue Flow Editor Section -->
          <div class="relative h-full">
            <!-- Floating toggle buttons when panels are hidden -->
            <div v-if="!showNodesPanel" class="absolute top-4 left-4 z-40">
              <button
                @click="toggleNodesPanel"
                class="p-2 bg-white dark:bg-neutral-800 shadow-lg rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                v-tooltip="'Show Nodes Panel'"
              >
                <svg class="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
            </div>
            
            <div v-if="!showPropertiesPanel" class="absolute top-4 right-4 z-40">
              <button
                @click="togglePropertiesPanel"
                class="p-2 bg-white dark:bg-neutral-800 shadow-lg rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                v-tooltip="'Show Properties Panel'"
              >
                <svg class="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
                </svg>
              </button>
            </div>
            
            <div class="w-full h-full" @keydown="handleKeyDown" tabindex="0" @drop="addNode">
              <VueFlow
                v-model:nodes="nodes"
                v-model:edges="edges"
                :node-types="nodeTypes"
                @node-click="onNodeClick"
                :fit-view-on-init="true"
                :min-zoom="0.1"
                :max-zoom="2"
                :snap-to-grid="true"
                :snap-grid="[5, 5]"
                :connection-mode="ConnectionMode.Loose"
                :delete-key-code="[]"
                @dragover="onDragOver"
                :class="{ dark }"
              >
                <Background 
                  variant="lines" 
                  :gap="[20, 20]"
                  :size="1"
                  :color="dark ? '#525252' : '#d1d5db'"
                  :backgroundColor="dark ? '#171717' : '#f9fafb'"
                />
                <Controls class="vue-flow-controls" />
                
                <!-- Loading overlay -->
                <div v-if="!isEditorReady" class="absolute inset-0 flex items-center justify-center bg-white dark:bg-neutral-800 bg-opacity-75 dark:bg-opacity-75 z-50">
                  <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p class="text-neutral-600 dark:text-neutral-300">Loading editor...</p>
                  </div>
                </div>
              </VueFlow>
            </div>
          </div>
          

        </div>

        <!-- Properties Panel -->
        <div 
          v-if="showPropertiesPanel"
          class="w-96 lg:w-128 bg-white dark:bg-neutral-800 shadow-sm border-l border-neutral-200 dark:border-neutral-700 overflow-y-auto transition-all duration-300 ease-in-out"
        >
          <div class="p-4">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-medium text-neutral-900 dark:text-white">Node Properties</h3>
              <button
                @click="togglePropertiesPanel"
                class="p-1 rounded-md text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                v-tooltip="'Hide Properties Panel'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div v-if="selectedNode" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Label</label>
                <input
                  v-model="selectedNode.data.label"
                  type="text"
                  class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  @input="updateNodeLabel"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Color</label>
                <div class="flex items-center space-x-2">
                  <input
                    v-model="selectedNode.data.color"
                    type="color"
                    class="w-12 h-10 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  >
                  <input
                    v-model="selectedNode.data.color"
                    type="text"
                    class="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
                    placeholder="#6b7280"
                  >
                </div>
                <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Choose a custom color for this node. The color picker shows a preview, or enter a hex color code.
                </p>
              </div>
              
              <div v-if="selectedNode.data?.nodeType === 'number'">
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Value</label>
                <input
                  v-model.number="selectedNode.data.value"
                  type="number"
                  class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
              </div>
              
              <!-- Choice Parameter Configuration -->
              <ChoiceParamProperties 
                v-if="selectedNode.data?.nodeType === 'choice-param'" 
                :nodeData="selectedNode"
              />

              <!-- Boolean Parameter Configuration -->
              <BooleanParamProperties 
                v-if="selectedNode.data?.nodeType === 'boolean-param'" 
                :nodeData="selectedNode"
              />

              <!-- Text Parameter Configuration -->
              <TextParamProperties 
                v-if="selectedNode.data?.nodeType === 'text-param'" 
                :nodeData="selectedNode"
              />

              <!-- String Parameter Configuration -->
              <StringParamProperties 
                v-if="selectedNode.data?.nodeType === 'string-param'" 
                :nodeData="selectedNode"
              />
              
              <!-- Input Sockets Management -->
              <div v-if="selectedNode.data && selectedNode.data.hasExecutionInput !== false">
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Input Sockets</label>
                
                <div v-if="selectedNode.data.inputSockets && selectedNode.data.inputSockets.length > 0" class="space-y-2 mb-3">
                  <div 
                    v-for="(socket, index) in selectedNode.data.inputSockets" 
                    :key="socket.id"
                    class="flex items-center space-x-2 p-2 border border-neutral-200 dark:border-neutral-600 rounded"
                  >
                    <input
                      v-model="socket.label"
                      type="text"
                      placeholder="Socket label"
                      class="flex-1 px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    >
                    <button
                      @click="removeInputSocket(socket.id)"
                      class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      v-tooltip="'Remove socket'"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <button
                  @click="addInputSocketToSelectedNode"
                  class="w-full px-3 py-2 text-sm border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-600 dark:text-neutral-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors"
                >
                  + Add Input Socket
                </button>
              </div>
              
              <!-- Agent Selection for execution nodes -->
              <div v-if="isExecutionNode(selectedNode.data?.nodeType)">
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Execution Agent <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="selectedNode.data.agentId"
                  class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  :class="{ 'border-red-500 dark:border-red-400': !selectedNode.data.agentId }"
                  required
                >
                  <option value="" disabled>-- Select an execution agent --</option>
                  <option value="any">Any available agent</option>
                  <option 
                    v-for="agent in availableAgents" 
                    :key="agent.id" 
                    :value="agent.id"
                    :disabled="agent.status !== 'online'"
                  >
                    {{ agent.name }} ({{ agent.hostname }}) 
                    <span v-if="agent.status !== 'online'">- {{ agent.status }}</span>
                  </option>
                </select>
                <p class="mt-1 text-xs text-red-500 dark:text-red-400" v-if="!selectedNode.data.agentId">
                  Agent selection is required for execution nodes
                </p>
                <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400" v-else>
                  This node will execute on the selected agent. Choose "Any available agent" if you don't have a preference.
                </p>
              </div>
              
              <!-- Cron Configuration for cron trigger nodes -->
              <CronProperties 
                v-if="selectedNode.data?.nodeType === 'cron'" 
                :nodeData="selectedNode"
              />

              <!-- Webhook Configuration for webhook trigger nodes -->
              <WebHookProperties 
                v-if="selectedNode.data?.nodeType === 'webhook'" 
                :nodeData="selectedNode"
              />

              <!-- Job Trigger Configuration for job-trigger nodes -->
              <JobTriggerProperties 
                v-if="selectedNode.data?.nodeType === 'job-trigger'" 
                :nodeData="selectedNode"
                :currentProjectId="project?.id"
              />

              <!-- Conditional Configuration for conditional nodes -->
              <ConditionalProperties
                v-if="selectedNode.data?.nodeType === 'conditional'"
                :nodeData="selectedNode"
              />

              <!-- Notification Configuration for notification nodes -->
              <NotificationProperties
                v-if="selectedNode.data?.nodeType === 'notification'"
                :nodeData="selectedNode"
              />

              <!-- Parallel Branches Configuration -->
              <ParallelBranchesProperties
                v-if="selectedNode.data?.nodeType === 'parallel_branches'"
                :nodeData="selectedNode"
              />

              <!-- Parallel Matrix Configuration -->
              <ParallelMatrixProperties
                v-if="selectedNode.data?.nodeType === 'parallel_matrix'"
                :nodeData="selectedNode"
              />

              <!-- Parallel Execution Configuration -->
              <ParallelExecutionProperties
                v-if="selectedNode.data?.nodeType === 'parallel_execution'"
                :nodeData="selectedNode"
                :placeholderData="executionNodes"
              />

              <!-- Dependency Node Configuration -->
              <NpmInstallProperties
                v-if="selectedNode.data?.nodeType === 'npm-install'"
                :nodeData="selectedNode"
              />

              <PipInstallProperties
                v-if="selectedNode.data?.nodeType === 'pip-install'"
                :nodeData="selectedNode"
              />

              <DependencyNodeProperties
                v-if="['go-mod', 'bundle-install', 'composer-install', 'cargo-build'].includes(selectedNode.data?.nodeType)"
                :nodeData="selectedNode"
              />

              <GitCheckoutProperties
                v-if="selectedNode.data?.nodeType === 'git-checkout'"
                :nodeData="selectedNode"
              />

              <!-- Script Editor for execution nodes -->
              <div v-if="selectedNode.data?.script !== undefined && !['parallel_execution', 'parallel_branches', 'parallel_matrix'].includes(selectedNode.data?.nodeType)">
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Script</label>
                <textarea
                  v-model="selectedNode.data.script"
                  rows="6"
                  class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono text-sm"
                  placeholder="Enter your script here. Use ${SOCKET_1_INPUT} or ${SocketLabel} to reference input values"
                ></textarea>
                
                <!-- Parameter substitution help -->
                <div v-if="selectedNode.data.inputSockets && selectedNode.data.inputSockets.length > 0" class="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs">
                  <div class="font-medium text-blue-800 dark:text-blue-200 mb-1">Available placeholders:</div>
                  <div class="space-y-1">
                    <div v-for="(socket, index) in selectedNode.data.inputSockets" :key="socket.id" class="text-blue-700 dark:text-blue-300">
                      <code>${{ socket.label }}</code>
                    </div>
                  </div>
                </div>
              </div>

              <CredentialBinding 
                v-if="selectedNode.data?.executionNode"
                v-model="selectedNode.data.credentials" 
              />
              <!-- Retry Policy -->
              <div v-if="selectedNode.data?.executionNode" class="mt-4 p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg">
                <div class="flex items-center justify-between mb-3">
                  <label class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Retry Policy</label>
                  <button
                    @click="selectedNode.data.retryEnabled = !selectedNode.data.retryEnabled"
                    :class="[
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                      selectedNode.data.retryEnabled 
                        ? 'bg-blue-600 focus:ring-blue-500' 
                        : 'bg-gray-400 focus:ring-gray-300'
                    ]"
                  >
                    <span
                      :class="[
                        'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                        selectedNode.data.retryEnabled ? 'translate-x-5' : 'translate-x-1'
                      ]"
                    />
                  </button>
                </div>

                <div v-if="selectedNode.data.retryEnabled" class="space-y-3">
                  <div>
                    <label class="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Max Retries</label>
                    <input
                      v-model.number="selectedNode.data.maxRetries"
                      type="number"
                      min="1"
                      max="10"
                      class="w-full px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    >
                  </div>
                  <div>
                    <label class="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Retry Delay (seconds)</label>
                    <input
                      v-model.number="selectedNode.data.retryDelay"
                      type="number"
                      min="1"
                      max="300"
                      class="w-full px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    >
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Position</label>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs text-neutral-500 dark:text-neutral-400">X</label>
                    <input
                      v-model.number="selectedNode.position.x"
                      type="number"
                      class="w-full px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    >
                  </div>
                  <div>
                    <label class="block text-xs text-neutral-500 dark:text-neutral-400">Y</label>
                    <input
                      v-model.number="selectedNode.position.y"
                      type="number"
                      class="w-full px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    >
                  </div>
                </div>
              </div>
            </div>
            
            <div v-else class="text-center py-8">
              <p class="text-neutral-500 dark:text-neutral-400">Select a node to view properties</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <EditorDeleteModal
      v-model="showDeleteModal"
      :items="itemsToDelete"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />

    <!-- Retention Settings Modal -->
    <EditorRetentionModal
      v-model="showRetentionModal"
      :settings="retentionSettings"
      :is-saving="isSavingRetention"
      @save="handleSaveRetentionSettings"
      @cancel="handleCancelRetentionSettings"
    />
  </div>
</template>

<script setup>
import { VueFlow, useVueFlow, Handle, Position, ConnectionMode } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { ref, computed, onMounted, onUnmounted, nextTick, defineComponent, h, markRaw, watch } from 'vue'
import WebHookProperties from '@/components/property-panels/WebhookProperties.vue'
import CronProperties from '@/components/property-panels/CronProperties.vue'
import JobTriggerProperties from '@/components/property-panels/JobTriggerProperties.vue'
import ChoiceParamProperties from '@/components/property-panels/ChoiceParamProperties.vue'
import BooleanParamProperties from '@/components/property-panels/BooleanParamProperties.vue'
import TextParamProperties from '@/components/property-panels/TextParamProperties.vue'
import StringParamProperties from '@/components/property-panels/StringParamProperties.vue'
import ConditionalProperties from '@/components/property-panels/ConditionalProperties.vue'
import NotificationProperties from '@/components/property-panels/NotificationProperties.vue'
import ParallelBranchesProperties from '@/components/property-panels/ParallelBranchesProperties.vue'
import ParallelMatrixProperties from '@/components/property-panels/ParallelMatrixProperties.vue'
import ParallelExecutionProperties from '@/components/property-panels/ParallelExecutionProperties.vue'
import NpmInstallProperties from '@/components/property-panels/NpmInstallProperties.vue'
import PipInstallProperties from '@/components/property-panels/PipInstallProperties.vue'
import DependencyNodeProperties from '@/components/property-panels/DependencyNodeProperties.vue'
import GitCheckoutProperties from '@/components/property-panels/GitCheckoutProperties.vue'
import EditorDeleteModal from '@/components/modals/EditorDeleteModal.vue'
import EditorRetentionModal from '@/components/modals/EditorRetentionModal.vue'
import CredentialBinding from '@/components/CredentialBinding.vue'
// Import Vue Flow styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'


definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const webSocketStore = useWebSocketStore()
const { isDark: dark } = useDarkMode()
const { success, error } = useNotifications()
const isEditorReady = ref(false)
const isSaving = ref(false)
const selectedNode = ref(null)

// Project status toggle state
const isTogglingStatus = ref(false)

// Delete confirmation modal state
const showDeleteModal = ref(false)
const itemsToDelete = ref([])

// Retention settings modal state
const showRetentionModal = ref(false)
const isSavingRetention = ref(false)
const retentionSettings = ref({
  maxBuildsToKeep: 50,
  maxLogDays: 30
})

// Agent state
const agents = ref([])



// Execution state tracking
const isExecuting = ref(false)
const currentBuildNumber = ref(null)

// Panel visibility state
const showNodesPanel = ref(false)
const showPropertiesPanel = ref(false)

// Vue Flow state
const nodes = ref([])
const edges = ref([])

// Use Vue Flow composables
const { onConnect, getSelectedNodes, getSelectedEdges, screenToFlowCoordinate, onNodesInitialized, updateNode } = useVueFlow()

// Handle keyboard delete events
const handleKeyDown = async (event) => {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    
    const selectedNodes = getSelectedNodes.value || []
    const selectedEdges = getSelectedEdges.value || []
    
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      return
    }
    
    // Prepare items for deletion
    const items = [
      ...selectedNodes.map(node => ({
        type: 'node',
        id: node.id,
        label: node.data?.label || node.id
      })),
      ...selectedEdges.map(edge => ({
        type: 'edge',
        id: edge.id,
        label: `Connection ${edge.source} → ${edge.target}`
      }))
    ]
    
    itemsToDelete.value = items
    showDeleteModal.value = true
    
    // Wait for user confirmation
    const confirmed = await new Promise((resolve) => {
      window.deleteResolve = resolve
    })
    
    if (confirmed) {
      // Remove selected nodes and their connected edges
      selectedNodes.forEach(node => {
        // Remove the node
        const nodeIndex = nodes.value.findIndex(n => n.id === node.id)
        if (nodeIndex !== -1) {
          nodes.value.splice(nodeIndex, 1)
        }
        
        // Remove all edges connected to this node
        edges.value = edges.value.filter(edge => 
          edge.source !== node.id && edge.target !== node.id
        )
      })
      
      // Remove selected edges
      selectedEdges.forEach(edge => {
        const index = edges.value.findIndex(e => e.id === edge.id)
        if (index !== -1) {
          edges.value.splice(index, 1)
        }
      })
    }
  }
}

// Use the hierarchical project approach instead of ID-based
const project = computed(() => {
  return hierarchicalProject.value
})

// Parse the path from route params
const pathSegments = computed(() => {
  if (!route.params.path) return []
  
  let segments = Array.isArray(route.params.path) ? route.params.path : [route.params.path]
  
  // Remove 'editor' from the end if it's there (it shouldn't be, but just in case)
  if (segments[segments.length - 1] === 'editor') {
    segments = segments.slice(0, -1)
  }
  
  return [...segments, 'editor'] // Add editor back for breadcrumb
})

// The project name is the last segment before 'editor'
const projectName = computed(() => {
  const segments = pathSegments.value
  if (segments.length > 1) {
    return segments[segments.length - 2] // Second to last, before 'editor'
  }
  return null
})

// The project path is all segments except 'editor'
const projectPath = computed(() => {
  const segments = pathSegments.value.slice(0, -1) // Remove 'editor'
  if (segments.length > 1) {
    return segments.slice(0, -1)
  }
  return []
})

// Find the project using the path-based approach
const hierarchicalProject = computed(() => {
  if (!projectName.value) return null
  return projectsStore.getItemByFullPath([...projectPath.value, projectName.value])
})

const triggerNodes = [
  { type: 'cron', name: 'Cron Trigger', description: 'Schedule job execution with cron expressions' },
  { type: 'webhook', name: 'Webhook Trigger', description: 'Trigger via HTTP webhook' },
  { type: 'job-trigger', name: 'Job Trigger', description: 'Trigger from another project completion' }
]

const parameterNodes = [
  { type: 'string-param', name: 'String Parameter', description: 'Single-line text parameter' },
  { type: 'text-param', name: 'Text Parameter', description: 'Multi-line text parameter' },
  { type: 'choice-param', name: 'Choice Parameter', description: 'Dropdown selection parameter' },
  { type: 'boolean-param', name: 'Boolean Parameter', description: 'True/false parameter' }
]

const executionNodes = [
  { type: 'bash', name: 'Bash Script', description: 'Execute bash commands', placeholder: '#!/bin/bash\necho "Hello from bash"'},
  { type: 'sh', name: 'Shell Script', description: 'Execute POSIX shell commands', placeholder: '#!/bin/sh\necho "Hello from shell"'},
  { type: 'powershell', name: 'PowerShell Script', description: 'Execute PowerShell commands', placeholder: 'Write-Host "Hello from PowerShell"'},
  { type: 'cmd', name: 'Command Prompt', description: 'Execute Windows CMD commands', placeholder: 'echo Hello from Command Prompt'},
  { type: 'python', name: 'Python Script', description: 'Execute Python code', placeholder: 'print("Hello from Python")'},
  { type: 'python3', name: 'Python3 Script', description: 'Execute Python3 code', placeholder: 'print("Hello from Python3")'},
  { type: 'node', name: 'Node.js Script', description: 'Execute Node.js/JavaScript code', placeholder: 'logger.info("Hello from Node.js")'},
  { type: 'go', name: 'Go Script', description: 'Execute Go code', placeholder: 'package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello from Go")\n}'},
  { type: 'ruby', name: 'Ruby Script', description: 'Execute Ruby code', placeholder: 'puts "Hello from Ruby"'},
  { type: 'php', name: 'PHP Script', description: 'Execute PHP code', placeholder: '<?php echo "Hello from PHP"; ?>'},
  { type: 'java', name: 'Java Program', description: 'Execute Java code', placeholder: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java");\n    }\n}'},
  { type: 'rust', name: 'Rust Script', description: 'Execute Rust code', placeholder: 'fn main() {\n    println!("Hello from Rust");\n}'},
  { type: 'perl', name: 'Perl Script', description: 'Execute Perl code', placeholder: 'print "Hello from Perl\\n";'},
  { type: 'parallel_execution', name: 'Parallel Execution', description: 'Execution node for parallel branches (no output sockets)'}
]

const sourceControlNodes = [
  { type: 'git-checkout', name: 'Git Checkout', description: 'Clone or checkout a Git repository' }
]

const dependencyNodes = [
  { type: 'npm-install', name: 'NPM Install', description: 'Install Node.js dependencies from package.json' },
  { type: 'pip-install', name: 'Pip Install', description: 'Install Python dependencies from requirements.txt' },
  { type: 'go-mod', name: 'Go Modules', description: 'Download Go module dependencies' },
  { type: 'bundle-install', name: 'Bundle Install', description: 'Install Ruby gems from Gemfile' },
  { type: 'composer-install', name: 'Composer Install', description: 'Install PHP dependencies from composer.json' },
  { type: 'cargo-build', name: 'Cargo Build', description: 'Build Rust project and fetch dependencies' }
]

const controlNodes = [
  { type: 'parallel_branches', name: 'Parallel Branches', description: 'Execute multiple different branches in parallel' },
  { type: 'parallel_matrix', name: 'Parallel Matrix', description: 'Execute same job multiple times with different parameters' },
  { type: 'conditional', name: 'Conditional', description: 'Conditional execution based on parameters' },
  { type: 'notification', name: 'Notification', description: 'Send notifications (email, slack, etc.)' }
]

// Agent computed properties and helpers
const availableAgents = computed(() => {
  return agents.value.filter(agent =>
    agent.capabilities.some(cap => ['bash', 'sh', 'powershell', 'cmd', 'python', 'node', 'python3', 'go', 'ruby', 'php', 'java', 'rust', 'perl'].includes(cap))
  )
})

const isExecutionNode = (nodeType) => {
  if (!nodeType) return false
  return ['bash', 'sh', 'powershell', 'cmd', 'python', 'node', 'python3', 'go', 'ruby', 'php', 'java', 'rust', 'perl', 'parallel_execution', 'git-checkout', 'npm-install', 'pip-install', 'go-mod', 'bundle-install', 'composer-install', 'cargo-build'].includes(nodeType)
}



// Agent data loading
const loadAgents = async () => {
  try {
    const data = await $fetch('/api/admin/agents')
    agents.value = data
  } catch (error) {
    logger.error('Error loading agents:', error)
    agents.value = []
  }
}

// Node type definitions for Vue Flow
// Import shared CustomNode component
const CustomNodeComponent = resolveComponent('CustomNode')

const nodeTypes = {
  custom: markRaw(CustomNodeComponent)
}

// Panel toggle functions
const toggleNodesPanel = () => {
  showNodesPanel.value = !showNodesPanel.value
}

const togglePropertiesPanel = () => {
  showPropertiesPanel.value = !showPropertiesPanel.value
}

// Modal confirmation methods
const handleConfirmDelete = () => {
  showDeleteModal.value = false
  itemsToDelete.value = []
  if (window.deleteResolve) {
    window.deleteResolve(true)
    window.deleteResolve = null
  }
  if (showPropertiesPanel.value && selectedNode.value) {
    showPropertiesPanel.value = false
    selectedNode.value = null // Deselect node if properties panel is open
  }
}

const handleCancelDelete = () => {
  showDeleteModal.value = false
  itemsToDelete.value = []
  if (window.deleteResolve) {
    window.deleteResolve(false)
    window.deleteResolve = null
  }
}

// Retention settings modal methods
const loadRetentionSettings = async () => {
  if (!project.value?.id) return

  try {
    const response = await $fetch(`/api/projects/${project.value.id}/retention`)
    if (response.success) {
      retentionSettings.value = response.retention
    }
  } catch (error) {
    logger.error('Failed to load retention settings:', error)
  }
}

const handleSaveRetentionSettings = async () => {
  if (!project.value?.id) return

  isSavingRetention.value = true
  try {
    const response = await $fetch(`/api/projects/${project.value.id}/retention`, {
      method: 'POST',
      body: retentionSettings.value
    })

    if (response.success) {
      success('Retention settings updated successfully')
      showRetentionModal.value = false
      logger.info('Retention settings updated successfully')
    }
  } catch (error) {
    logger.error('Failed to save retention settings:', error)
    error('Failed to save retention settings. Please try again.')
  } finally {
    isSavingRetention.value = false
  }
}

const handleCancelRetentionSettings = () => {
  showRetentionModal.value = false
  // Reset to original values
  loadRetentionSettings()
}

// Watch for retention modal opening to load current settings
watch(showRetentionModal, (newValue) => {
  if (newValue) {
    loadRetentionSettings()
  }
})

const addInputSocketToSelectedNode = () => {
  if (!selectedNode.value) return
  
  const socketId = `socket_${Date.now()}`
  const socketLabel = `Input_${selectedNode.value.data.inputSockets.length + 1}`
  
  selectedNode.value.data.inputSockets.push({
    id: socketId,
    label: socketLabel,
    connected: false
  })
}

const removeInputSocket = (socketId) => {
  if (!selectedNode.value) return
  
  // Remove socket from node data
  const socketIndex = selectedNode.value.data.inputSockets.findIndex(s => s.id === socketId)
  if (socketIndex !== -1) {
    selectedNode.value.data.inputSockets.splice(socketIndex, 1)
  }
  
  // Remove any edges connected to this socket
  edges.value = edges.value.filter(edge => 
    !(edge.target === selectedNode.value.id && edge.targetHandle === socketId)
  )
}

const getDefaultNodeData = (type) => {
  const baseData = {
    // Socket configuration - every node has this
    inputSockets: [], // Array of {id, label, connected: false}
    hasExecutionOutput: true, // Most nodes have execution output
    hasExecutionInput: true, // Most nodes have execution input
    hasDataOutput: false // Default to false, parameter nodes will override
  }
  
  switch (type) {
    // Trigger nodes
    case 'cron':
      return { 
        ...baseData,
        hasExecutionInput: false, // Triggers don't have execution input
        cronExpression: '0 0 * * *', // Daily at midnight
        timezone: 'UTC'
      }
    case 'webhook':
      return { 
        ...baseData,
        hasExecutionInput: false,
        hasDataOutput: true, // Webhook provides data output
        outputSockets: [
          { id: 'webhook_data', label: 'Webhook Data', connected: false }
        ],
        endpoint: '/webhook',
        method: 'POST',
        secretToken: '',
        customEndpoint: '',
        description: '',
        active: true
      }
    case 'job-trigger':
      return { 
        ...baseData,
        hasExecutionInput: false,
        sourceProjectId: '',
        triggerOn: 'success', // success, failure, always
        waitForCompletion: true
      }
      
    // Parameter nodes
    case 'string-param':
      return { 
        ...baseData,
        hasExecutionInput: false,
        hasExecutionOutput: false, // Parameters provide data, not execution flow
        hasDataOutput: true, // Parameters output their data values
        defaultValue: '',
        description: 'String parameter'
      }
    case 'text-param':
      return { 
        ...baseData,
        hasExecutionInput: false,
        hasExecutionOutput: false,
        hasDataOutput: true,
        defaultValue: '',
        description: 'Multi-line text parameter'
      }
    case 'choice-param':
      return { 
        ...baseData,
        hasExecutionInput: false,
        hasExecutionOutput: false,
        hasDataOutput: true,
        choices: ['option1', 'option2', 'option3'],
        defaultValue: 'option1'
      }
    case 'boolean-param':
      return { 
        ...baseData,
        hasExecutionInput: false,
        hasExecutionOutput: false,
        hasDataOutput: true,
        defaultValue: false,
        description: 'Boolean parameter'
      }
      
    // Execution nodes
    case 'bash':
      return {
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false },
          { id: 'output', label: 'Output', connected: false }
        ],
        script: '#!/bin/bash\necho "Hello from bash"',
        workingDirectory: '.',
        timeout: 300,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        executionNode: true
      }
    case 'sh':
      return {
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false },
          { id: 'output', label: 'Output', connected: false }
        ],
        script: '#!/bin/sh\necho "Hello from shell"',
        workingDirectory: '.',
        timeout: 300,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        executionNode: true
      }
    case 'powershell':
      return { 
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false },
          { id: 'output', label: 'Output', connected: false }
        ],
        script: 'Write-Host "Hello from PowerShell"',
        workingDirectory: '.',
        timeout: 300,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        executionNode: true 
      }
    case 'cmd':
      return {
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false },
          { id: 'output', label: 'Output', connected: false }
        ],
        script: 'echo Hello from Command Prompt',
        workingDirectory: '.',
        timeout: 300,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        executionNode: true
      }
    case 'python':
    case 'python3':
      return { 
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false },
          { id: 'output', label: 'Output', connected: false }
        ],
        script: 'print("Hello from Python")',
        workingDirectory: '.',
        timeout: 300,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        executionNode: true 
      }
    case 'node':
      return { 
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false },
          { id: 'output', label: 'Output', connected: false }
        ],
        script: 'logger.info("Hello from Node.js");',
        workingDirectory: '.',
        timeout: 300,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        executionNode: true 
      }
    case 'ruby':
      return { 
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false },
          { id: 'output', label: 'Output', connected: false }
        ],
        script: 'puts "Hello from Ruby"',
        workingDirectory: '.',
        timeout: 300,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        executionNode: true 
      }
    case 'go':
      return { 
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false },
          { id: 'output', label: 'Output', connected: false }
        ],
        script: 'fmt.Println("Hello from Go")',
        workingDirectory: '.',
        timeout: 300,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        executionNode: true 
      }
    case 'php':
      return { 
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false },
          { id: 'output', label: 'Output', connected: false }
        ],
        script: '<?php echo "Hello from PHP"; ?>',
        workingDirectory: '.',
        timeout: 300,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        executionNode: true 
      }
    case 'java':
      return { 
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false },
          { id: 'output', label: 'Output', connected: false }
        ],
        script: 'public class HelloWorld { public static void main(String[] args) { System.out.println("Hello from Java"); } }',
        workingDirectory: '.',
        timeout: 300,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        executionNode: true 
      }
    case 'rust':
      return { 
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false },
          { id: 'output', label: 'Output', connected: false }
        ],
        script: 'fn main() { println!("Hello from Rust"); }',
        workingDirectory: '.',
        timeout: 300,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        executionNode: true 
      }
    case 'perl':
      return { 
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false },
          { id: 'output', label: 'Output', connected: false }
        ],
        script: 'print "Hello from Perl";',
        workingDirectory: '.',
        timeout: 300,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        executionNode: true 
      }
      
    // Source control nodes
    case 'git-checkout':
      return {
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false }
        ],
        repositoryUrl: '',
        branch: 'main',
        checkoutDirectory: '.',
        shallowClone: false,
        cleanCheckout: true,
        timeout: 600,
        executionNode: true
      }
      
    // Dependency nodes
    case 'npm-install':
      return {
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false }
        ],
        packageManager: 'npm',
        workingDirectory: '.',
        installArgs: '',
        useExistingFile: false,
        script: '{\n  "name": "my-project",\n  "dependencies": {\n    "express": "^4.18.0"\n  }\n}',
        timeout: 600,
        executionNode: true
      }
    case 'pip-install':
      return {
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false }
        ],
        pythonVersion: 'python3',
        workingDirectory: '.',
        installArgs: '',
        useExistingFile: false,
        script: 'requests==2.31.0\nflask==3.0.0',
        timeout: 600,
        executionNode: true
      }
    case 'go-mod':
      return {
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false }
        ],
        command: 'download',
        workingDirectory: '.',
        useExistingFile: false,
        script: 'module example.com/myapp\n\ngo 1.21\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.1\n)',
        timeout: 600,
        executionNode: true
      }
    case 'bundle-install':
      return {
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false }
        ],
        workingDirectory: '.',
        installArgs: '',
        useExistingFile: false,
        script: 'source "https://rubygems.org"\n\ngem "rails", "~> 7.0"\ngem "pg", "~> 1.5"',
        timeout: 600,
        executionNode: true
      }
    case 'composer-install':
      return {
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false }
        ],
        workingDirectory: '.',
        installArgs: '',
        useExistingFile: false,
        script: '{\n  "require": {\n    "laravel/framework": "^10.0"\n  }\n}',
        timeout: 600,
        executionNode: true
      }
    case 'cargo-build':
      return {
        ...baseData,
        hasExecutionOutput: false,
        hasDataOutput: true,
        outputSockets: [
          { id: 'success', label: 'Success', connected: false },
          { id: 'failure', label: 'Failure', connected: false }
        ],
        buildType: 'release',
        workingDirectory: '.',
        useExistingFile: false,
        script: '[package]\nname = "my-app"\nversion = "0.1.0"\n\n[dependencies]\nactix-web = "4.0"',
        timeout: 600,
        executionNode: true
      }
      
    // Control nodes
    case 'parallel_branches':
      return {
        ...baseData,
        hasExecutionInput: true,
        hasExecutionOutput: false,
        hasDataOutput: false,
        outputSockets: [
          { id: 'success', label: 'All Success', connected: false },
          { id: 'failure', label: 'Any Failure', connected: false },
          { id: 'output', label: 'Output', connected: false },
          { id: 'branch_1', label: 'Branch 1', connected: false },
          { id: 'branch_2', label: 'Branch 2', connected: false }
        ],
        branches: [
          { id: 'branch_1', name: 'Branch 1' },
          { id: 'branch_2', name: 'Branch 2' }
        ],
        maxConcurrency: null,
        failFast: false,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        description: 'Execute multiple branches in parallel',
        executionNode: true 
      }
    case 'parallel_execution':
      return {
        ...baseData,
        hasExecutionInput: true,
        hasExecutionOutput: false,
        hasDataOutput: false,
        inputSockets: [],
        outputSockets: [],
        executionType: 'bash',
        script: '',
        workingDirectory: '.',
        timeout: 300,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        description: 'Execution node for parallel branches',
        executionNode: true 
      }
    case 'parallel_matrix':
      return {
        ...baseData,
        hasExecutionInput: true,
        hasExecutionOutput: false,
        hasDataOutput: false,
        inputSockets: [],
        outputSockets: [
          { id: 'success', label: 'All Success', connected: false },
          { id: 'failure', label: 'Any Failure', connected: false },
          { id: 'output', label: 'Aggregated Output', connected: false },
          { id: 'iteration', label: 'For Each Item', connected: false }
        ],
        script: 'return ["item1", "item2", "item3"]',
        itemVariableName: 'ITEM',
        maxConcurrency: null,
        failFast: false,
        continueOnError: false,
        retryEnabled: false,
        maxRetries: 3,
        retryDelay: 5,
        description: 'Execute job for each item generated by JavaScript',
        executionNode: true 
      }
    case 'conditional':
      return { 
        ...baseData,
        hasExecutionOutput: false, // Conditional has dual outputs instead
        outputSockets: [
          { id: 'true', label: 'True', connected: false },
          { id: 'false', label: 'False', connected: false }
        ],
        condition: '$input1 == "value"',
        description: 'Conditional execution'
      }
    case 'notification':
      return {
        ...baseData,
        hasExecutionInput: true, // Can receive input from other nodes
        hasExecutionOutput: false, // Notifications are terminal nodes
        hasDataOutput: false,
        inputSockets: [], // Can add input sockets for dynamic data

        // Notification type and common settings
        notificationType: 'email', // email, slack, webhook

        // Email properties
        emailFrom: '',
        emailTo: '',
        emailSubject: '',
        emailBody: 'Job completed successfully',
        emailHtml: false,

        // Slack properties
        slackWebhookUrl: '',
        slackChannel: '',
        slackUsername: '',
        slackMessage: 'Job completed successfully',

        // Webhook properties
        webhookUrl: '',
        webhookMethod: 'POST',
        webhookHeaders: '{}',
        webhookBody: '{"status": "completed", "message": "Job finished"}',

        description: 'Send notification'
      }
      
    default:
      return baseData
  }
}

const isDragging = ref(false)
const draggedRef = ref(null)

watch(isDragging, (dragging) => {
  document.body.style.userSelect = dragging ? 'none' : ''
})

const onDragStart = (event, type) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
  draggedRef.value = type
  isDragging.value = true
  document.addEventListener('drop', onDragEnd)
}

const onDragEnd = () => {
  isDragging.value = false
  draggedRef.value = null
  document.removeEventListener('drop', onDragEnd)
}

const onDragOver = (event) => {
  event.preventDefault()
  if (draggedRef.value && event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const addNode = async (event) => {

  const nodeType = draggedRef.value
  if (!nodeType) return
  const position = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY,
  })

  const newNode = {
    id: `${nodeType.type}-${Date.now()}`,
    type: 'custom',
    position,
    data: {
      label: nodeType.name,
      nodeType: nodeType.type,
      description: nodeType.description,
      color: '#6b7280',
      textColor: 'white',
      ...getDefaultNodeData(nodeType.type)
    }
  }
  const { off } = onNodesInitialized(() => {
    updateNode(newNode.id, (node) => ({
      position: { x: node.position.x - node.dimensions.width / 2, y: node.position.y - node.dimensions.height / 2 },
    }))
    off()
  })
  nodes.value.push(newNode)
  draggedRef.value = null
  isDragging.value = false
}


const saveProject = async () => {
  if (!project.value) return
  
  isSaving.value = true
  
  try {
    // Validate webhook and execution nodes before saving
    const validationErrors = validateExecutionNodes()
    
    // Show warnings for webhook issues but still allow saving
    const webhookErrors = validationErrors.filter(error => error.includes('🎣') || error.includes('🔐'))
    if (webhookErrors.length > 0) {
      logger.warn('Webhook validation warnings:', webhookErrors)
      // Could add toast notifications here for webhook warnings
      for (const warning of webhookErrors) {
        logger.warn(`${warning}`)
      }
    }
    
    // Clean execution state classes before saving
    const cleanedNodes = nodes.value.map(node => {
      const cleanNode = { ...node }
      if (cleanNode.class) {
        const originalClass = cleanNode.class
        cleanNode.class = cleanNode.class.replace(/\s*(node-idle|node-executing|node-completed|node-failed)\s*/g, ' ').trim()
        if (originalClass !== cleanNode.class) {
          logger.debug(`Cleaned node ${node.id} class: "${originalClass}" -> "${cleanNode.class}"`)
        }
      }
      return cleanNode
    })

    const cleanedEdges = edges.value.map(edge => {
      const cleanEdge = { ...edge }
      const hadClass = !!cleanEdge.class
      const hadAnimated = cleanEdge.animated !== undefined
      delete cleanEdge.class
      delete cleanEdge.animated
      if (hadClass || hadAnimated) {
        logger.debug(`Cleaned edge ${edge.id}: removed class=${hadClass}, animated=${hadAnimated}`)
      }
      return cleanEdge
    })

    logger.info(`Saving project with ${cleanedNodes.length} nodes and ${cleanedEdges.length} edges (cleaned execution states)`)

    const diagramData = {
      nodes: cleanedNodes,
      edges: cleanedEdges
    }
    
    // Save project data
    await projectsStore.updateProject(project.value.id, {
      diagramData,
      updatedAt: new Date()
    })
    
    // Update cron jobs for any cron trigger nodes
    try {
      await $fetch(`/api/projects/${project.value.id}/cron`, {
        method: 'POST',
        body: {
          nodes: nodes.value,
          edges: edges.value
        }
      })
      logger.info('Cron jobs updated')
    } catch (cronError) {
      logger.warn('Failed to update cron jobs:', cronError)
    }
    
    // Log job trigger nodes for debugging
    const jobTriggerNodes = nodes.value.filter(node => node.data?.nodeType === 'job-trigger')
    if (jobTriggerNodes.length > 0) {
      logger.info(`Found ${jobTriggerNodes.length} job trigger nodes:`, 
        jobTriggerNodes.map(n => ({ 
          id: n.id, 
          label: n.data.label, 
          sourceProject: n.data.sourceProjectId, 
          triggerOn: n.data.triggerOn 
        }))
      )
    }
    
  } catch (error) {
    logger.error('Error saving project:', error)
  } finally {
    isSaving.value = false
  }
}


const validateExecutionNodes = () => {
  const errors = []
  
  // Check all nodes for execution nodes without agent selection
  for (const node of nodes.value) {
    if (isExecutionNode(node.data?.nodeType)) {
      if (!node.data.agentId || node.data.agentId === '') {
        errors.push(`🚨 "${node.data.label || 'Unnamed Node'}" has no executor selected. Agent selection is required to run.`)
      }
    }
    
    // Check webhook nodes for required secret token
    if (node.data?.nodeType === 'webhook') {
      if (!node.data.customEndpoint || node.data.customEndpoint.trim() === '') {
        errors.push(`🎣 "${node.data.label || 'Unnamed Webhook'}" has no custom endpoint configured.`)
      }
      if (!node.data.secretToken || node.data.secretToken.trim() === '') {
        errors.push(`"${node.data.label || 'Unnamed Webhook'}" has no secret token. Secret tokens are required for webhook security.`)
      }
    }
  }
  
  return errors
}

// Remove execution result functions - these are now handled in build page

const executeGraph = async () => {
  // Check if project is disabled
  if (project.value?.status === 'disabled') {
    error('Project is disabled. Manual execution is blocked.')
    return
  }
  
  // Validate that all execution nodes have agent selection
  const validationErrors = validateExecutionNodes()
  if (validationErrors.length > 0) {
    error('Execution blocked due to validation errors:\n\n' + validationErrors.join('\n'))
    return
  }

  try {
    // Convert the graph to execution data for the agent
    const executionData = {
      projectId: project.value.id,
      nodes: nodes.value,
      edges: edges.value,
      startTime: new Date().toISOString()
    }

    // Dispatch job and redirect to build page
    const response = await $fetch('/api/projects/execute', {
      method: 'POST',
      body: executionData
    })

    if (response.success && response.buildNumber) {
      // Redirect to build execution page
      const projectPath = pathSegments.value.slice(0, -1).join('/') // Remove 'editor' from path
      await navigateTo(`/${projectPath}/build/${response.buildNumber}`)
    } else {
      error(`Failed to start execution: ${response.message || 'Unknown error'}`)
    }
    
  } catch (error) {
    logger.error('Execution dispatch error:', error)
    error(`Failed to start execution: ${error.message}`)
  }
}

// Remove cancelExecution - this is now handled in build page

const onNodeClick = (event) => {
  selectedNode.value = event.node
  if (showPropertiesPanel.value === false) {
    showPropertiesPanel.value = true
  }
}

onConnect(connection => {
  edges.value.push({
    id: `edge-${Date.now()}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle
  })
})

// WebSocket setup for execution state tracking
const setupWebSocket = () => {
  if (!webSocketStore.socket) {
    webSocketStore.connect()
  }
  
  // Listen for execution state changes
  webSocketStore.socket?.on('executionStarted', (data) => {
    if (data.projectId === project.value?.id) {
      isExecuting.value = true
      currentBuildNumber.value = data.buildNumber
      logger.info(`Execution started for project ${data.projectId}, build #${data.buildNumber}`)
    }
  })
  
  webSocketStore.socket?.on('executionCompleted', (data) => {
    if (data.projectId === project.value?.id) {
      isExecuting.value = false
      currentBuildNumber.value = null
      logger.info(`Execution completed for project ${data.projectId}`)
    }
  })
  
  webSocketStore.socket?.on('executionFailed', (data) => {
    if (data.projectId === project.value?.id) {
      isExecuting.value = false
      currentBuildNumber.value = null
      logger.info(`Execution failed for project ${data.projectId}`)
    }
  })
}

const cleanupWebSocket = () => {
  if (webSocketStore.socket) {
    webSocketStore.socket.off('executionStarted')
    webSocketStore.socket.off('executionCompleted')
    webSocketStore.socket.off('executionFailed')
  }
}

// Initialize editor content
const initializeEditor = async () => {
  try {
    // Load existing diagram data if available
    if (project.value?.diagramData) {
      // Clean nodes of any execution state classes
      nodes.value = (project.value.diagramData.nodes || []).map(node => {
        const cleanNode = { ...node }
        if (cleanNode.class) {
          cleanNode.class = cleanNode.class.replace(/\s*(node-idle|node-executing|node-completed|node-failed)\s*/g, ' ').trim()
        }
        return cleanNode
      })

      // Clean edges of any execution state properties
      edges.value = (project.value.diagramData.edges || []).map(edge => {
        const cleanEdge = { ...edge }
        delete cleanEdge.class
        delete cleanEdge.animated
        return cleanEdge
      })
    } else {
      nodes.value = []
      edges.value = []
    }

    isEditorReady.value = true
  } catch (error) {
    logger.error('Error initializing editor:', error)
  }
}
// Check current build status when page loads
const checkCurrentBuildStatus = async () => {
  if (!project.value?.id) return
  
  try {
    const response = await $fetch(`/api/projects/${project.value.id}/status`)
    if (response.isRunning && response.currentJob) {
      isExecuting.value = true
      currentBuildNumber.value = response.currentJob.buildNumber
      logger.info(`Found running build #${response.currentJob.buildNumber} for project ${project.value.id}`)
    } else {
      isExecuting.value = false
      currentBuildNumber.value = null
    }
  } catch (error) {
    logger.warn('Failed to check current build status:', error)
  }
}

// Initialize editor on mount
onMounted(async () => {
  // Ensure authentication is initialized before loading data
  if (!authStore.isAuthenticated) {
    await authStore.initializeAuth()
  }
  
  // Only load data if authenticated
  if (authStore.isAuthenticated) {
    // Load projects first to ensure we have the project data
    await projectsStore.loadData()
    // Load agents for execution node configuration
    await loadAgents()
  }
  
  // Check if project exists
  if (!project.value) {
    logger.error('Project not found, redirecting to home')
    await navigateTo('/')
    return
  }

  // Set current project
  projectsStore.setCurrentProject(project.value)
  
  // Check current build status
  await checkCurrentBuildStatus()
  
  // Setup WebSocket for execution state tracking
  setupWebSocket()
  
  // Initialize the editor
  await nextTick()
  await initializeEditor()
})

// Cleanup on unmount
onUnmounted(() => {
  cleanupWebSocket()
})

// Project status toggle function
const toggleProjectStatus = async () => {
  if (!project.value) return
  
  isTogglingStatus.value = true
  
  try {
    const result = await projectsStore.toggleProjectStatus(project.value.id)
    
    if (result.success) {
      logger.info(`Project ${result.status}: ${project.value.name}`)
      success(`Project ${result.status === 'enabled' ? 'enabled' : 'disabled'} successfully`)
      saveProject()
    } else {
      logger.error('Failed to toggle project status:', result.error)
      error(`Failed to ${project.value.status === 'disabled' ? 'enable' : 'disable'} project: ${result.error}`)
    }
  } catch (error) {
    logger.error('Error toggling project status:', error)
    error(`Error changing project status: ${error.message}`)
  } finally {
    isTogglingStatus.value = false
  }
}
</script>

<style scoped>
:deep(html), :deep(body) {
  overflow: hidden;
}

:deep(.vue-flow__background) {
  opacity: 1 !important;
  z-index: 0 !important;
}

:deep(.vue-flow-controls) {
  background: rgba(255, 255, 255, 0.9);
}

:deep(.dark .vue-flow-controls) {
  background: rgba(38, 38, 38, 0.9);
}

:deep(.vue-flow__controls-button) {
  background: white;
  border: 1px solid #d4d4d4;
  color: #404040;
}

:deep(.dark .vue-flow__controls-button) {
  background: #404040;
  border: 1px solid #525252;
  color: #f5f5f5;
}

:deep(.vue-flow__controls-button:hover) {
  background: #f5f5f5;
}

:deep(.dark .vue-flow__controls-button:hover) {
  background: #525252;
}

:deep(.vue-flow__edge-path) {
  stroke: #737373;
}

:deep(.dark .vue-flow__edge-path) {
  stroke: #a3a3a3;
}

:deep(.vue-flow__edge-text) {
  fill: #404040;
}

:deep(.dark .vue-flow__edge-text) {
  fill: #d4d4d4;
}

:deep(.vue-flow__node) {
  color: #171717;
}

:deep(.dark .vue-flow__node) {
  color: #f5f5f5;
}

:deep(.vue-flow__selection) {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid #3b82f6;
}

:deep(.dark .vue-flow__selection) {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid #60a5fa;
}

:deep(.vue-flow__connection-line) {
  stroke: #737373;
}

:deep(.dark .vue-flow__connection-line) {
  stroke: #a3a3a3;
}

:deep(.vue-flow__attribution) {
  background: rgba(255, 255, 255, 0.8);
  color: #404040;
}

:deep(.dark .vue-flow__attribution) {
  background: rgba(38, 38, 38, 0.8);
  color: #d4d4d4;
}

:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  border-radius: 50%;
}

:deep(.dark .vue-flow__handle) {
  border: 2px solid #404040;
}

/* Node execution state styles */
:deep(.vue-flow__node.node-executing) {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
  animation: pulse-executing 2s ease-in-out infinite;
}

:deep(.vue-flow__node.node-completed) {
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.5);
  opacity: 0.85;
}

:deep(.vue-flow__node.node-failed) {
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.5);
}

:deep(.vue-flow__node.node-idle) {
  /* Default state - no special styling */
}

/* Edge execution state styles */
:deep(.vue-flow__edge.edge-completed .vue-flow__edge-path) {
  stroke: #22c55e !important;
  stroke-width: 2px;
}

:deep(.dark .vue-flow__edge.edge-completed .vue-flow__edge-path) {
  stroke: #4ade80 !important;
  stroke-width: 2px;
}

:deep(.vue-flow__edge.edge-pending .vue-flow__edge-path) {
  stroke: #94a3b8 !important;
  stroke-width: 2px;
  stroke-dasharray: 5, 5;
  animation: dash-animation 0.5s linear infinite;
}

:deep(.dark .vue-flow__edge.edge-pending .vue-flow__edge-path) {
  stroke: #64748b !important;
}

/* Animations */
@keyframes pulse-executing {
  0%, 100% {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.3), 0 0 30px rgba(59, 130, 246, 0.5);
  }
}

@keyframes dash-animation {
  to {
    stroke-dashoffset: -10;
  }
}
</style>