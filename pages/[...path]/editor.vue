<template>
  <div class="h-screen bg-neutral-50 dark:bg-neutral-900 overflow-hidden">
    <!-- Navigation -->
    <AppNavigation :breadcrumbs="pathSegments">
      <template #actions>
        <!-- Run/Cancel Split Button -->
        <div class="inline-flex rounded-md shadow-sm">
          <!-- Main Run Button -->
          <button
            @click="executeGraph"
            :disabled="isExecuting || project?.status === 'disabled'"
            class="relative inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 rounded-l-md"
            :class="{ 'rounded-r-md': !isExecuting }"
          >
            <svg v-if="isExecuting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span v-if="isExecuting">Executing...</span>
            <span v-else class="inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="mr-2"><path fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-dasharray="40" stroke-dashoffset="40" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 6l10 6l-10 6Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.5s" dur="0.5s" values="0;1"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.5s" values="40;0"/></path></svg>Run
            </span>
          </button>
          
          <!-- Cancel Button (only visible when executing) -->
          <button
            v-if="isExecuting"
            @click="cancelExecution"
            class="relative inline-flex items-center px-2 py-2 border border-l-0 border-red-500 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded-r-md"
            :title="isJobRunningOnAgent ? `Cancel job ${currentProjectJob?.jobId} on agent` : 'Cancel local execution'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="h-4 w-4">
              <path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10s10-4.47 10-10S17.53 2 12 2zM17 15.59L15.59 17L12 13.41L8.41 17L7 15.59L10.59 12L7 8.41L8.41 7L12 10.59L15.59 7L17 8.41L13.41 12L17 15.59z"/>
            </svg>
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
          title="View build history"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="mr-2">
            <path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
          </svg>
          Build History
        </NuxtLink>
      </template>
    </AppNavigation>

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
              ⚠️ This project is disabled
            </p>
            <p class="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Cron jobs will not run, manual execution is blocked, and webhooks will be ignored. Click "Enable" to reactivate.
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
      <div class="flex" :style="{ height: `calc(100vh - 64px - ${project?.status === 'disabled' ? '60px' : '0px'})` }">
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
                title="Hide Nodes Panel"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <!-- Node Categories -->
            <div class="space-y-4">
              <div>
                <h4 class="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Triggers</h4>
                <div class="space-y-2">
                  <div
                    v-for="nodeType in triggerNodes"
                    :key="nodeType.type"
                    class="p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    @click="addNode(nodeType)"
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
                    class="p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    @click="addNode(nodeType)"
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
                    class="p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    @click="addNode(nodeType)"
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
                    class="p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    @click="addNode(nodeType)"
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
          <div 
            class="relative"
            :style="{ 
              height: `calc(100vh - 64px - ${terminalHeight}px)`,
              minHeight: `${minVueFlowHeight}px`
            }"
          >
            <!-- Floating toggle buttons when panels are hidden -->
            <div v-if="!showNodesPanel" class="absolute top-4 left-4 z-40">
              <button
                @click="toggleNodesPanel"
                class="p-2 bg-white dark:bg-neutral-800 shadow-lg rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                title="Show Nodes Panel"
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
                title="Show Properties Panel"
              >
                <svg class="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
                </svg>
              </button>
            </div>
            
            <div class="w-full h-full" @keydown="handleKeyDown" tabindex="0">
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
              >
                <Background 
                  variant="lines" 
                  :gap="[20, 20]"
                  :size="1"
                  :color="isDark ? '#525252' : '#d1d5db'"
                  :backgroundColor="isDark ? '#171717' : '#f9fafb'"
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
          
          <!-- Resize Handle -->
          <div 
            class="h-1 bg-gray-600 hover:bg-blue-500 cursor-row-resize transition-colors relative group"
            @mousedown="startResize"
          >
            <div class="absolute inset-x-0 -top-1 -bottom-1 flex items-center justify-center">
              <div class="w-12 h-0.5 bg-gray-400 group-hover:bg-blue-400 transition-colors"></div>
            </div>
          </div>
          
          <!-- Terminal-like Execution Panel -->
          <div 
            class="bg-gray-950 border-t border-gray-700 flex flex-col"
            :style="{ height: `${terminalHeight}px` }"
          >
            <!-- Terminal Header -->
            <div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <div class="flex items-center space-x-2">
                <div class="flex space-x-2">
                  <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <span class="text-sm text-gray-300 ml-4">Execution Terminal</span>
                
                <!-- WebSocket Status Indicator -->
                <div class="flex items-center ml-4">
                  <div 
                    :class="{
                      'w-2 h-2 rounded-full': true,
                      'bg-green-500': isSocketConnected,
                      'bg-red-500': !isSocketConnected,
                      'animate-pulse': !isSocketConnected
                    }"
                  ></div>
                  <span class="text-xs text-gray-400 ml-1">
                    {{ isSocketConnected ? 'Real-time' : 'Disconnected' }}
                  </span>
                </div>
              </div>
              <button
                @click="clearExecutionResults"
                class="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded border border-gray-600 hover:border-gray-500"
              >
                Clear
              </button>
            </div>
            
            <!-- Terminal Content -->
            <div class="flex-1 overflow-y-auto p-4 font-mono text-sm">
              <!-- Show different states based on execution -->
              <div v-if="executionResults.length === 0 && !isJobRunningOnAgent" class="text-neutral-500">
                Ready to execute. Click the "▶ Run" button to start...
              </div>
              
              <div v-if="isJobRunningOnAgent && currentProjectJob && executionResults.length === 0" class="text-neutral-500">
                <div class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Waiting for agent output...
                </div>
              </div>
              
              <!-- Agent job info panel -->
              <div v-if="isJobRunningOnAgent && currentProjectJob" class="mb-4 p-3 bg-blue-950 border border-blue-800 rounded">
                <div class="text-blue-200 text-sm font-medium mb-1">🤖 Job Running on Agent</div>
                <div class="text-blue-300 text-xs">
                  <div>Job ID: {{ currentProjectJob.jobId }}</div>
                  <div>Agent: {{ currentProjectJob.agentId }}</div>
                  <div>Started: {{ new Date(currentProjectJob.startTime).toLocaleString() }}</div>
                  <div v-if="currentProjectJob.nodeId">Current: {{ currentProjectJob.nodeId }}</div>
                </div>
              </div>
              
              <!-- Real-time output from agent -->
              <div v-for="(result, index) in executionResults" :key="index" class="mb-1">
                <span class="text-neutral-500 text-xs">{{ formatTimestamp(result.timestamp) }}</span>
                <span 
                  class="ml-2"
                  :class="{
                    'text-green-400': result.type === 'success',
                    'text-red-400': result.type === 'error',
                    'text-blue-400': result.type === 'info',
                    'text-yellow-400': result.type === 'warning'
                  }"
                >
                  [{{ result.nodeLabel || result.source || 'AGENT' }}]
                </span>
                <span class="text-neutral-300 ml-2">{{ result.message }}</span>
                <span v-if="result.value !== undefined" class="text-cyan-400 ml-2">→ {{ result.value }}</span>
              </div>
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
              <h3 class="text-lg font-medium text-neutral-900 dark:text-white">Properties</h3>
              <button
                @click="togglePropertiesPanel"
                class="p-1 rounded-md text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                title="Hide Properties Panel"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div v-if="selectedNode" class="space-y-4">
              <div class="flex justify-between items-center">
                <h4 class="font-medium text-neutral-900 dark:text-white">Node Properties</h4>
                <button
                  @click="selectedNode = null"
                  class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  Clear Selection
                </button>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Node Type</label>
                <p class="text-sm text-neutral-600 dark:text-neutral-400">{{ selectedNode.data?.nodeType || selectedNode.type }}</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Label</label>
                <input
                  v-model="selectedNode.data.label"
                  type="text"
                  class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  @input="updateNodeLabel"
                >
              </div>
              
              <div v-if="selectedNode.data?.nodeType === 'number'">
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Value</label>
                <input
                  v-model.number="selectedNode.data.value"
                  type="number"
                  class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
              </div>
              
              <!-- Parameter Node Configuration -->
              <div v-if="selectedNode.data?.nodeType?.includes('-param')">
                <div v-if="selectedNode.data.nodeType === 'choice-param'" class="mt-3">
                  <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Choices (one per line)</label>
                  <textarea
                    :value="selectedNode.data.choices?.join('\n') || ''"
                    @input="selectedNode.data.choices = $event.target.value.split('\n').filter(c => c.trim())"
                    rows="3"
                    class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  ></textarea>
                </div>
                
                <div class="mt-3">
                  <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Default Value</label>
                  <input
                    v-if="selectedNode.data.nodeType === 'boolean-param'"
                    v-model="selectedNode.data.defaultValue"
                    type="checkbox"
                    class="w-4 h-4 text-blue-600 bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 rounded focus:ring-blue-500 focus:ring-2"
                  >
                  <select
                    v-else-if="selectedNode.data.nodeType === 'choice-param'"
                    v-model="selectedNode.data.defaultValue"
                    class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  >
                    <option v-for="choice in selectedNode.data.choices" :key="choice" :value="choice">{{ choice }}</option>
                  </select>
                  <textarea
                    v-else-if="selectedNode.data.nodeType === 'text-param'"
                    v-model="selectedNode.data.defaultValue"
                    rows="3"
                    class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  ></textarea>
                  <input
                    v-else
                    v-model="selectedNode.data.defaultValue"
                    type="text"
                    class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  >
                </div>
              </div>
              
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
                      title="Remove socket"
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
                  <option value="local">Local execution</option>
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
                  ⚠️ Agent selection is required for execution nodes
                </p>
                <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400" v-else>
                  This node will execute on the selected agent. Choose "Any available agent" if you don't have a preference.
                </p>
              </div>
              
              <!-- Cron Configuration for cron trigger nodes -->
              <div v-if="selectedNode.data?.nodeType === 'cron'">
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Cron Expression <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="selectedNode.data.cronExpression"
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
                      @click="selectedNode.data.cronExpression = '0 * * * *'"
                      class="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded"
                    >
                      Every hour
                    </button>
                    <button
                      @click="selectedNode.data.cronExpression = '0 0 * * *'"
                      class="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded"
                    >
                      Daily at midnight
                    </button>
                    <button
                      @click="selectedNode.data.cronExpression = '0 0 * * 1'"
                      class="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded"
                    >
                      Weekly (Monday)
                    </button>
                    <button
                      @click="selectedNode.data.cronExpression = '0 0 1 * *'"
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
                    <div v-if="selectedNode.data.cronExpression && cronInfo.isValid" class="space-y-1">
                      <div class="font-medium">{{ cronInfo.description }}</div>
                      <div v-if="cronInfo.nextRun" class="text-xs">
                        Next run: {{ new Date(cronInfo.nextRun).toLocaleString() }}
                      </div>
                      <div class="text-xs opacity-75">
                        Expression: {{ selectedNode.data.cronExpression }}
                      </div>
                    </div>
                    <div v-else-if="selectedNode.data.cronExpression && !cronInfo.isValid" class="text-red-600 dark:text-red-400">
                      {{ cronInfo.description }}
                    </div>
                    <span v-else class="text-red-600 dark:text-red-400">
                      No cron expression configured
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- Webhook Configuration for webhook trigger nodes -->
              <div v-if="selectedNode.data?.nodeType === 'webhook'">
                <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div class="flex items-center mb-2">
                    <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <h4 class="text-sm font-semibold text-blue-800 dark:text-blue-200">Webhook Trigger Configuration</h4>
                  </div>
                  <p class="text-xs text-blue-700 dark:text-blue-300">
                    Configure this webhook to allow external systems to trigger this workflow via HTTP requests.
                  </p>
                </div>
                
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Custom Endpoint <span class="text-red-500">*</span>
                </label>
                <div class="flex items-center mb-2">
                  <span class="text-sm text-neutral-500 dark:text-neutral-400 mr-2">/api/webhook/</span>
                  <input
                    v-model="selectedNode.data.customEndpoint"
                    type="text"
                    class="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono"
                    placeholder="deploy-prod"
                    pattern="[a-zA-Z0-9-_]+"
                    @input="validateEndpoint"
                  />
                </div>
                <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Choose a unique endpoint name (letters, numbers, dashes, and underscores only). Examples: <code>deploy-prod</code>, <code>backup_db</code>, <code>notify-slack</code>
                </p>
                
                <div class="mt-3">
                  <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Secret Token <span class="text-red-500">*</span>
                  </label>
                  <div class="flex items-center space-x-2">
                    <input
                      v-model="selectedNode.data.secretToken"
                      type="text"
                      required
                      class="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono"
                      placeholder="Enter a secure secret token (required)"
                      :class="{ 'border-red-500 dark:border-red-400': !selectedNode.data.secretToken }"
                    />
                    <button
                      @click="generateSecretToken"
                      type="button"
                      class="px-3 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center space-x-1"
                      title="Generate random secure token"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                        <circle cx="12" cy="16" r="1"/>
                        <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <span class="hidden sm:inline">Generate</span>
                    </button>
                  </div>
                  <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Required for security. Include this token in the 'X-Webhook-Token' header when calling the webhook. Use the Generate button for a cryptographically secure 64-character token.
                  </p>
                  <p v-if="!selectedNode.data.secretToken" class="mt-1 text-xs text-red-500 dark:text-red-400">
                    ⚠️ Secret token is required for webhook security
                  </p>
                </div>
                
                <div class="mt-3">
                  <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Description</label>
                  <textarea
                    v-model="selectedNode.data.description"
                    rows="2"
                    class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    placeholder="Describe what this webhook does (optional)"
                  ></textarea>
                </div>
                
                <div class="mt-3">
                  <label class="flex items-center">
                    <input
                      v-model="selectedNode.data.active"
                      type="checkbox"
                      class="w-4 h-4 text-blue-600 bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span class="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Active</span>
                  </label>
                  <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Uncheck to temporarily disable this webhook trigger
                  </p>
                </div>
                
                <!-- Webhook URL Display -->
                <div v-if="selectedNode.data.customEndpoint" class="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded text-xs">
                  <div class="font-medium text-blue-800 dark:text-blue-200 mb-2">🎣 Webhook URL:</div>
                  <div class="text-blue-700 dark:text-blue-300 space-y-2">
                    <div class="bg-white dark:bg-blue-900 p-2 rounded border border-blue-200 dark:border-blue-800 font-mono break-all">
                      {{ webhookUrl }}
                    </div>
                    <div class="space-y-1">
                      <div><strong>Method:</strong> POST</div>
                      <div><strong>Auth:</strong> Required (secret token)</div>
                      <div><strong>Status:</strong> {{ selectedNode.data.active ? '✅ Active' : '❌ Inactive' }}</div>
                    </div>
                    <div class="text-xs opacity-75 mt-2">
                      <div><strong>Example curl:</strong></div>
                      <div class="bg-neutral-800 text-green-400 p-2 rounded mt-1 font-mono text-xs overflow-x-auto">
                        curl -X POST {{ webhookUrl }} \<br/>&nbsp;&nbsp;-H "X-Webhook-Token: {{ selectedNode.data.secretToken || 'YOUR_SECRET_TOKEN' }}" \<br/>&nbsp;&nbsp;-H "Content-Type: application/json" \<br/>&nbsp;&nbsp;-d '{"message": "Hello from webhook"}'
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Webhook Documentation -->
                <div class="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded text-xs">
                  <div class="font-medium text-green-800 dark:text-green-200 mb-2">📖 How Webhooks Work:</div>
                  <div class="text-green-700 dark:text-green-300 space-y-2">
                    <div>
                      <strong>1. Setup:</strong> Configure your webhook endpoint above and connect execution nodes to this trigger.
                    </div>
                    <div>
                      <strong>2. Save:</strong> Save the project to activate the webhook endpoint.
                    </div>
                    <div>
                      <strong>3. Trigger:</strong> External systems can call your webhook URL to start the workflow.
                    </div>
                    <div>
                      <strong>4. Authentication:</strong> Use the secret token to secure your webhook (recommended).
                    </div>
                    <div class="pt-1 border-t border-green-200 dark:border-green-800">
                      <strong>Payload Access:</strong> The webhook request body will be available as context data in connected execution nodes.
                    </div>
                  </div>
                </div>
                
                <!-- Common Use Cases -->
                <div class="mt-3 p-3 bg-amber-50 dark:bg-amber-950 rounded text-xs">
                  <div class="font-medium text-amber-800 dark:text-amber-200 mb-2">💡 Common Use Cases:</div>
                  <div class="text-amber-700 dark:text-amber-300 space-y-1">
                    <div>• <strong>CI/CD:</strong> Trigger deployments from GitHub, GitLab, or other platforms</div>
                    <div>• <strong>Notifications:</strong> Respond to events from Slack, Discord, or monitoring tools</div>
                    <div>• <strong>API Integration:</strong> Process data from external APIs or services</div>
                    <div>• <strong>Automation:</strong> Execute workflows when specific events occur</div>
                  </div>
                </div>
              </div>
              
              <!-- Script Editor for execution nodes -->
              <div v-if="selectedNode.data?.script !== undefined">
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
    <div v-if="showDeleteModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div class="mt-3">
          <div class="flex items-center justify-center mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900">
            <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div class="mt-4 text-center">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">Confirm Deletion</h3>
            <div class="mt-2 px-7 py-3">
              <p class="text-sm text-gray-500 dark:text-gray-300">
                Are you sure you want to delete the following {{ itemsToDelete.length === 1 ? 'item' : 'items' }}?
              </p>
              <div class="mt-3 max-h-32 overflow-y-auto">
                <ul class="text-sm text-gray-700 dark:text-gray-300">
                  <li v-for="item in itemsToDelete" :key="item.id" class="py-1">
                    <span class="font-medium">{{ item.type === 'node' ? '🔷' : '🔗' }}</span>
                    {{ item.label }}
                  </li>
                </ul>
              </div>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <div class="flex justify-center space-x-3 px-4 py-3">
          <button
            @click="cancelDelete"
            class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Cancel
          </button>
          <button
            @click="confirmDelete"
            class="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { VueFlow, useVueFlow, Handle, Position, ConnectionMode } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { ref, computed, onMounted, onUnmounted, nextTick, defineComponent, h, markRaw } from 'vue'

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
const { isDark } = useDarkMode()

