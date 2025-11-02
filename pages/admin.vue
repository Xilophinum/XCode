<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Navigation -->
    <AppNavigation :breadcrumbs="['admin']">
      <template #actions>
        <span class="text-sm text-gray-600 dark:text-gray-300 bg-yellow-100 dark:bg-yellow-900/50 px-3 py-1 rounded-full">
          Admin Panel
        </span>
      </template>
    </AppNavigation>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-950 dark:text-white">Admin Panel</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-300">Manage system settings, environment variables, and security.</p>
      </div>

      <!-- Admin Sections -->
      <div class="space-y-8">
        
        <!-- System Settings Section -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div class="p-6">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-lg font-semibold text-gray-950 dark:text-white">System Settings</h2>
                <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">Configure application settings and preferences</p>
              </div>
            </div>
            
            <div v-if="loading" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <p class="text-gray-600 dark:text-gray-300 mt-2">Loading settings...</p>
            </div>
            
            <div v-else class="space-y-4">
              <!-- Settings by Category -->
              <div v-for="(settings, category) in groupedSystemSettings" :key="category" class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  @click="toggleCategory(category)"
                  class="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div class="flex items-center">
                    <h3 class="text-md font-medium text-gray-950 dark:text-white flex items-center">
                      <!-- Category Icons -->
                      <Icon v-if="category === 'branding'" name="music" class="w-5 h-5 mr-2 text-purple-600" />
                      <Icon v-else-if="category === 'security'" name="shield" class="w-5 h-5 mr-2 text-red-600" />
                      <Icon v-else-if="category === 'authentication'" name="users" class="w-5 h-5 mr-2 text-indigo-600" />
                      <Icon v-else-if="category === 'notifications'" name="bell" class="w-5 h-5 mr-2 text-blue-600" />
                      <Icon v-else-if="category === 'general'" name="settings" class="w-5 h-5 mr-2 text-green-600" />
                      <Icon v-else name="file-text" class="w-5 h-5 mr-2 text-gray-600" />
                      {{ getCategoryTitle(category) }}
                    </h3>
                  </div>
                  <Icon 
                    name="chevronDown"
                    :class="expandedCategories.has(category) ? 'rotate-180 w-5 h-5 text-gray-400 transition-transform duration-200' : 'w-5 h-5 text-gray-400 transition-transform duration-200'"
                  />
                </button>
                
                <div v-if="expandedCategories.has(category)" class="p-6 bg-white dark:bg-gray-800">
                
                <div class="grid grid-cols-1 gap-6">
                  <div v-for="setting in settings" :key="setting.key" class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div class="flex justify-between items-start mb-3">
                      <div class="flex-1">
                        <label :for="setting.key" class="block text-sm font-medium text-gray-950 dark:text-white">
                          {{ setting.label }}
                          <span v-if="setting.required === 'true'" class="text-red-500 ml-1">*</span>
                        </label>
                        <p v-if="setting.description" class="text-xs text-gray-600 dark:text-gray-400 mt-1">{{ setting.description }}</p>
                      </div>
                      <span v-if="setting.readonly === 'true'" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                        Read-only
                      </span>
                    </div>
                    
                    <!-- Setting Input based on type -->
                    <div class="mt-2">
                      <!-- Text Input -->
                      <input
                        v-if="setting.type === 'text'"
                        :id="setting.key"
                        v-model="setting.value"
                        :disabled="setting.readonly === 'true'"
                        type="text"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-950 dark:text-white"
                        @change="updateSetting(setting.key, setting.value)"
                      >
                      
                      <!-- Password Input -->
                      <input
                        v-else-if="setting.type === 'password'"
                        :id="setting.key"
                        v-model="setting.value"
                        :disabled="setting.readonly === 'true'"
                        type="password"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-950 dark:text-white"
                        @change="updateSetting(setting.key, setting.value)"
                      >
                      
                      <!-- Textarea -->
                      <textarea
                        v-else-if="setting.type === 'textarea'"
                        :id="setting.key"
                        v-model="setting.value"
                        :disabled="setting.readonly === 'true'"
                        v-auto-resize
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-950 dark:text-white resize-none overflow-hidden"
                        @change="updateSetting(setting.key, setting.value)"
                      ></textarea>
                      
                      <!-- Select Dropdown -->
                      <select
                        v-else-if="setting.type === 'select'"
                        :id="setting.key"
                        v-model="setting.value"
                        :disabled="setting.readonly === 'true'"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-950 dark:text-white"
                        @change="updateSetting(setting.key, setting.value)"
                      >
                        <option value="">Select...</option>
                        <option
                          v-for="option in JSON.parse(setting.options || '[]')"
                          :key="option"
                          :value="option"
                        >
                          {{ option }}
                        </option>
                      </select>
                      
                      <!-- Boolean Checkbox -->
                      <label
                        v-else-if="setting.type === 'boolean'"
                        class="flex items-center"
                      >
                        <input
                          :id="setting.key"
                          v-model="setting.value"
                          :disabled="setting.readonly === 'true'"
                          :true-value="'true'"
                          :false-value="'false'"
                          type="checkbox"
                          class="mr-2 rounded border-gray-300 dark:border-gray-600 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50 disabled:cursor-not-allowed dark:bg-gray-700"
                          @change="updateSetting(setting.key, setting.value)"
                        >
                        <span class="text-sm text-gray-700 dark:text-gray-300">Enable this setting</span>
                      </label>
                      
                      <!-- File Upload -->
                      <div v-else-if="setting.type === 'file'" class="space-y-2">
                        <input
                          :id="setting.key"
                          :disabled="setting.readonly === 'true'"
                          type="file"
                          accept="image/*"
                          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-950 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 dark:file:bg-purple-900 file:text-purple-700 dark:file:text-purple-300 hover:file:bg-purple-100 dark:hover:file:bg-purple-800"
                          @change="handleFileUpload(setting.key, $event)"
                        >
                        <div v-if="setting.value" class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                          <img :src="setting.value" alt="Preview" class="h-8 w-8 object-contain rounded">
                          <span>Current file uploaded</span>
                          <button
                            @click="updateSetting(setting.key, null)"
                            class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      
                      <!-- Number Input -->
                      <input
                        v-else-if="setting.type === 'number'"
                        :id="setting.key"
                        v-model="setting.value"
                        :disabled="setting.readonly === 'true'"
                        type="number"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-950 dark:text-white"
                        @change="updateSetting(setting.key, setting.value)"
                      >
                    </div>
                  </div>
                  
                  <!-- LDAP Test Section -->
                  <div v-if="category === 'authentication' && hasLdapSettings" class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                    <div class="flex items-center justify-between mb-4">
                      <h4 class="text-md font-medium text-gray-950 dark:text-white">LDAP Connection Test</h4>
                      <span v-if="ldapTestResult?.success" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        ✓ Last test successful
                      </span>
                      <span v-else-if="ldapTestResult && !ldapTestResult.success" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                        ✗ Last test failed
                      </span>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Username</label>
                        <input
                          v-model="ldapTestForm.username"
                          type="text"
                          placeholder="user@domain.com or username"
                          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
                        >
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Password</label>
                        <input
                          v-model="ldapTestForm.password"
                          type="password"
                          placeholder="Password"
                          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
                        >
                      </div>
                    </div>
                    
                    <div class="flex justify-between items-center">
                      <button
                        @click="testLdapConnection"
                        :disabled="!ldapTestForm.username || !ldapTestForm.password || ldapTesting"
                        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Icon name="loader" class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" />
                        {{ ldapTesting ? 'Testing...' : 'Test LDAP Connection' }}
                      </button>
                      
                      <div v-if="ldapTestResult" class="text-sm">
                        <span v-if="ldapTestResult.success" class="text-green-600 dark:text-green-400">
                          ✓ {{ ldapTestResult.message }}
                        </span>
                        <span v-else class="text-red-600 dark:text-red-400">
                          ✗ {{ ldapTestResult.message }}
                        </span>
                      </div>
                    </div>
                    
                    <div v-if="ldapTestResult?.success && ldapTestResult.user" class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                      <h5 class="text-sm font-medium text-green-800 dark:text-green-200 mb-2">User Information Retrieved:</h5>
                      <div class="text-xs text-green-700 dark:text-green-300 space-y-1">
                        <div><strong>DN:</strong> {{ ldapTestResult.user.dn }}</div>
                        <div><strong>Name:</strong> {{ ldapTestResult.user.name }}</div>
                        <div><strong>Email:</strong> {{ ldapTestResult.user.email }}</div>
                        <div v-if="ldapTestResult.user.groups?.length"><strong>Groups:</strong> {{ ldapTestResult.user.groups.join(', ') }}</div>
                      </div>
                    </div>
                    
                    <div v-if="ldapTestResult && !ldapTestResult.success" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                      <h5 class="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Error Details:</h5>
                      <div class="text-xs text-red-700 dark:text-red-300">{{ ldapTestResult.error }}</div>
                    </div>
                  </div>
                </div>
                </div>
              </div>
              
              <div v-if="Object.keys(groupedSystemSettings).length === 0" class="text-center py-8">
                <p class="text-gray-500 dark:text-gray-400">No system settings available</p>
              </div>
            </div>
          </div>
        </div>

        <!-- System Update Section -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div class="p-6">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-lg font-semibold text-gray-950 dark:text-white flex items-center">
                  <Icon name="refresh-cw" class="w-5 h-5 mr-2 text-blue-600" />
                  System Updates
                </h2>
                <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">Manage application updates from GitHub releases</p>
              </div>
              <button
                @click="checkForUpdates"
                :disabled="updateChecking"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="refresh-cw" :class="updateChecking ? 'animate-spin w-4 h-4 mr-2' : 'w-4 h-4 mr-2'" />
                Check for Updates
              </button>
            </div>

            <!-- Update Status -->
            <div v-if="updateInfo" class="space-y-4">
              <!-- Current Version -->
              <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Current Version</p>
                    <p class="text-lg font-semibold text-gray-950 dark:text-white mt-1">{{ updateInfo.currentVersion }}</p>
                  </div>
                  <div v-if="updateInfo.updateAvailable" class="text-right">
                    <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Latest Version</p>
                    <p class="text-lg font-semibold text-green-600 dark:text-green-400 mt-1">{{ updateInfo.latestVersion }}</p>
                  </div>
                </div>

                <!-- Last Check -->
                <p v-if="updateInfo.lastCheck" class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Last checked: {{ new Date(updateInfo.lastCheck).toLocaleString() }}
                </p>
              </div>

              <!-- Update Available -->
              <div v-if="updateInfo.updateAvailable" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div class="flex items-start">
                  <Icon name="check-circle" class="w-5 h-5 text-green-600 dark:text-green-400 mr-3 mt-0.5" />
                  <div class="flex-1">
                    <h3 class="text-sm font-medium text-green-900 dark:text-green-200">Update Available!</h3>
                    <p class="text-sm text-green-700 dark:text-green-300 mt-1">
                      A new version ({{ updateInfo.latestVersion }}) is available.
                    </p>

                    <!-- Release Notes -->
                    <div v-if="updateInfo.releaseNotes" class="mt-3">
                      <p class="text-xs font-medium text-green-900 dark:text-green-200 mb-1">Release Notes:</p>
                      <div class="bg-white dark:bg-gray-800 rounded p-3 text-xs text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                        <pre class="whitespace-pre-wrap">{{ updateInfo.releaseNotes }}</pre>
                      </div>
                    </div>

                    <!-- Update Options -->
                    <div class="mt-4 space-y-3">
                      <label class="flex items-start">
                        <input
                          v-model="waitForJobs"
                          type="checkbox"
                          class="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        >
                        <span class="ml-2 text-sm text-green-900 dark:text-green-200">
                          Wait for running builds to complete before updating
                          <span class="block text-xs text-green-700 dark:text-green-400 mt-1">
                            If unchecked, running builds will be paused and can resume after update
                          </span>
                        </span>
                      </label>

                      <button
                        @click="triggerUpdate"
                        :disabled="updateTriggering"
                        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Icon name="download" :class="updateTriggering ? 'animate-pulse w-4 h-4 mr-2' : 'w-4 h-4 mr-2'" />
                        {{ updateTriggering ? 'Initiating Update...' : 'Update Now' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- No Update Available -->
              <div v-else class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div class="flex items-center">
                  <Icon name="check-circle" class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" />
                  <div>
                    <h3 class="text-sm font-medium text-blue-900 dark:text-blue-200">Up to Date</h3>
                    <p class="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      You are running the latest version of XCode.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Loading State -->
            <div v-else-if="updateChecking" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <p class="text-gray-600 dark:text-gray-300 mt-2">Checking for updates...</p>
            </div>

            <!-- Initial State -->
            <div v-else class="text-center py-8">
              <Icon name="refresh-cw" class="mx-auto h-12 w-12 text-gray-400" />
              <p class="text-gray-600 dark:text-gray-300 mt-2">Click "Check for Updates" to see if a new version is available</p>
            </div>
          </div>
        </div>

        <!-- Agent Updates Section -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div class="p-6">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-lg font-semibold text-gray-950 dark:text-white flex items-center">
                  <Icon name="cpu" class="w-5 h-5 mr-2 text-green-600" />
                  Agent Updates
                </h2>
                <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">Manage build agent versions and updates</p>
              </div>
            </div>

            <!-- Agents List -->
            <div v-if="loadingAgents" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <p class="text-gray-600 dark:text-gray-300 mt-2">Loading agents...</p>
            </div>

            <div v-else-if="agents.length === 0" class="text-center py-8">
              <Icon name="cpu" class="mx-auto h-12 w-12 text-gray-400" />
              <p class="text-gray-600 dark:text-gray-300 mt-2">No agents registered</p>
            </div>

            <div v-else class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agent</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Current Version</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Auto Update</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Check</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  <tr v-for="agent in agents" :key="agent.id">
                    <td class="px-4 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full" :class="agent.status === 'online' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700'">
                          <Icon name="cpu" class="w-4 h-4" :class="agent.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'" />
                        </div>
                        <div class="ml-3">
                          <div class="text-sm font-medium text-gray-950 dark:text-white">{{ agent.name }}</div>
                          <div class="text-xs text-gray-500 dark:text-gray-400">{{ agent.platform }} ({{ agent.architecture }})</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-950 dark:text-white">{{ agent.agentVersion || agent.version || 'Unknown' }}</div>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap">
                      <span v-if="agent.updateAvailable === 'true'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                        <Icon name="alert-circle" class="w-3 h-3 mr-1" />
                        Update Available
                      </span>
                      <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        <Icon name="check-circle" class="w-3 h-3 mr-1" />
                        Up to Date
                      </span>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap">
                      <button
                        @click="toggleAgentAutoUpdate(agent)"
                        :disabled="updatingAgentSettings"
                        class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        :class="agent.autoUpdate === 'true' ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'"
                      >
                        <span class="sr-only">Enable auto-update</span>
                        <span
                          class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                          :class="agent.autoUpdate === 'true' ? 'translate-x-5' : 'translate-x-0'"
                        ></span>
                      </button>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span v-if="agent.lastVersionCheck">{{ formatDateTime(agent.lastVersionCheck) }}</span>
                      <span v-else class="text-gray-400 dark:text-gray-500">Never</span>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        v-if="agent.updateAvailable === 'true' && agent.status === 'online'"
                        @click="triggerAgentUpdate(agent)"
                        :disabled="updatingAgent === agent.id"
                        class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Icon v-if="updatingAgent === agent.id" name="refresh-cw" class="animate-spin w-3 h-3 mr-1" />
                        <span v-else>Update Now</span>
                      </button>
                      <span v-else-if="agent.status !== 'online'" class="text-gray-400 dark:text-gray-500 text-xs">Agent offline</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Latest Agent Version Info -->
            <div class="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div class="flex items-start">
                <Icon name="info" class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                <div class="flex-1">
                  <p class="text-sm font-medium text-blue-900 dark:text-blue-200">Latest Agent Version: {{ latestAgentVersion }}</p>
                  <p class="text-xs text-blue-700 dark:text-blue-300 mt-1">Agents with auto-update enabled will automatically download and install updates when available.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Notification Templates Section -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div class="p-6">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-lg font-semibold text-gray-950 dark:text-white">Notification Templates</h2>
                <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">Manage email, Slack, and webhook notification templates</p>
              </div>
              <button
                @click="showTemplateModal = true; editingTemplate = null"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
              >
                <Icon name="plus" class="w-5 h-5 mr-2" />
                Create Template
              </button>
            </div>

            <div v-if="loadingTemplates" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <p class="text-gray-600 dark:text-gray-300 mt-2">Loading templates...</p>
            </div>

            <div v-else-if="notificationTemplates.length === 0" class="text-center py-8">
              <Icon name="bell" class="mx-auto h-12 w-12 text-gray-400" />
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No notification templates found</p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Create your first template to get started</p>
            </div>

            <div v-else class="space-y-3">
              <div v-for="template in notificationTemplates" :key="template.id" class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <h3 class="text-md font-medium text-gray-950 dark:text-white">{{ template.name }}</h3>
                      <span v-if="template.is_built_in" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        Built-in
                      </span>
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" :class="{
                        'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200': template.type === 'email',
                        'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200': template.type === 'slack',
                        'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200': template.type === 'webhook'
                      }">
                        {{ template.type }}
                      </span>
                    </div>
                    <p v-if="template.description" class="text-sm text-gray-600 dark:text-gray-400">{{ template.description }}</p>
                    <div class="mt-2 text-xs text-gray-500 dark:text-gray-500">
                      Created {{ formatDate(template.created_at) }}
                    </div>
                  </div>
                  <div class="flex items-center gap-2 ml-4">
                    <button
                      v-if="!template.is_built_in"
                      @click="confirmDeleteTemplate(template)"
                      class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-md transition-colors"
                      v-tooltip="'Delete template'"
                    >
                      <Icon name="delete" class="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Environment Variables Section -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-950 dark:text-white">Environment Variables</h2>
              <button
                @click="showEnvModal = true"
                class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Icon name="plus" class="w-4 h-4 mr-2" />
                Add Variable
              </button>
            </div>
            
            <div class="space-y-3">
              <div v-if="envVariables.length === 0" class="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                No environment variables configured
              </div>
              <div
                v-for="variable in envVariables"
                :key="variable.id"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div class="flex-1">
                  <div class="font-medium text-sm text-gray-950 dark:text-white">{{ variable.key }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ variable.description || 'No description' }}</div>
                  <div class="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {{ variable.isSecret === 'true' ? '🔒 Secret' : 'Public' }}
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button
                    @click="editEnvVariable(variable)"
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    @click="confirmDeleteEnvVariable(variable)"
                    class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Credential Vault Section -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-950 dark:text-white">Credential Vault</h2>
              <div class="flex space-x-2">
                <select
                  v-model="credentialFilter"
                  class="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
                >
                  <option value="">All Types</option>
                  <option value="password">Password</option>
                  <option value="user_pass">Username + Password</option>
                  <option value="token">Token</option>
                  <option value="ssh_key">SSH Key</option>
                  <option value="certificate">Certificate</option>
                  <option value="file">File</option>
                  <option value="custom">Custom</option>
                </select>
                <button
                  @click="showCredentialModal = true"
                  class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                >
                  <Icon name="plus" class="w-4 h-4 mr-2" />
                  Add Credential
                </button>
              </div>
            </div>
            
            <div class="space-y-3">
              <div v-if="filteredCredentials.length === 0" class="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                {{ credentialFilter ? 'No credentials of this type' : 'No credentials stored' }}
              </div>
              <div
                v-for="credential in filteredCredentials"
                :key="credential.id"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <div class="font-medium text-sm text-gray-950 dark:text-white">{{ credential.name }}</div>
                    <span 
                      :class="getCredentialTypeColor(credential.type)"
                      class="px-2 py-1 text-xs font-medium rounded-full"
                    >
                      {{ getCredentialTypeLabel(credential.type) }}
                    </span>
                    <span v-if="credential.environment" class="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                      {{ credential.environment }}
                    </span>
                    <span v-if="!credential.isActive" class="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full">
                      Inactive
                    </span>
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {{ credential.description || 'No description' }}
                  </div>
                  <div v-if="credential.url" class="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {{ credential.url }}
                  </div>
                  <div v-if="credential.tags && credential.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
                    <span
                      v-for="tag in credential.tags"
                      :key="tag"
                      class="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button
                    @click="viewCredential(credential)"
                    class="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 text-sm"
                  >
                    View
                  </button>
                  <button
                    @click="editCredential(credential)"
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    @click="confirmDeleteCredential(credential)"
                    class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Groups Management Section -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-950 dark:text-white">Groups Management</h2>
              <button
                @click="showGroupModal = true"
                class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                <Icon name="plus" class="w-4 h-4 mr-2" />
                Create Group
              </button>
            </div>
            
            <div class="space-y-3">
              <div v-if="groups.length === 0" class="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                No groups created
              </div>
              <div
                v-for="group in groups"
                :key="group.id"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div class="flex-1">
                  <div class="font-medium text-sm text-gray-950 dark:text-white">{{ group.name }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ group.description || 'No description' }}</div>
                  <div class="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {{ group.memberCount || 0 }} members
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button
                    @click="editGroup(group)"
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    @click="confirmDeleteGroup(group)"
                    class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- User Management Section -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div class="p-6">
            <h2 class="text-lg font-semibold text-gray-950 dark:text-white mb-4">User Management</h2>
            
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  <tr v-for="user in users" :key="user.id">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center space-x-2">
                        <div class="text-sm font-medium text-gray-950 dark:text-white">{{ user.name }}</div>
                        <span v-if="user.userType === 'ldap'" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                          LDAP
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-950 dark:text-white">{{ user.email }}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center space-x-2">
                        <span :class="user.role === 'admin' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'" 
                              class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                          {{ user.role }}
                        </span>
                        <span v-if="user.isActive === 'false'" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                          Inactive
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {{ formatDate(user.createdAt) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex space-x-2">
                        <button
                          @click="confirmToggleUserRole(user)"
                          class="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          {{ user.role === 'admin' ? 'Make User' : 'Make Admin' }}
                        </button>
                        <button
                          v-if="user.userType !== 'ldap'"
                          @click="manageUserGroups(user)"
                          class="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300"
                        >
                          Groups
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Environment Variable Modal -->
    <ModalWrapper v-model="showEnvModal" class="max-w-md">
      <h3 class="text-lg font-bold text-gray-950 dark:text-white mb-4">
        {{ editingEnvVariable ? 'Edit Environment Variable' : 'Add Environment Variable' }}
      </h3>
      
      <form @submit.prevent="saveEnvVariable">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key</label>
          <input
            v-model="envForm.key"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
            placeholder="VARIABLE_NAME"
          >
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Value</label>
          <input
            v-model="envForm.value"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
            placeholder="Variable value"
          >
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
          <input
            v-model="envForm.description"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
            placeholder="Optional description"
          >
        </div>
        
        <div class="mb-6">
          <label class="flex items-center">
            <input
              v-model="envForm.isSecret"
              type="checkbox"
              class="rounded border-gray-300 dark:border-gray-600 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:bg-gray-700"
            >
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Mark as secret (value will be hidden)</span>
          </label>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="closeEnvModal"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {{ editingEnvVariable ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </ModalWrapper>

    <!-- Credential Modal -->
    <ModalWrapper v-model="showCredentialModal" class="max-w-md">
      <h3 class="text-lg font-bold text-gray-950 dark:text-white mb-4">
        {{ editingCredential ? 'Edit Credential' : 'Add Credential' }}
      </h3>
      
      <form @submit.prevent="saveCredential" class="space-y-4">
        <!-- Basic Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
            <input
              v-model="credentialForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
              placeholder="Credential name"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type *</label>
            <select
              v-model="credentialForm.type"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
            >
              <option value="password">Password Only</option>
              <option value="user_pass">Username + Password</option>
              <option value="token">Token/API Key</option>
              <option value="ssh_key">SSH Private Key</option>
              <option value="certificate">Certificate</option>
              <option value="file">File Upload</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            v-model="credentialForm.description"
            v-auto-resize
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none overflow-hidden"
            placeholder="Optional description"
          ></textarea>
        </div>

        <!-- Credential Fields (shown based on type) -->
        <div class="border-t pt-4">
          <h4 class="text-md font-medium text-gray-950 mb-3">Credential Data</h4>
          
          <!-- Username (for user_pass, ssh_key) -->
          <div v-if="['user_pass', 'ssh_key'].includes(credentialForm.type)" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              v-model="credentialForm.username"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Username"
            >
          </div>

          <!-- Password (for password, user_pass) -->
          <div v-if="['password', 'user_pass'].includes(credentialForm.type)" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              v-model="credentialForm.password"
              type="password"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Password"
            >
          </div>

          <!-- Token (for token) -->
          <div v-if="credentialForm.type === 'token'" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Token/API Key</label>
            <textarea
              v-model="credentialForm.token"
              v-auto-resize
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none overflow-hidden"
              placeholder="API token or key"
            ></textarea>
          </div>

          <!-- SSH Private Key (for ssh_key) -->
          <div v-if="credentialForm.type === 'ssh_key'" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">SSH Private Key</label>
            <textarea
              v-model="credentialForm.privateKey"
              v-auto-resize
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none overflow-hidden"
              placeholder="-----BEGIN PRIVATE KEY-----"
            ></textarea>
          </div>

          <!-- Certificate (for certificate) -->
          <div v-if="credentialForm.type === 'certificate'" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Certificate</label>
            <textarea
              v-model="credentialForm.certificate"
              v-auto-resize
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none overflow-hidden"
              placeholder="-----BEGIN CERTIFICATE-----"
            ></textarea>
          </div>

          <!-- File Upload (for file) -->
          <div v-if="credentialForm.type === 'file'" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">File Upload</label>
            <input
              type="file"
              @change="handleCredentialFileUpload"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
            <div v-if="credentialForm.fileName" class="mt-2 text-sm text-gray-600">
              Selected: {{ credentialForm.fileName }} ({{ credentialForm.fileMimeType }})
            </div>
          </div>
        </div>

        <!-- Additional Fields -->
        <div class="border-t pt-4">
          <h4 class="text-md font-medium text-gray-950 mb-3">Additional Information</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">URL</label>
              <input
                v-model="credentialForm.url"
                type="url"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="https://example.com"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Environment</label>
              <select
                v-model="credentialForm.environment"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Environment</option>
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
                <option value="testing">Testing</option>
              </select>
            </div>
          </div>

          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Expires At</label>
            <input
              v-model="credentialForm.expiresAt"
              type="datetime-local"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
          </div>

          <!-- Tags -->
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div class="flex flex-wrap gap-2 mb-2">
              <span
                v-for="(tag, index) in credentialForm.tags"
                :key="index"
                class="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
              >
                {{ tag }}
                <button
                  type="button"
                  @click="removeTag(index)"
                  class="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            </div>
            <div class="flex gap-2">
              <input
                v-model="newTag"
                type="text"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Add tag"
                @keyup.enter="addTag"
              >
              <button
                type="button"
                @click="addTag"
                class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          <!-- Custom Fields -->
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Custom Fields</label>
            <div class="space-y-2 mb-2">
              <div
                v-for="(value, key) in credentialForm.customFields"
                :key="key"
                class="flex items-center gap-2 p-2 bg-gray-50 rounded"
              >
                <span class="font-medium text-sm">{{ key }}:</span>
                <span class="text-sm">{{ value }}</span>
                <button
                  type="button"
                  @click="removeCustomField(key)"
                  class="text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <input
                v-model="newCustomFieldKey"
                type="text"
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Field name"
              >
              <input
                v-model="newCustomFieldValue"
                type="text"
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Field value"
              >
              <button
                type="button"
                @click="addCustomField"
                class="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Add Field
              </button>
            </div>
          </div>

          <!-- Active Status -->
          <div class="mt-4">
            <label class="flex items-center">
              <input
                v-model="credentialForm.isActive"
                type="checkbox"
                class="mr-2"
              >
              <span class="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            @click="closeCredentialModal"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            {{ editingCredential ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </ModalWrapper>

    <!-- Credential View Modal -->
    <ModalWrapper v-model="showCredentialViewModal" class="max-w-2xl">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold text-gray-950 dark:text-white">View Credential</h3>
        <button
          @click="closeCredentialViewModal"
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ×
        </button>
      </div>
      
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <p class="mt-1 text-sm text-gray-950">{{ viewingCredential.name }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Type</label>
            <span 
              :class="getCredentialTypeColor(viewingCredential.type)"
              class="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full"
            >
              {{ getCredentialTypeLabel(viewingCredential.type) }}
            </span>
          </div>
        </div>

        <div v-if="viewingCredential.description">
          <label class="block text-sm font-medium text-gray-700">Description</label>
          <p class="mt-1 text-sm text-gray-950">{{ viewingCredential.description }}</p>
        </div>

        <!-- Credential Data (masked for security) -->
        <div class="border-t pt-4">
          <h4 class="text-md font-medium text-gray-950 mb-3">Credential Data</h4>
          
          <div v-if="viewingCredential.username" class="mb-2">
            <label class="block text-sm font-medium text-gray-700">Username</label>
            <p class="mt-1 text-sm font-mono bg-gray-50 p-2 rounded">{{ viewingCredential.username }}</p>
          </div>

          <div v-if="viewingCredential.password" class="mb-2">
            <label class="block text-sm font-medium text-gray-700">Password</label>
            <p class="mt-1 text-sm font-mono bg-gray-50 p-2 rounded">••••••••••••</p>
          </div>

          <div v-if="viewingCredential.token" class="mb-2">
            <label class="block text-sm font-medium text-gray-700">Token</label>
            <p class="mt-1 text-sm font-mono bg-gray-50 p-2 rounded">{{ viewingCredential.token.substring(0, 20) }}...</p>
          </div>

          <div v-if="viewingCredential.fileName" class="mb-2">
            <label class="block text-sm font-medium text-gray-700">File</label>
            <p class="mt-1 text-sm bg-gray-50 p-2 rounded">{{ viewingCredential.fileName }} ({{ viewingCredential.fileMimeType }})</p>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="border-t pt-4">
          <h4 class="text-md font-medium text-gray-950 mb-3">Additional Information</h4>
          
          <div class="grid grid-cols-2 gap-4">
            <div v-if="viewingCredential.url">
              <label class="block text-sm font-medium text-gray-700">URL</label>
              <a :href="viewingCredential.url" target="_blank" class="mt-1 text-sm text-blue-600 hover:text-blue-800">
                {{ viewingCredential.url }}
              </a>
            </div>
            
            <div v-if="viewingCredential.environment">
              <label class="block text-sm font-medium text-gray-700">Environment</label>
              <span class="mt-1 inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {{ viewingCredential.environment }}
              </span>
            </div>
          </div>

          <div v-if="viewingCredential.tags && viewingCredential.tags.length > 0" class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="tag in viewingCredential.tags"
                :key="tag"
                class="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <div v-if="Object.keys(viewingCredential.customFields || {}).length > 0" class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Custom Fields</label>
            <div class="space-y-1">
              <div
                v-for="(value, key) in viewingCredential.customFields"
                :key="key"
                class="flex gap-2 text-sm"
              >
                <span class="font-medium">{{ key }}:</span>
                <span>{{ value }}</span>
              </div>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
              <label class="block font-medium">Created</label>
              <p>{{ formatDate(viewingCredential.createdAt) }}</p>
            </div>
            <div v-if="viewingCredential.expiresAt">
              <label class="block font-medium">Expires</label>
              <p>{{ formatDate(viewingCredential.expiresAt) }}</p>
            </div>
          </div>
        </div>
      </div>
    </ModalWrapper>

    <!-- Group Modal -->
    <ModalWrapper v-model="showGroupModal" class="max-w-md">
      <div class="m-4">
        <h3 class="text-lg font-bold text-gray-950 dark:text-white mb-4">
          {{ editingGroup ? 'Edit Group' : 'Create Group' }}
        </h3>
        
        <form @submit.prevent="saveGroup">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
            <input
              v-model="groupForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
              placeholder="Group name"
            >
          </div>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              v-model="groupForm.description"
              v-auto-resize
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white resize-none overflow-hidden"
              placeholder="Optional description"
            ></textarea>
          </div>
          
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="closeGroupModal"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              {{ editingGroup ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>

    <!-- User Groups Modal -->
    <ModalWrapper v-model="showUserGroupsModal" class="max-w-lg">
      <div class="m-4">
        <h3 class="text-lg font-bold text-gray-950 dark:text-white mb-4">
          Manage Groups - {{ selectedUser?.name }}
        </h3>
        
        <form @submit.prevent="saveUserGroups">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">User Groups</label>
            
            <!-- Current Groups -->
            <div v-if="userGroupForm.groups.length > 0" class="mb-3">
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="(group, index) in userGroupForm.groups"
                  :key="index"
                  class="inline-flex items-center px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full"
                >
                  {{ group }}
                  <button
                    type="button"
                    @click="removeUserGroup(index)"
                    class="ml-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
                  >
                    ×
                  </button>
                </span>
              </div>
            </div>
            
            <!-- Available Groups -->
            <div v-if="availableGroupsForUser.length > 0">
              <select
                @change="addUserGroup($event.target.value); $event.target.value = ''"
                class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
              >
                <option value="">Select a group to add...</option>
                <option
                  v-for="group in availableGroupsForUser"
                  :key="group.name"
                  :value="group.name"
                >
                  {{ group.name }}
                </option>
              </select>
            </div>
            
            <p v-else class="text-sm text-gray-500 dark:text-gray-400 mt-2">
              No additional groups available.
            </p>
          </div>
          
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="closeUserGroupsModal"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              Update Groups
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>

    <!-- Notification Template Modal -->
    <ModalWrapper v-model="showTemplateModal" class="max-w-2xl">
      <div class="m-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-950 dark:text-white">
            {{ editingTemplate ? 'Edit' : 'Create' }} Notification Template
          </h3>
          <button @click="closeTemplateModal" class="text-gray-400 hover:text-gray-500">
            <Icon name="close" class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="saveTemplate" class="space-y-4">
          <!-- Template Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name *</label>
            <input
              v-model="templateForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Production Deploy Success"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <input
              v-model="templateForm.description"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Brief description of this template"
            />
          </div>

          <!-- Template Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notification Type *</label>
            <select
              v-model="templateForm.type"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="email">Email</option>
              <option value="slack">Slack</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>

          <!-- Email Fields -->
          <div v-if="templateForm.type === 'email'" class="space-y-3 pt-2 border-t dark:border-gray-700">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Subject *</label>
              <input
                v-model="templateForm.email_subject"
                type="text"
                :required="templateForm.type === 'email'"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., [$ProjectName] Build #$BuildNumber - $Status"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Body *</label>
              <textarea
                v-model="templateForm.email_body"
                :required="templateForm.type === 'email'"
                v-auto-resize
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-none overflow-hidden"
                placeholder="Build $BuildNumber completed at $TimestampHuman"
              ></textarea>
            </div>
            <div class="flex items-center">
              <input
                v-model="templateForm.email_html"
                type="checkbox"
                id="template-html"
                class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label for="template-html" class="ml-2 text-sm text-gray-700 dark:text-gray-300">Send as HTML</label>
            </div>
          </div>

          <!-- Slack Fields -->
          <div v-if="templateForm.type === 'slack'" class="space-y-3 pt-2 border-t dark:border-gray-700">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slack Message Mode</label>
              <select
                v-model="templateForm.slack_mode"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="simple">Simple Text Message</option>
                <option value="blocks">Block Kit (Rich Formatting)</option>
              </select>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Block Kit enables rich, interactive messages with buttons, images, and structured layouts
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Slack Message {{ templateForm.slack_mode === 'simple' ? '*' : '(Fallback Text)' }}
              </label>
              <textarea
                v-model="templateForm.slack_message"
                :required="templateForm.type === 'slack'"
                v-auto-resize
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-none overflow-hidden"
                placeholder=":white_check_mark: *$ProjectName* - Build #$BuildNumber Success"
              ></textarea>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ templateForm.slack_mode === 'blocks' ? 'Used as fallback text for notifications when blocks cannot be displayed' : 'Simple markdown-formatted text message' }}
              </p>
            </div>

            <div v-if="templateForm.slack_mode === 'blocks'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slack Blocks (JSON)</label>
              <textarea
                v-model="templateForm.slack_blocks"
                v-auto-resize
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs resize-none overflow-hidden"
                placeholder='[{"type":"header","text":{"type":"plain_text","text":"Build Complete"}}]'
              ></textarea>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                JSON array of Slack Block Kit blocks. <a href="https://app.slack.com/block-kit-builder" target="_blank" class="text-purple-600 dark:text-purple-400 hover:underline">Use Block Kit Builder</a> to design your layout.
              </p>
            </div>
          </div>

          <!-- Webhook Fields -->
          <div v-if="templateForm.type === 'webhook'" class="space-y-3 pt-2 border-t dark:border-gray-700">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HTTP Method</label>
              <select
                v-model="templateForm.webhook_method"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="GET">GET</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Headers (JSON)</label>
              <textarea
                v-model="templateForm.webhook_headers"
                v-auto-resize
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-none overflow-hidden"
                placeholder='{"Content-Type": "application/json"}'
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body (JSON) *</label>
              <textarea
                v-model="templateForm.webhook_body"
                :required="templateForm.type === 'webhook'"
                v-auto-resize
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-none overflow-hidden"
                placeholder='{"project": "$ProjectName", "buildNumber": "$BuildNumber"}'
              ></textarea>
            </div>
          </div>

          <!-- Variable Reference -->
          <div class="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg text-xs">
            <div class="font-medium text-purple-800 dark:text-purple-200 mb-2">Available Variables:</div>
            <div class="text-purple-700 dark:text-purple-300 space-x-2">
              <code>$ProjectName</code>
              <code>$BuildNumber</code>
              <code>$Status</code>
              <code>$ExitCode</code>
              <code>$FailedNodeLabel</code>
              <code>$Output</code>
              <code>$Timestamp</code>
              <code>$TimestampHuman</code>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              @click="closeTemplateModal"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              {{ editingTemplate ? 'Update' : 'Create' }} Template
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import Icon from '~/components/Icon.vue'
import ModalWrapper from '~/components/ModalWrapper.vue'
const logger = useLogger()
const { success, error: notifyError } = useNotifications()
definePageMeta({
  middleware: 'admin'
})

// Data
const envVariables = ref([])
const storedCredentials = ref({
  success: false,
  credentials: []
})
const systemSettings = ref({})
const groupedSystemSettings = ref({})
const users = ref([])
const groups = ref([])
const loading = ref(false)

// Update-related state
const updateInfo = ref(null)
const updateChecking = ref(false)
const updateTriggering = ref(false)
const waitForJobs = ref(false)

// Agent update-related state
const agents = ref([])
const loadingAgents = ref(false)
const updatingAgent = ref(null)
const updatingAgentSettings = ref(false)
const latestAgentVersion = ref('1.0.0')

// Filter state
const credentialFilter = ref('')

// Computed for filtered credentials
const filteredCredentials = computed(() => {
  if (!credentialFilter.value) return storedCredentials.value.credentials
  return storedCredentials.value.credentials.filter(cred => cred.type === credentialFilter.value)
})

// Check if LDAP settings exist
const hasLdapSettings = computed(() => {
  return Object.values(groupedSystemSettings.value).some(category => 
    category.some(setting => setting.category === 'authentication')
  )
})

// Modal states
const showEnvModal = ref(false)
const showCredentialModal = ref(false)
const showCredentialViewModal = ref(false)
const showSettingsModal = ref(false)
const showGroupModal = ref(false)
const showUserGroupsModal = ref(false)
const showTemplateModal = ref(false)

// Editing states
const editingEnvVariable = ref(null)
const editingCredential = ref(null)
const editingSystemSetting = ref(null)
const viewingCredential = ref(null)
const editingGroup = ref(null)
const selectedUser = ref(null)
const editingTemplate = ref(null)

// Template data
const notificationTemplates = ref([])
const loadingTemplates = ref(false)

// Form data
const envForm = ref({
  key: '',
  value: '',
  description: '',
  isSecret: false
})

const credentialForm = ref({
  name: '',
  type: 'password',
  description: '',
  username: '',
  password: '',
  token: '',
  privateKey: '',
  certificate: '',
  file: null,
  fileName: '',
  fileMimeType: '',
  url: '',
  environment: '',
  tags: [],
  customFields: {},
  expiresAt: '',
  isActive: true
})

const newTag = ref('')
const newCustomFieldKey = ref('')
const newCustomFieldValue = ref('')

const groupForm = ref({
  name: '',
  description: ''
})

const userGroupForm = ref({
  groups: []
})

const templateForm = ref({
  name: '',
  description: '',
  type: 'email',
  email_subject: '',
  email_body: '',
  email_html: false,
  slack_message: '',
  slack_blocks: '',
  slack_mode: 'simple',
  webhook_method: 'POST',
  webhook_headers: '{"Content-Type": "application/json"}',
  webhook_body: ''
})

const availableGroupsForUser = computed(() => {
  return groups.value.filter(group => !userGroupForm.value.groups.includes(group.name))
})

// LDAP test state
const ldapTestForm = ref({
  username: '',
  password: ''
})
const ldapTesting = ref(false)
const ldapTestResult = ref(null)

// Category expansion state
const expandedCategories = ref(new Set(['branding']))

const systemSettingsForm = ref({
  category: '',
  key: '',
  value: '',
  description: ''
})

// Methods
const loadEnvVariables = async () => {
  try {
    const data = await $fetch('/api/admin/env-variables')
    envVariables.value = data
  } catch (error) {
    logger.error('Failed to load environment variables:', error)
  }
}

const loadCredentials = async () => {
  try {
    const data = await $fetch('/api/admin/credentials')
    storedCredentials.value = data
  } catch (error) {
    logger.error('Failed to load credentials:', error)
  }
}

const loadUsers = async () => {
  try {
    const data = await $fetch('/api/admin/users')
    users.value = data
  } catch (error) {
    logger.error('Failed to load users:', error)
  }
}

const loadGroups = async () => {
  try {
    const [settings, users] = await Promise.all([
      $fetch('/api/admin/system-settings'),
      $fetch('/api/admin/users')
    ])
    
    const groupsSetting = Object.values(settings).flat().find(s => s.key === 'user_groups')
    if (groupsSetting?.value) {
      const groupNames = JSON.parse(groupsSetting.value)
      groups.value = groupNames.map((name, index) => {
        const memberCount = users.filter(user => {
          if (!user.groups) return false
          const userGroups = user.groups.split(',').map(g => g.trim()).filter(g => g)
          return userGroups.includes(name)
        }).length
        return { id: index, name, memberCount }
      })
    } else {
      groups.value = []
    }
  } catch (error) {
    logger.error('Failed to load groups:', error)
  }
}

const saveEnvVariable = async () => {
  try {
    if (editingEnvVariable.value) {
      await $fetch(`/api/admin/env-variables/${editingEnvVariable.value.id}`, {
        method: 'PUT',
        body: envForm.value
      })
    } else {
      await $fetch('/api/admin/env-variables', {
        method: 'POST',
        body: envForm.value
      })
    }
    closeEnvModal()
    await loadEnvVariables()
  } catch (error) {
    logger.error('Failed to save environment variable:', error)
  }
}

const editEnvVariable = (variable) => {
  editingEnvVariable.value = variable
  envForm.value = {
    key: variable.key,
    value: variable.value === '***HIDDEN***' ? '' : variable.value,
    description: variable.description,
    isSecret: variable.isSecret === 'true'
  }
  showEnvModal.value = true
}

// Delete confirmation modal states
const showDeleteEnvModal = ref(false)
const envToDelete = ref(null)

const confirmDeleteEnvVariable = (variable) => {
  envToDelete.value = variable
  showDeleteEnvModal.value = true
}

const deleteEnvVariable = async () => {
  if (!envToDelete.value) return
  
  try {
    await $fetch(`/api/admin/env-variables/${envToDelete.value.id}`, {
      method: 'DELETE'
    })
    success('Environment variable deleted successfully')
    showDeleteEnvModal.value = false
    envToDelete.value = null
    await loadEnvVariables()
  } catch (error) {
    logger.error('Failed to delete environment variable:', error)
    notifyError('Failed to delete environment variable')
  }
}

const cancelDeleteEnvVariable = () => {
  showDeleteEnvModal.value = false
  envToDelete.value = null
}

const closeEnvModal = () => {
  showEnvModal.value = false
  editingEnvVariable.value = null
  envForm.value = {
    key: '',
    value: '',
    description: '',
    isSecret: false
  }
}

// System Settings methods
const loadSystemSettings = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/admin/system-settings')
    groupedSystemSettings.value = data
  } catch (error) {
    logger.error('Failed to load system settings:', error)
    // Initialize system settings if they don't exist
    try {
      await $fetch('/api/admin/system-settings', { method: 'POST' })
      const data = await $fetch('/api/admin/system-settings')
      groupedSystemSettings.value = data
    } catch (initError) {
      logger.error('Failed to initialize system settings:', initError)
    }
  } finally {
    loading.value = false
  }
}

// Update Functions
const checkForUpdates = async () => {
  updateChecking.value = true
  try {
    const response = await $fetch('/api/admin/system/update/check')
    if (response.success) {
      updateInfo.value = response
      if (response.updateAvailable) {
        success(`Update available: ${response.latestVersion}`)
      } else {
        success('You are running the latest version')
      }
    } else {
      notifyError('Failed to check for updates')
    }
  } catch (error) {
    logger.error('Failed to check for updates:', error)
    notifyError('Failed to check for updates')
  } finally {
    updateChecking.value = false
  }
}

const triggerUpdate = async () => {
  if (!confirm(`Are you sure you want to update to version ${updateInfo.value.latestVersion}? The server will restart during this process.`)) {
    return
  }

  updateTriggering.value = true
  try {
    const response = await $fetch('/api/admin/system/update/trigger', {
      method: 'POST',
      body: {
        waitForJobs: waitForJobs.value
      }
    })

    if (response.success) {
      success('Update initiated. Server will restart shortly...')

      // Show a countdown notification
      let countdown = 10
      const countdownInterval = setInterval(() => {
        if (countdown > 0) {
          notifyError(`Server restarting in ${countdown} seconds...`)
          countdown--
        } else {
          clearInterval(countdownInterval)
        }
      }, 1000)
    } else {
      notifyError(response.error || 'Failed to trigger update')
      updateTriggering.value = false
    }
  } catch (error) {
    logger.error('Failed to trigger update:', error)
    notifyError('Failed to trigger update')
    updateTriggering.value = false
  }
}

const updateSetting = async (key, value) => {
  try {
    await $fetch(`/api/admin/system-settings/${key}`, {
      method: 'PUT',
      body: { value }
    })
    
    // Update all existing cron jobs when timezone changes
    if (key === 'cron_timezone') {
      try {
        await $fetch('/api/cron/update-timezone', {
          method: 'POST'
        })
        logger.info(`🌍 Updated timezone for all cron jobs to: ${value}`)
      } catch (error) {
        logger.error('Failed to update cron job timezones:', error)
      }
    }
    
    // Reload navigation if branding settings changed
    if (key === 'brand_name' || key === 'app_logo') {
      // Trigger a refresh of the navigation component
      await nextTick()
      window.location.reload()
    }
    if (key === 'log_level') {
      logger.setLevel(value)
    }
  } catch (error) {
    logger.error('Failed to update system setting:', error)
  }
}

const handleFileUpload = async (key, event) => {
  const file = event.target.files[0]
  if (file) {
    // Convert file to base64 data URL
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target.result
      await updateSetting(key, dataUrl)
      
      // Update the local value
      Object.values(groupedSystemSettings.value).forEach(category => {
        const setting = category.find(s => s.key === key)
        if (setting) {
          setting.value = dataUrl
        }
      })
    }
    reader.readAsDataURL(file)
  }
}

const getCategoryTitle = (category) => {
  const titles = {
    'branding': 'Branding & Appearance',
    'general': 'General Settings',
    'security': 'Security Settings',
    'authentication': 'Authentication & LDAP',
    'notifications': 'Notification Settings',
    'system': 'System Information'
  }
  return titles[category] || category.charAt(0).toUpperCase() + category.slice(1)
}

// Credential utility methods
const getCredentialTypeLabel = (type) => {
  const labels = {
    'password': 'Password',
    'user_pass': 'User + Pass',
    'token': 'Token',
    'ssh_key': 'SSH Key',
    'certificate': 'Certificate',
    'file': 'File',
    'custom': 'Custom'
  }
  return labels[type] || type
}

const getCredentialTypeColor = (type) => {
  const colors = {
    'password': 'bg-red-100 text-red-800',
    'user_pass': 'bg-blue-100 text-blue-800',
    'token': 'bg-green-100 text-green-800',
    'ssh_key': 'bg-purple-100 text-purple-800',
    'certificate': 'bg-yellow-100 text-yellow-800',
    'file': 'bg-gray-100 text-gray-800',
    'custom': 'bg-indigo-100 text-indigo-800'
  }
  return colors[type] || 'bg-gray-100 text-gray-800'
}

const resetCredentialForm = () => {
  credentialForm.value = {
    name: '',
    type: 'password',
    description: '',
    username: '',
    password: '',
    token: '',
    privateKey: '',
    certificate: '',
    file: null,
    fileName: '',
    fileMimeType: '',
    url: '',
    environment: '',
    tags: [],
    customFields: {},
    expiresAt: '',
    isActive: true
  }
}

const addTag = () => {
  if (newTag.value.trim() && !credentialForm.value.tags.includes(newTag.value.trim())) {
    credentialForm.value.tags.push(newTag.value.trim())
    newTag.value = ''
  }
}

const removeTag = (index) => {
  credentialForm.value.tags.splice(index, 1)
}

const addCustomField = () => {
  if (newCustomFieldKey.value.trim() && newCustomFieldValue.value.trim()) {
    credentialForm.value.customFields[newCustomFieldKey.value.trim()] = newCustomFieldValue.value.trim()
    newCustomFieldKey.value = ''
    newCustomFieldValue.value = ''
  }
}

const removeCustomField = (key) => {
  delete credentialForm.value.customFields[key]
}

const handleCredentialFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    credentialForm.value.fileName = file.name
    credentialForm.value.fileMimeType = file.type
    
    const reader = new FileReader()
    reader.onload = (e) => {
      credentialForm.value.fileData = e.target.result.split(',')[1] // Remove data:type;base64, prefix
    }
    reader.readAsDataURL(file)
  }
}

