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
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
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
                  <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
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
                  <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
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
                  <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
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
                  <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
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
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
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
                          <svg class="h-6 w-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
                          </svg>
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
                      <svg v-if="agent.platform === 'windows'" class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M0 3.449L9.75 2.1v9.451H0zm10.949-1.317L24 0v11.4H10.949zM0 12.6h9.75v9.451L0 20.699zm10.949 0H24V24l-13.051-1.351z"/>
                      </svg>
                      <svg v-else-if="agent.platform === 'linux'" class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 00-.402-.533 1.45 1.45 0 00-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 00.314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 01.647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69.176-.668.428-1.344.463-1.897.037-.714.076-1.335.195-1.814.12-.465.308-.797.641-.984l.045-.022zm-10.814.049h.01c.053 0 .105.005.157.014.376.055.706.333 1.023.752.317.334.616.777 1.028 1.003.264.135.394.333.482.599.09.333.13.732.144 1.08v.068a8.69 8.69 0 01-.145.75c-.06.4-.296.547-.741.548h-.729c-.465-.001-.57-.2-.506-.665.069-.4.243-.764.284-1.139.04-.4.04-.805-.02-1.271-.079-.4-.282-.732-.463-.995a1.05 1.05 0 00-.279-.333c-.063-.036-.11-.071-.134-.134a2.24 2.24 0 00-.062-.4c-.037-.135-.054-.335-.08-.465a.249.249 0 01.051-.012l.024.005zm9.09 0c.079.067.993.65 1.376 1.297.317.533.463 1.18.463 1.763v.059c-.004.4-.019.8-.11 1.137-.091.4-.23.734-.463.934-.618.4-1.34.202-1.433-.202-.054-.264.069-.52.16-.795.096-.333.202-.65.317-.966.12-.333.28-.727.368-1.163.094-.533.085-1.203-.044-1.68-.055-.2-.12-.334-.18-.4-.016-.016-.035-.033-.051-.05a.35.35 0 01.597.066z"/>
                      </svg>
                      <svg v-else-if="agent.platform === 'macos'" class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                      </svg>
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
                          <svg 
                            class="ml-1 w-3 h-3 transition-transform duration-200"
                            :class="{ 'rotate-180': expandedCapabilities.has(agent.id) }"
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
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
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </button>
                      <button
                        v-if="!agent.isLocal"
                        @click="confirmDeleteAgent(agent)"
                        class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        v-tooltip="'Delete agent'"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
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
            <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
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
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
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