const isEditorReady = ref(false)
const isSaving = ref(false)
const selectedNode = ref(null)

// Project status toggle state
const isTogglingStatus = ref(false)

// Delete confirmation modal state
const showDeleteModal = ref(false)
const itemsToDelete = ref([])

// Execution state - computed from WebSocket store to stay in sync
const isExecuting = computed(() => {
  if (!project.value?.id) return false
  return webSocketStore.isProjectJobRunning(project.value.id)
})
const activeJobs = ref(new Map()) // Track active jobs for cancellation

// Agent state
const agents = ref([])

// Execution state and computed values from WebSocket store
const executionResults = computed(() => {
  if (!project.value?.id) return []
  return webSocketStore.getJobMessages(project.value.id)
})

const currentProjectJob = computed(() => {
  if (!project.value?.id) return null
  return webSocketStore.getCurrentJob(project.value.id)
})

const isJobRunningOnAgent = computed(() => {
  if (!project.value?.id) return false
  return webSocketStore.isProjectJobRunning(project.value.id)
})

const isSocketConnected = computed(() => webSocketStore.isConnected)

// Build stats integration
let currentBuildId = null

const startBuild = async () => {
  if (!project.value?.id) return null
  
  try {
    const response = await $fetch(`/api/projects/${project.value.id}/builds`, {
      method: 'POST',
      body: {
        trigger: 'manual',
        message: 'Manual execution from editor',
        nodeCount: nodes.value.length,
        agentId: null // Will be updated when agent is assigned
      }
    })
    
    currentBuildId = response.buildId
    console.log('✅ Build started:', currentBuildId)
    return currentBuildId
  } catch (error) {
    console.warn('Failed to start build recording:', error)
    return null
  }
}