const saveCredential = async () => {
  try {
    if (editingCredential.value) {
      await $fetch(`/api/admin/credentials/${editingCredential.value.id}`, {
        method: 'PUT',
        body: credentialForm.value
      })
    } else {
      await $fetch('/api/admin/credentials', {
        method: 'POST',
        body: credentialForm.value
      })
    }
    closeCredentialModal()
    await loadCredentials()
  } catch (error) {
    logger.error('Failed to save credential:', error)
  }
}

const viewCredential = async (credential) => {
  try {
    // Fetch full credential data with decrypted values
    const fullCredential = await $fetch(`/api/admin/credentials/${credential.id}`)
    viewingCredential.value = fullCredential
    showCredentialViewModal.value = true
  } catch (error) {
    logger.error('Failed to load credential details:', error)
  }
}

const editCredential = async (credential) => {
  try {
    // Fetch full credential data for editing
    const fullCredential = await $fetch(`/api/admin/credentials/${credential.id}`)
    editingCredential.value = fullCredential
    credentialForm.value = { ...fullCredential }
    showCredentialModal.value = true
  } catch (error) {
    logger.error('Failed to load credential for editing:', error)
  }
}

const showDeleteCredentialModal = ref(false)
const credentialToDelete = ref(null)

const confirmDeleteCredential = (credential) => {
  credentialToDelete.value = credential
  showDeleteCredentialModal.value = true
}