const finishBuild = async (status, message) => {
  if (!currentBuildId) return
  
  try {
    await $fetch(`/api/projects/${project.value.id}/builds/${currentBuildId}`, {
      method: 'PATCH',
      body: {
        status: status,
        message: message,
        nodesExecuted: nodes.value.length // Assume all nodes executed for now
      }
    })
    
    console.log('✅ Build finished:', currentBuildId, status)
    currentBuildId = null
  } catch (error) {
    console.warn('Failed to finish build recording:', error)
  }
}

const addBuildLog = async (level, message, command = null) => {
  if (!currentBuildId) return
  
  try {
    await $fetch(`/api/projects/${project.value.id}/builds/${currentBuildId}`, {
      method: 'PATCH',
      body: {
        log: {
          level: level,
          message: message,
          command: command,
          source: 'system'
        }
      }
    })
  } catch (error) {
    console.warn('Failed to add build log:', error)
  }
}

// Legacy functions for backward compatibility
const recordBuildEvent = async (status, message, logs = []) => {
  if (status === 'failure' || status === 'cancelled') {
    await finishBuild(status === 'cancelled' ? 'cancelled' : 'failure', message)
  }
}

const recordTerminalLog = async (level, message, command = null) => {
  await addBuildLog(level, message, command)
}

// Terminal resize state
const terminalHeight = ref(256) // Default height in pixels (h-64 = 256px)
const minVueFlowHeight = ref(300) // Minimum height for Vue Flow
const isResizing = ref(false)
const resizeStartY = ref(0)
const resizeStartHeight = ref(0)

// Panel visibility state
const showNodesPanel = ref(false)
const showPropertiesPanel = ref(false)

// Vue Flow state
const nodes = ref([])
const edges = ref([])

// Use Vue Flow composables
const { onConnect, addEdges, getSelectedNodes, getSelectedEdges } = useVueFlow()

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
  { type: 'git-trigger', name: 'Git Trigger', description: 'Trigger on git push, PR, or branch changes' },
  { type: 'pipeline-trigger', name: 'Pipeline Trigger', description: 'Trigger from another pipeline completion' },
  { type: 'api-trigger', name: 'API Trigger', description: 'Trigger via REST API call' }
]

const parameterNodes = [
  { type: 'string-param', name: 'String Parameter', description: 'Single-line text parameter' },
  { type: 'text-param', name: 'Text Parameter', description: 'Multi-line text parameter' },
  { type: 'choice-param', name: 'Choice Parameter', description: 'Dropdown selection parameter' },
  { type: 'boolean-param', name: 'Boolean Parameter', description: 'True/false parameter' },
  { type: 'file-param', name: 'File Parameter', description: 'File upload parameter' }
]

const executionNodes = [
  { type: 'bash', name: 'Bash Script', description: 'Execute bash commands' },
  { type: 'powershell', name: 'PowerShell Script', description: 'Execute PowerShell commands' },
  { type: 'cmd', name: 'Command Prompt', description: 'Execute Windows CMD commands' },
  { type: 'python', name: 'Python Script', description: 'Execute Python code' },
  { type: 'node-js', name: 'Node.js Script', description: 'Execute Node.js/JavaScript code' }
]

const controlNodes = [
  { type: 'parallel', name: 'Parallel', description: 'Execute multiple branches in parallel' },
  { type: 'conditional', name: 'Conditional', description: 'Conditional execution based on parameters' },
  { type: 'retry', name: 'Retry', description: 'Retry failed executions' },
  { type: 'notification', name: 'Notification', description: 'Send notifications (email, slack, etc.)' }
]

// Agent computed properties and helpers
const availableAgents = computed(() => {
  return agents.value.filter(agent => 
    agent.capabilities.some(cap => ['bash', 'powershell', 'cmd', 'python', 'node'].includes(cap))
  )
})

const isExecutionNode = (nodeType) => {
  if (!nodeType) return false
  return ['bash', 'powershell', 'cmd', 'python', 'node-js'].includes(nodeType)
}

// Agent data loading
const loadAgents = async () => {
  try {
    const data = await $fetch('/api/admin/agents')
    agents.value = data
    console.log(`🤖 Loaded ${data.length} agents`)
  } catch (error) {
    console.error('Error loading agents:', error)
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
    console.log(`🔄 Updated agent ${agentId} status: ${status}`)
  } else {
    console.log(`⚠️ Agent ${agentId} not found in local array - refreshing agent list`)
    loadAgents() // Reload if agent not found (new agent connected)
  }
}

// Terminal formatting functions
const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