const deleteCredential = async () => {
  if (!credentialToDelete.value) return
  
  try {
    await $fetch(`/api/admin/credentials/${credentialToDelete.value.id}`, {
      method: 'DELETE'
    })
    success('Credential deleted successfully')
    showDeleteCredentialModal.value = false
    credentialToDelete.value = null
    await loadCredentials()
  } catch (error) {
    logger.error('Failed to delete credential:', error)
    notifyError('Failed to delete credential')
  }
}

const cancelDeleteCredential = () => {
  showDeleteCredentialModal.value = false
  credentialToDelete.value = null
}

const closeCredentialModal = () => {
  showCredentialModal.value = false
  editingCredential.value = null
  resetCredentialForm()
}

const closeCredentialViewModal = () => {
  showCredentialViewModal.value = false
  viewingCredential.value = null
}

const showRoleChangeModal = ref(false)
const userForRoleChange = ref(null)

const confirmToggleUserRole = (user) => {
  userForRoleChange.value = user
  showRoleChangeModal.value = true
}

const toggleUserRole = async () => {
  if (!userForRoleChange.value) return
  
  const newRole = userForRoleChange.value.role === 'admin' ? 'user' : 'admin'
  
  try {
    await $fetch('/api/admin/update-user-role', {
      method: 'POST',
      body: { userId: userForRoleChange.value.id, role: newRole }
    })
    success(`User role changed to ${newRole} successfully`)
    showRoleChangeModal.value = false
    userForRoleChange.value = null
    await loadUsers()
  } catch (error) {
    logger.error('Failed to update user role:', error)
    notifyError('Failed to update user role')
  }
}

const cancelRoleChange = () => {
  showRoleChangeModal.value = false
  userForRoleChange.value = null
}

const toggleCategory = (category) => {
  if (expandedCategories.value.has(category)) {
    expandedCategories.value.delete(category)
  } else {
    expandedCategories.value.add(category)
  }
}

// LDAP test methods
const testLdapConnection = async () => {
  ldapTesting.value = true
  ldapTestResult.value = null
  
  try {
    // Get current LDAP settings
    const authSettings = groupedSystemSettings.value.authentication || []
    const config = {
      url: authSettings.find(s => s.key === 'ldap_url')?.value,
      bindDN: authSettings.find(s => s.key === 'ldap_bind_dn')?.value,
      bindPassword: authSettings.find(s => s.key === 'ldap_bind_password')?.value,
      userSearchBase: authSettings.find(s => s.key === 'ldap_user_search_base')?.value,
      userSearchFilter: authSettings.find(s => s.key === 'ldap_user_search_filter')?.value,
      timeout: parseInt(authSettings.find(s => s.key === 'ldap_timeout')?.value || '5000'),
      useTLS: authSettings.find(s => s.key === 'ldap_use_tls')?.value === 'true',
      tlsCertificate: authSettings.find(s => s.key === 'ldap_tls_certificate')?.value
    }
    
    const result = await $fetch('/api/admin/ldap/test', {
      method: 'POST',
      body: {
        username: ldapTestForm.value.username,
        password: ldapTestForm.value.password,
        config
      }
    })
    
    ldapTestResult.value = result
    
    // Clear password after test
    ldapTestForm.value.password = ''
  } catch (error) {
    logger.error('LDAP test failed:', error)
    ldapTestResult.value = {
      success: false,
      message: 'Test failed',
      error: error.message || 'Unknown error'
    }
  } finally {
    ldapTesting.value = false
  }
}