// Node type definitions for Vue Flow
const CustomNode = defineComponent({
  name: 'CustomNode',
  props: ['data', 'id'],
  setup(props, { emit }) {
    return () => {
      const nodeData = props.data
      const nodeId = props.id
      
      // Calculate total input sockets count
      const inputSocketsCount = nodeData.inputSockets?.length || 0
      const hasExecutionInput = nodeData.hasExecutionInput
      const totalInputs = (hasExecutionInput ? 1 : 0) + inputSocketsCount
      
      // Create input handles array
      const inputHandles = []
      let currentInputIndex = 0
      
      // Add execution input handle if node supports it
      if (hasExecutionInput) {
        const executionTop = totalInputs === 1 ? '50%' : `${20 + (currentInputIndex * 25)}px`
        inputHandles.push(
          h(Handle, {
            key: 'execution-input',
            type: 'target',
            position: Position.Left,
            id: 'execution',
            style: { 
              background: isDark.value ? '#737373' : '#555',
              left: '-6px',
              top: executionTop,
              transform: totalInputs === 1 ? 'translateY(-50%)' : 'none'
            }
          })
        )
        currentInputIndex++
      }
      
      // Add dynamic input sockets - positioned after execution input
      if (nodeData.inputSockets && nodeData.inputSockets.length > 0) {
        nodeData.inputSockets.forEach((socket, index) => {
          const topPosition = totalInputs === 1 ? '50%' : `${20 + (currentInputIndex * 25)}px`
          inputHandles.push(
            h(Handle, {
              key: `input-${socket.id}`,
              type: 'target',
              position: Position.Left,
              id: socket.id,
              style: { 
                background: '#3b82f6',
                left: '-6px',
                top: topPosition,
                transform: totalInputs === 1 ? 'translateY(-50%)' : 'none',
                borderRadius: '3px',
                width: '10px',
                height: '10px'
              }
            })
          )
          currentInputIndex++
        })
      }
      
      // Create output handles
      const outputHandles = []
      const hasExecutionOutput = nodeData.hasExecutionOutput
      const hasDataOutput = nodeData.hasDataOutput
      const totalOutputs = (hasExecutionOutput ? 1 : 0) + (hasDataOutput ? 1 : 0)
      let currentOutputIndex = 0
      
      // Add execution output handle
      if (hasExecutionOutput) {
        const executionTop = totalOutputs === 1 ? '50%' : `${20 + (currentOutputIndex * 25)}px`
        outputHandles.push(
          h(Handle, {
            key: 'execution-output',
            type: 'source',
            position: Position.Right,
            id: 'execution',
            style: { 
              background: isDark.value ? '#737373' : '#555',
              right: '-6px',
              top: executionTop,
              transform: totalOutputs === 1 ? 'translateY(-50%)' : 'none'
            }
          })
        )
        currentOutputIndex++
      }
      
      // Add data output handle for parameter nodes
      if (hasDataOutput) {
        const dataTop = totalOutputs === 1 ? '50%' : `${20 + (currentOutputIndex * 25)}px`
        outputHandles.push(
          h(Handle, {
            key: 'data-output',
            type: 'source',
            position: Position.Right,
            id: 'data',
            style: { 
              background: '#10b981',
              right: '-6px',
              top: dataTop,
              transform: totalOutputs === 1 ? 'translateY(-50%)' : 'none',
              borderRadius: '3px',
              width: '10px',
              height: '10px'
            }
          })
        )
      }
      
      // Calculate node height based on content and sockets
      const baseHeight = 60
      const maxSockets = Math.max(totalInputs, totalOutputs)
      const socketHeight = maxSockets > 1 ? (maxSockets - 1) * 25 : 0
      const totalHeight = Math.max(baseHeight, baseHeight + socketHeight)
      
      return h('div', {
        class: 'px-4 py-2 shadow-md rounded-md border-1 bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 relative',
        style: {
          backgroundColor: nodeData.color || (isDark.value ? '#404040' : '#ffffff'),
          color: nodeData.textColor || (isDark.value ? '#f5f5f5' : '#000000'),
          minWidth: '160px',
          minHeight: `${totalHeight}px`
        }
      }, [
        // Input handles
        ...inputHandles,
        
        // Node content
        h('div', { class: 'text-center relative z-10 py-2' }, [
          h('div', { class: 'font-bold text-sm text-neutral-900 dark:text-neutral-100' }, nodeData.label),
          nodeData.nodeType === 'number' && nodeData.value !== undefined
            ? h('div', { class: 'text-xs text-neutral-600 dark:text-neutral-400 mt-1 truncate w-48' }, `Value: ${nodeData.value}`)
            : null,
          // Show parameter value for parameter nodes
          nodeData.nodeType?.includes('-param') && nodeData.defaultValue !== undefined
            ? h('div', { class: 'text-xs text-neutral-600 dark:text-neutral-400 mt-1 truncate w-48' }, `${nodeData.defaultValue}`)
            : null,
          // Show socket labels if any
          nodeData.inputSockets && nodeData.inputSockets.length > 0
            ? h('div', { class: 'text-xs text-neutral-500 dark:text-neutral-400 mt-2 truncate w-48' }, 
                nodeData.inputSockets.map(socket => socket.label).join(', ')
              )
            : null
        ]),
        
        // Output handles
        ...outputHandles
      ])
    }
  }
})

const nodeTypes = {
  custom: markRaw(CustomNode)
}

// Panel toggle functions
const toggleNodesPanel = () => {
  showNodesPanel.value = !showNodesPanel.value
}

const togglePropertiesPanel = () => {
  showPropertiesPanel.value = !showPropertiesPanel.value
}

// Modal confirmation methods
const confirmDelete = () => {
  showDeleteModal.value = false
  itemsToDelete.value = []
  if (window.deleteResolve) {
    window.deleteResolve(true)
    window.deleteResolve = null
  }
}

const cancelDelete = () => {
  showDeleteModal.value = false
  itemsToDelete.value = []
  if (window.deleteResolve) {
    window.deleteResolve(false)
    window.deleteResolve = null
  }
}

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

// Terminal resize functions
const startResize = (event) => {
  isResizing.value = true
  resizeStartY.value = event.clientY
  resizeStartHeight.value = terminalHeight.value
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
}

const handleResize = (event) => {
  if (!isResizing.value) return
  
  const deltaY = resizeStartY.value - event.clientY // Inverted because we want to grow up
  const newHeight = Math.max(100, resizeStartHeight.value + deltaY) // Minimum 100px for terminal
  
  // Calculate available space (total height minus nav height)
  const availableHeight = window.innerHeight - 64 // Nav height is 64px (h-16)
  const maxTerminalHeight = availableHeight - minVueFlowHeight.value
  
  terminalHeight.value = Math.min(newHeight, maxTerminalHeight)
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

const addNode = async (nodeType) => {
  const newNode = {
    id: `${nodeType.type}-${Date.now()}`,
    type: 'custom',
    position: {
      x: Math.random() * 400 + 200,
      y: Math.random() * 200 + 100
    },
    data: {
      label: nodeType.name,
      nodeType: nodeType.type,
      description: nodeType.description,
      color: getNodeColor(nodeType.type),
      textColor: 'white',
      
      // Set default values based on node type
      ...getDefaultNodeData(nodeType.type)
    }
  }
  
  nodes.value.push(newNode)
}

const getDefaultNodeData = (type) => {
  const baseData = {
    // Socket configuration - every node has this
    inputSockets: [], // Array of {id, label, connected: false}
    hasExecutionOutput: true, // Most nodes have execution output
    hasExecutionInput: true // Most nodes have execution input
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
        endpoint: '/webhook',
        method: 'POST',
        secretToken: '',
        customEndpoint: '',
        description: '',
        active: true
      }
    case 'git-trigger':
      return { 
        ...baseData,
        hasExecutionInput: false,
        repository: '',
        branches: ['main', 'develop'],
        events: ['push', 'pull_request'],
        includeFiles: '*',
        excludeFiles: ''
      }
    case 'pipeline-trigger':
      return { 
        ...baseData,
        hasExecutionInput: false,
        pipelineName: '',
        triggerOn: 'success', // success, failure, always
        waitForCompletion: true
      }
    case 'api-trigger':
      return { 
        ...baseData,
        hasExecutionInput: false,
        endpoint: '/api/trigger',
        method: 'POST',
        authRequired: false,
        apiKey: ''
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
    case 'file-param':
      return { 
        ...baseData,
        hasExecutionInput: false,
        hasExecutionOutput: false,
        hasDataOutput: true,
        allowedExtensions: '',
        description: 'File upload parameter'
      }
      
    // Execution nodes
    case 'bash':
      return { 
        ...baseData,
        script: '#!/bin/bash\necho "Hello from bash"',
        workingDirectory: '.',
        timeout: 300
      }
    case 'powershell':
      return { 
        ...baseData,
        script: 'Write-Host "Hello from PowerShell"',
        workingDirectory: '.',
        timeout: 300
      }
    case 'cmd':
      return { 
        ...baseData,
        script: 'echo Hello from Command Prompt',
        workingDirectory: '.',
        timeout: 300
      }
    case 'python':
      return { 
        ...baseData,
        script: 'print("Hello from Python")',
        workingDirectory: '.',
        timeout: 300
      }
    case 'node-js':
      return { 
        ...baseData,
        script: 'console.log("Hello from Node.js");',
        workingDirectory: '.',
        timeout: 300
      }
      
    // Control nodes
    case 'parallel':
      return { 
        ...baseData,
        maxConcurrency: 2,
        description: 'Parallel execution'
      }
    case 'conditional':
      return { 
        ...baseData,
        condition: '$param1 == "value"',
        description: 'Conditional execution'
      }
    case 'retry':
      return { 
        ...baseData,
        maxRetries: 3,
        retryDelay: 5,
        description: 'Retry on failure'
      }
    case 'notification':
      return { 
        ...baseData,
        hasExecutionOutput: false, // Notifications are terminal nodes
        type: 'email',
        recipients: '',
        message: 'Job completed'
      }
      
    default:
      return baseData
  }
}

const getNodeColor = (type) => {
  const colors = {
    // Trigger nodes - Green shades
    'cron': '#10b981',
    'webhook': '#047857',
    'git-trigger': '#065f46',
    'pipeline-trigger': '#064e3b',
    'api-trigger': '#022c22',
    
    // Parameter nodes - Blue shades
    'string-param': '#3b82f6',
    'text-param': '#2563eb',
    'choice-param': '#1d4ed8',
    'boolean-param': '#1e40af',
    'file-param': '#1e3a8a',
    
    // Execution nodes - Orange/Red shades
    'bash': '#f59e0b',
    'powershell': '#d97706',
    'cmd': '#b45309',
    'python': '#92400e',
    'node-js': '#78350f',
    
    // Control nodes - Purple shades
    'parallel': '#8b5cf6',
    'conditional': '#7c3aed',
    'retry': '#6d28d9',
    'notification': '#5b21b6'
  }
  return colors[type] || '#6b7280'
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
      console.warn('Webhook validation warnings:', webhookErrors)
      // Could add toast notifications here for webhook warnings
      for (const warning of webhookErrors) {
        console.warn(`⚠️ ${warning}`)
      }
    }
    
    const diagramData = {
      nodes: nodes.value,
      edges: edges.value
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
      console.log('✅ Cron jobs updated')
    } catch (cronError) {
      console.warn('⚠️ Failed to update cron jobs:', cronError)
      // Don't fail the save operation if cron update fails
    }
    
  } catch (error) {
    console.error('Error saving project:', error)
  } finally {
    isSaving.value = false
  }
}