// Group management methods
const saveGroup = async () => {
  try {
    const currentGroups = groups.value.map(g => g.name)
    let updatedGroups
    
    if (editingGroup.value) {
      updatedGroups = currentGroups.map(name => name === editingGroup.value.name ? groupForm.value.name : name)
    } else {
      updatedGroups = [...currentGroups, groupForm.value.name]
    }
    
    await $fetch('/api/admin/system-settings/user_groups', {
      method: 'PUT',
      body: { value: JSON.stringify(updatedGroups) }
    })
    
    closeGroupModal()
    await loadGroups()
    await loadUsers()
  } catch (error) {
    logger.error('Failed to save group:', error)
  }
}

const editGroup = (group) => {
  editingGroup.value = group
  groupForm.value = {
    name: group.name,
    description: group.description
  }
  showGroupModal.value = true
}

const showDeleteGroupModal = ref(false)
const groupToDelete = ref(null)

const confirmDeleteGroup = (group) => {
  groupToDelete.value = group
  showDeleteGroupModal.value = true
}

const deleteGroup = async () => {
  if (!groupToDelete.value) return
  
  try {
    const updatedGroups = groups.value.filter(g => g.id !== groupToDelete.value.id).map(g => g.name)
    
    await $fetch('/api/admin/system-settings/user_groups', {
      method: 'PUT',
      body: { value: JSON.stringify(updatedGroups) }
    })
    
    success('Group deleted successfully')
    showDeleteGroupModal.value = false
    groupToDelete.value = null
    await loadGroups()
    await loadUsers()
  } catch (error) {
    logger.error('Failed to delete group:', error)
    notifyError('Failed to delete group')
  }
}