const updateNodeLabel = () => {
  // Node label updated
}

// Webhook endpoint validation
const validateEndpoint = (event) => {
  const value = event.target.value
  // Remove invalid characters as user types
  const cleanValue = value.replace(/[^a-zA-Z0-9-_]/g, '')
  if (cleanValue !== value) {
    selectedNode.value.data.customEndpoint = cleanValue
  }
}

// Generate secure random token for webhook
const generateSecretToken = () => {
  if (!selectedNode.value) return
  
  // Generate a secure random token using crypto API if available, otherwise fallback
  let token = ''
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    // Use crypto.getRandomValues for secure random generation
    const array = new Uint8Array(32)
    window.crypto.getRandomValues(array)
    token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  } else {
    // Fallback for environments without crypto API
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }
  
  selectedNode.value.data.secretToken = token
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
        errors.push(`🔐 "${node.data.label || 'Unnamed Webhook'}" has no secret token. Secret tokens are required for webhook security.`)
      }
    }
  }
  
  return errors
}

// Execution functions
const clearExecutionResults = () => {
  if (project.value?.id) {
    webSocketStore.clearJobMessages(project.value.id)
  }
}

const addExecutionResult = (nodeId, nodeLabel, type, message, value = undefined) => {
  if (project.value?.id) {
    webSocketStore.addJobMessage(project.value.id, nodeLabel, type, message, value)
  }
}

const executeGraph = async () => {
  if (isExecuting.value) return
  
  // Check if project is disabled
  if (project.value?.status === 'disabled') {
    addExecutionResult(null, 'System', 'error', '🚫 Project is disabled. Manual execution is blocked.')
    addExecutionResult(null, 'System', 'info', 'Enable the project to run manual executions.')
    return
  }
  
  // Validate that all execution nodes have agent selection
  const validationErrors = validateExecutionNodes()
  if (validationErrors.length > 0) {
    // Show validation errors to user
    for (const error of validationErrors) {
      addExecutionResult(null, 'System', 'error', error)
    }
    addExecutionResult(null, 'System', 'error', 'Execution blocked due to validation errors. Please fix the issues above and try again.')
    return
  }
  
  // This function only handles STARTING a job on an agent
  // The actual execution happens on the agent, and output is streamed back
  // isExecuting state is now automatically computed from WebSocket store
  
  clearExecutionResults()
  
  // Start build recording
  await startBuild()
  await recordTerminalLog('info', 'Starting project execution', 'Run Graph')
  const buildStartTime = Date.now()
  
  try {
    addExecutionResult(null, 'System', 'info', 'Sending execution request to agent...')
    
    // Convert the graph to execution data for the agent
    const executionData = {
      projectId: project.value.id,
      nodes: nodes.value,
      edges: edges.value,
      startTime: new Date().toISOString()
    }
    
    // Send execution request to server, which will dispatch to an agent
    const response = await $fetch('/api/projects/execute', {
      method: 'POST',
      body: executionData
    })
    
    if (response.success) {
      // Job was successfully dispatched to an agent
      addExecutionResult(null, 'System', 'success', `Job dispatched to agent ${response.agentName || response.agentId}`)
      addExecutionResult(null, 'System', 'info', `Job ID: ${response.jobId}`)
      addExecutionResult(null, 'System', 'info', 'Waiting for agent output...')
      
      // Update build record with agent information
      if (currentBuildId) {
        try {
          await $fetch(`/api/projects/${project.value.id}/builds/${currentBuildId}`, {
            method: 'PATCH',
            body: {
              agentId: response.agentId,
              jobId: response.jobId
            }
          })
        } catch (error) {
          console.warn('Failed to update build with agent info:', error)
        }
      }
      
      console.log('✅ Job dispatched to agent:', response)
      
    } else {
      addExecutionResult(null, 'System', 'error', `Failed to start execution: ${response.message || 'Unknown error'}`)
      await recordBuildEvent('failure', 'Failed to dispatch job to agent')
    }
    
  } catch (error) {
    console.error('Execution dispatch error:', error)
    addExecutionResult(null, 'System', 'error', `Failed to start execution: ${error.message}`)
    
    await recordBuildEvent('failure', `Failed to dispatch job: ${error.message}`)
    await recordTerminalLog('error', `Execution dispatch failed: ${error.message}`, 'Run Graph')
  }
}