const cancelDeleteGroup = () => {
  showDeleteGroupModal.value = false
  groupToDelete.value = null
}

const closeGroupModal = () => {
  showGroupModal.value = false
  editingGroup.value = null
  groupForm.value = {
    name: '',
    description: ''
  }
}

// User group management methods
const manageUserGroups = (user) => {
  selectedUser.value = user
  userGroupForm.value = {
    groups: user.groups ? user.groups.split(',').filter(g => g.trim()) : []
  }
  showUserGroupsModal.value = true
}

const addUserGroup = (groupName) => {
  if (groupName && !userGroupForm.value.groups.includes(groupName)) {
    userGroupForm.value.groups.push(groupName)
  }
}

const removeUserGroup = (index) => {
  userGroupForm.value.groups.splice(index, 1)
}

const saveUserGroups = async () => {
  try {
    await $fetch(`/api/admin/users/${selectedUser.value.id}/groups`, {
      method: 'PUT',
      body: { groups: userGroupForm.value.groups.join(',') }
    })
    closeUserGroupsModal()
    await loadUsers()
    await loadGroups()
  } catch (error) {
    logger.error('Failed to update user groups:', error)
  }
}

const closeUserGroupsModal = () => {
  showUserGroupsModal.value = false
  selectedUser.value = null
  userGroupForm.value = {
    groups: []
  }
}