const cancelExecution = async () => {
  // Handle two scenarios:
  // 1. Local execution (started from this editor) - just stop the execution
  // 2. Agent execution (running job from cron/webhook/etc.) - send cancel to agent
  
  if (isJobRunningOnAgent.value && currentProjectJob.value) {
    // Scenario 2: Cancel job running on agent
    console.log('🛑 Cancelling job running on agent:', currentProjectJob.value)
    addExecutionResult(null, 'System', 'info', `Cancelling job ${currentProjectJob.value.jobId} on agent...`)
    
    try {
      const response = await $fetch(`/api/jobs/${currentProjectJob.value.jobId}/cancel`, {
        method: 'POST',
        body: {
          projectId: project.value.id,
          agentId: currentProjectJob.value.agentId,
          reason: 'Cancelled by user from editor'
        }
      })
      
      if (response.success) {
        addExecutionResult(null, 'System', 'warning', `Job cancellation sent to agent. Waiting for confirmation...`)
        
        // The job status will be updated via polling in setupJobStatusUpdates()
        // We don't immediately set isExecuting to false because we need to wait
        // for the agent to confirm the cancellation
        
        console.log('✅ Cancellation request sent to agent successfully')
      } else {
        addExecutionResult(null, 'System', 'error', `Failed to cancel job: ${response.message || 'Unknown error'}`)
        console.error('❌ Failed to cancel job on agent:', response)
      }
      
    } catch (error) {
      console.error('❌ Error cancelling job on agent:', error)
      addExecutionResult(null, 'System', 'error', `Error cancelling job: ${error.message}`)
    }
    
  } else if (isExecuting.value) {
    // Scenario 1: Cancel local execution (started from this editor)
    // Since isExecuting is computed from job state, we need to cancel through the job system
    console.log('🛑 Cancelling local execution')
    addExecutionResult(null, 'System', 'info', 'Cancellation requested by user...')
    
    // Record cancellation
    await recordTerminalLog('warning', 'Local execution cancelled by user', 'Cancel Execution')
    await recordBuildEvent('cancelled', 'Local execution cancelled by user')
    
    try {
      // If there's a current job, cancel it through the job system
      if (currentProjectJob.value) {
        const response = await $fetch(`/api/jobs/${currentProjectJob.value.jobId}/cancel`, {
          method: 'POST',
          body: {
            projectId: project.value.id,
            agentId: currentProjectJob.value.agentId,
            reason: 'Cancelled by user from editor'
          }
        })
        
        if (response.success) {
          addExecutionResult(null, 'System', 'warning', 'Job cancellation sent to agent. Waiting for confirmation...')
        } else {
          addExecutionResult(null, 'System', 'error', `Failed to cancel job: ${response.message || 'Unknown error'}`)
        }
      } else {
        // No job found, clear any local tracking
        activeJobs.value.clear()
        addExecutionResult(null, 'System', 'warning', 'Local execution cancelled by user')
      }
      
      console.log('✅ Local execution cancellation initiated')
      
    } catch (error) {
      console.error('Error during local cancellation:', error)
      addExecutionResult(null, 'System', 'error', `Cancellation error: ${error.message}`)
    }
  }
}

// Remove all the fake local execution functions - we don't need them anymore
// The terminal only shows real agent output

// Parameter substitution system (kept for graph analysis)
const getSocketInputValue = (nodeId, socketId, context) => {
  // Find the edge connected to this socket
  const edge = edges.value.find(e => e.target === nodeId && e.targetHandle === socketId)
  if (!edge) return undefined
  
  // Get the value from the source node
  const sourceNode = nodes.value.find(n => n.id === edge.source)
  if (!sourceNode) return undefined
  
  // For parameter nodes, return their configured value
  if (sourceNode.data.nodeType?.includes('-param')) {
    return getParameterValue(sourceNode)
  }
  
  // For other nodes, get their computed value from context
  return context.get(edge.source)
}

const getParameterValue = (paramNode) => {
  const nodeType = paramNode.data.nodeType
  const data = paramNode.data
  
  switch (nodeType) {
    case 'string-param':
    case 'text-param':
      return data.defaultValue || ''
    case 'choice-param':
      return data.defaultValue || (data.choices?.[0] || '')
    case 'boolean-param':
      return data.defaultValue || false
    case 'file-param':
      return data.defaultValue || ''
    default:
      return ''
  }
}

const substituteSocketPlaceholders = (text, nodeId, context) => {
  if (!text || typeof text !== 'string') return text
  
  // Find all socket placeholders in the format ${SOCKET_X_INPUT} or ${socketLabel}
  const socketPlaceholderRegex = /\$\{([^}]+)\}/g
  
  return text.replace(socketPlaceholderRegex, (match, placeholder) => {
    // Check if it's a socket reference
    if (placeholder.startsWith('SOCKET_') && placeholder.endsWith('_INPUT')) {
      // Extract socket index (SOCKET_1_INPUT -> 1)
      const socketIndex = parseInt(placeholder.match(/SOCKET_(\d+)_INPUT/)?.[1]) - 1
      if (socketIndex >= 0) {
        const node = nodes.value.find(n => n.id === nodeId)
        if (node && node.data.inputSockets && node.data.inputSockets[socketIndex]) {
          const socket = node.data.inputSockets[socketIndex]
          const value = getSocketInputValue(nodeId, socket.id, context)
          return value !== undefined ? String(value) : match
        }
      }
    } else {
      // Check if it's a socket label reference
      const node = nodes.value.find(n => n.id === nodeId)
      if (node && node.data.inputSockets) {
        const socket = node.data.inputSockets.find(s => s.label === placeholder)
        if (socket) {
          const value = getSocketInputValue(nodeId, socket.id, context)
          return value !== undefined ? String(value) : match
        }
      }
    }
    
    return match // Return original if no match found
  })
}

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

// Setup WebSocket connection when component mounts
const setupRealtimeConnection = async () => {
  try {
    // Initialize WebSocket connection if not already connected
    if (!webSocketStore.isConnected) {
      await webSocketStore.connect()
    }
    
    // Subscribe to project updates if we have a project
    if (project.value?.id) {
      await webSocketStore.subscribeToProject(project.value.id)
    }
    
    console.log('✅ Real-time connection established for editor')
  } catch (error) {
    console.error('❌ Failed to setup real-time connection:', error)
  }
}

// Initialize editor content
const initializeEditor = async () => {
  try {
    // Load existing diagram data if available
    if (project.value?.diagramData) {
      nodes.value = project.value.diagramData.nodes || []
      edges.value = project.value.diagramData.edges || []
      console.log(`📊 Loaded ${nodes.value.length} nodes and ${edges.value.length} edges`)
    } else {
      nodes.value = []
      edges.value = []
      console.log('📊 Starting with empty diagram')
    }
    
    isEditorReady.value = true
  } catch (error) {
    console.error('Error initializing editor:', error)
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
    await navigateTo('/')
    return
  }
  
  // Set current project
  projectsStore.setCurrentProject(project.value)
  
  // Set up real-time WebSocket updates (replaces all polling)
  await setupRealtimeConnection()
  
  // Initialize the editor
  await nextTick()
  await initializeEditor()
})