// Initialize data
onMounted(async () => {
  await Promise.all([
    loadSystemSettings(),
    loadEnvVariables(),
    loadCredentials(),
    loadUsers(),
    loadGroups(),
    loadNotificationTemplates(),
    loadAgents(),
    loadLatestAgentVersion()
  ])
})

// Load notification templates
async function loadNotificationTemplates() {
  loadingTemplates.value = true
  try {
    const response = await $fetch('/api/notification-templates')
    if (response.success) {
      notificationTemplates.value = response.templates
    }
  } catch (error) {
    logger.error('Failed to load notification templates:', error)
  } finally {
    loadingTemplates.value = false
  }
}

// Save notification template (create or update)
async function saveTemplate() {
  try {
    const response = await $fetch('/api/notification-templates', {
      method: 'POST',
      body: templateForm.value
    })

    if (response.success) {
      await loadNotificationTemplates()
      closeTemplateModal()
      success('Template saved successfully!', { title: 'Template Saved' })
    }
  } catch (error) {
    logger.error('Failed to save template:', error)
    notifyError('Failed to save template: ' + (error.data?.message || error.message), { title: 'Save Failed' })
  }
}

// Delete notification template
const showDeleteTemplateModal = ref(false)
const templateToDelete = ref(null)

const confirmDeleteTemplate = (template) => {
  templateToDelete.value = template
  showDeleteTemplateModal.value = true
}

async function deleteTemplate() {
  if (!templateToDelete.value) return

  try {
    await $fetch(`/api/notification-templates/${templateToDelete.value.id}`, {
      method: 'DELETE'
    })

    success('Template deleted successfully!')
    showDeleteTemplateModal.value = false
    templateToDelete.value = null
    await loadNotificationTemplates()
  } catch (error) {
    logger.error('Failed to delete template:', error)
    notifyError('Failed to delete template: ' + (error.data?.message || error.message))
  }
}

const cancelDeleteTemplate = () => {
  showDeleteTemplateModal.value = false
  templateToDelete.value = null
}

// Close template modal and reset form
function closeTemplateModal() {
  showTemplateModal.value = false
  editingTemplate.value = null
  templateForm.value = {
    name: '',
    description: '',
    type: 'email',
    email_subject: '',
    email_body: '',
    email_html: false,
    slack_message: '',
    slack_blocks: '',
    slack_mode: 'simple',
    webhook_method: 'POST',
    webhook_headers: '{"Content-Type": "application/json"}',
    webhook_body: ''
  }
}

// Format date helper
function formatDate(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Format date and time helper
function formatDateTime(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Load agents
async function loadAgents() {
  loadingAgents.value = true
  try {
    const response = await $fetch('/api/admin/agents')
    agents.value = response || []
  } catch (error) {
    console.error('Failed to load agents:', error)
    useToast().error('Failed to load agents')
  } finally {
    loadingAgents.value = false
  }
}

// Load latest agent version
async function loadLatestAgentVersion() {
  try {
    const fs = await import('fs')
    const path = await import('path')
    // This won't work in browser context, so we'll need to create an API endpoint
    // For now, we'll fetch from a simple endpoint
    const response = await $fetch('/api/agents/latest-version')
    latestAgentVersion.value = response.version || '1.0.0'
  } catch (error) {
    console.error('Failed to load latest agent version:', error)
    // Default to 1.0.0 if fetch fails
    latestAgentVersion.value = '1.0.0'
  }
}

// Toggle agent auto-update
async function toggleAgentAutoUpdate(agent) {
  updatingAgentSettings.value = true
  try {
    const newValue = agent.autoUpdate === 'true' ? 'false' : 'true'
    await $fetch(`/api/admin/agents/${agent.id}/update-settings`, {
      method: 'PUT',
      body: {
        autoUpdate: newValue
      }
    })

    // Update local state
    agent.autoUpdate = newValue
    useToast().success(`Auto-update ${newValue === 'true' ? 'enabled' : 'disabled'} for ${agent.name}`)
  } catch (error) {
    console.error('Failed to update agent settings:', error)
    useToast().error('Failed to update agent settings')
  } finally {
    updatingAgentSettings.value = false
  }
}

// Trigger agent update
async function triggerAgentUpdate(agent) {
  updatingAgent.value = agent.id
  try {
    await $fetch(`/api/admin/agents/${agent.id}/trigger-update`, {
      method: 'POST'
    })

    useToast().success(`Update triggered for ${agent.name}. Agent will update and reconnect shortly.`)

    // Reload agents after a short delay
    setTimeout(async () => {
      await loadAgents()
    }, 3000)
  } catch (error) {
    console.error('Failed to trigger agent update:', error)
    useToast().error('Failed to trigger agent update')
  } finally {
    updatingAgent.value = null
  }
}
</script>