// Cleanup on unmount
onUnmounted(() => {
  cleanupRealtimeConnection()
})

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
    // Import croner dynamically since it's an ESM module
    const { Cron } = await import('croner')
    
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

// Computed property for cron information
const cronInfo = ref({ description: 'No cron expression configured', nextRun: null, isValid: false })

// Computed property for webhook URL
const webhookUrl = computed(() => {
  if (!selectedNode.value?.data?.customEndpoint) return ''
  if (typeof window === 'undefined') return `/api/webhook/${selectedNode.value.data.customEndpoint}`
  return `${window.location.origin}/api/webhook/${selectedNode.value.data.customEndpoint}`
})

// Watch for changes to selected node cron expression
watch(() => selectedNode.value?.data?.cronExpression, async (newExpression) => {
  if (newExpression && selectedNode.value?.data?.nodeType === 'cron') {
    cronInfo.value = await parseCronExpression(newExpression)
  } else {
    cronInfo.value = { description: 'No cron expression configured', nextRun: null, isValid: false }
  }
}, { immediate: true })

// Watch for job completion to finish build recording
watch(() => isJobRunningOnAgent.value, async (isRunning, wasRunning) => {
  // Detect when a job finishes (was running, now not running)
  if (wasRunning && !isRunning && currentBuildId) {
    console.log('🏁 Job execution completed, finishing build...')
    
    // Check the last few messages to determine success/failure
    const messages = currentProjectJob.value?.messages || []
    const lastMessages = messages.slice(-5) // Look at last 5 messages
    
    let buildStatus = 'success'
    let buildMessage = 'Build completed successfully'
    
    // Check for error indicators in recent messages
    const hasError = lastMessages.some(msg => 
      msg.type === 'error' || 
      (msg.message && msg.message.toLowerCase().includes('error')) ||
      (msg.message && msg.message.toLowerCase().includes('failed'))
    )
    
    if (hasError) {
      buildStatus = 'failure'
      buildMessage = 'Build completed with errors'
    }
    
    await finishBuild(buildStatus, buildMessage)
    await addBuildLog('info', `Build finished with status: ${buildStatus}`)
  }
}, { immediate: false })

// Cleanup function for component unmount
const cleanupRealtimeConnection = () => {
  if (project.value?.id) {
    webSocketStore.unsubscribeFromProject(project.value.id)
    console.log(`🔌 Editor unsubscribed from project ${project.value.id}`)
  }
}

// Initialize editor on mount
onMounted(async () => {
  console.log('🚀 Editor component mounting...')
  
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
    
    // Listen for real-time agent status updates
    if (typeof window !== 'undefined') {
      window.addEventListener('agentStatusUpdate', handleAgentStatusUpdate)
    }
  }
  
  // Check if project exists
  if (!project.value) {
    console.error('❌ Project not found, redirecting to home')
    await navigateTo('/')
    return
  }
  
  console.log(`📋 Editor loaded for project: ${project.value.name} (ID: ${project.value.id})`)
  
  // Set current project
  projectsStore.setCurrentProject(project.value)
  
  // Set up real-time WebSocket updates
  await setupRealtimeConnection()
  
  // Initialize the editor
  await nextTick()
  await initializeEditor()
  
  console.log('✅ Editor component fully initialized')
})

// Project status toggle function
const toggleProjectStatus = async () => {
  if (!project.value) return
  
  isTogglingStatus.value = true
  
  try {
    const result = await projectsStore.toggleProjectStatus(project.value.id)
    
    if (result.success) {
      console.log(`✅ Project ${result.status}: ${project.value.name}`)
      
      // Show notification in terminal
      addExecutionResult(null, 'System', 'info', `Project ${result.status === 'disabled' ? 'disabled' : 'enabled'} successfully`)
      
      // If project was disabled and jobs are running, cancel them
      if (result.status === 'disabled' && isExecuting.value) {
        await cancelExecution()
      }
    } else {
      console.error('Failed to toggle project status:', result.error)
      addExecutionResult(null, 'System', 'error', `Failed to ${project.value.status === 'disabled' ? 'enable' : 'disable'} project: ${result.error}`)
    }
  } catch (error) {
    console.error('Error toggling project status:', error)
    addExecutionResult(null, 'System', 'error', `Error changing project status: ${error.message}`)
  } finally {
    isTogglingStatus.value = false
  }
}

// Cleanup on unmount
onUnmounted(() => {
  console.log('🔌 Editor component unmounting...')
  cleanupRealtimeConnection()
  
  // Clean up agent status update listener
  if (typeof window !== 'undefined') {
    window.removeEventListener('agentStatusUpdate', handleAgentStatusUpdate)
  }
})
</script>

<style scoped>
/* Hide scrollbars on the page */
:deep(html), :deep(body) {
  overflow: hidden;
}

/* Ensure Vue Flow background is visible */
:deep(.vue-flow__background) {
  opacity: 1 !important;
  z-index: 0 !important;
}

/* Vue Flow Controls - Dark Mode */
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

/* Vue Flow Edges - Dark Mode */
:deep(.vue-flow__edge-path) {
  stroke: #737373;
}

:deep(.dark .vue-flow__edge-path) {
  stroke: #a3a3a3;
}

/* Vue Flow Edge Labels - Dark Mode */
:deep(.vue-flow__edge-text) {
  fill: #404040;
}

:deep(.dark .vue-flow__edge-text) {
  fill: #d4d4d4;
}

/* Vue Flow Nodes - Dark Mode */
:deep(.vue-flow__node) {
  color: #171717;
}

:deep(.dark .vue-flow__node) {
  color: #f5f5f5;
}

/* Vue Flow Selection Box - Dark Mode */
:deep(.vue-flow__selection) {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid #3b82f6;
}

:deep(.dark .vue-flow__selection) {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid #60a5fa;
}

/* Vue Flow Pane - Dark Mode */
:deep(.vue-flow__pane) {
  cursor: default;
}

/* Vue Flow Connection Line - Dark Mode */
:deep(.vue-flow__connection-line) {
  stroke: #737373;
}

:deep(.dark .vue-flow__connection-line) {
  stroke: #a3a3a3;
}

/* Vue Flow Attribution - Dark Mode */
:deep(.vue-flow__attribution) {
  background: rgba(255, 255, 255, 0.8);
  color: #404040;
}

:deep(.dark .vue-flow__attribution) {
  background: rgba(38, 38, 38, 0.8);
  color: #d4d4d4;
}

/* Style handles in custom nodes */
:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  border-radius: 50%;
}

:deep(.dark .vue-flow__handle) {
  border: 2px solid #404040;
}
</style>