<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Navigation -->
    <AppNavigation :breadcrumbs="['admin']">
      <template #actions>
        <span class="text-sm text-gray-600 dark:text-gray-300 bg-yellow-100 dark:bg-yellow-900/50 px-3 py-1 rounded-full">
          {{ $t('admin.title') }}
        </span>
      </template>
    </AppNavigation>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-950 dark:text-white">{{ $t('admin.title') }}</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-300">{{ $t('admin.subtitle') }}</p>
      </div>

      <!-- Admin Sections -->
      <div class="space-y-8">
        
        <!-- System Settings Section -->
        <UCard class="shadow-md">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold text-gray-950 dark:text-white">{{ $t('admin.systemSettings.title') }}</h2>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">{{ $t('admin.systemSettings.subtitle') }}</p>
            </div>
          </div>

          <div v-if="loading" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <p class="text-gray-600 dark:text-gray-300 mt-2">{{ $t('admin.systemSettings.loadingSettings') }}</p>
          </div>

          <div v-else-if="Object.keys(groupedSystemSettings).length === 0" class="text-center py-8">
            <p class="text-gray-500 dark:text-gray-400">{{ $t('admin.systemSettings.noSettings') }}</p>
          </div>

          <UAccordion v-else :items="settingsAccordionItems" :multiple="true">
            <template v-for="category in Object.keys(groupedSystemSettings)" :key="category" #[category]>
              <div class="space-y-4 py-2 bg-gray-100 dark:bg-neutral-800 p-4 rounded-lg">
                <div v-for="setting in groupedSystemSettings[category]" :key="setting.key">
                  <!-- Text Input -->
                  <UFormField v-if="setting.type === 'text'" :label="$t(setting.label)" :required="setting.required === 'true'">
                    <UInput
                      v-model="setting.value"
                      :disabled="setting.readonly === 'true'"
                      type="text"
                      size="md"
                      class="w-full"
                      @change="updateSetting(setting.key, setting.value)"
                    />
                    <template v-if="setting.description" #help>{{ $t(setting.description) }}</template>
                  </UFormField>

                  <!-- Password Input -->
                  <UFormField v-else-if="setting.type === 'password'" :label="$t(setting.label)" :required="setting.required === 'true'">
                    <UInput
                      v-model="setting.value"
                      :disabled="setting.readonly === 'true'"
                      type="password"
                      size="md"
                      class="w-full"
                      @change="updateSetting(setting.key, setting.value)"
                    />
                    <template v-if="setting.description" #help>{{ $t(setting.description) }}</template>
                  </UFormField>

                  <!-- Textarea -->
                  <UFormField v-else-if="setting.type === 'textarea'" :label="$t(setting.label)" :required="setting.required === 'true'">
                    <UTextarea
                      v-model="setting.value"
                      :disabled="setting.readonly === 'true'"
                      v-auto-resize
                      size="md"
                      class="w-full"
                      @change="updateSetting(setting.key, setting.value)"
                    />
                    <template v-if="setting.description" #help>{{ $t(setting.description) }}</template>
                  </UFormField>

                  <!-- Select Dropdown -->
                  <UFormField v-else-if="setting.type === 'select'" :label="$t(setting.label)" :required="setting.required === 'true'">
                    <USelect
                      v-model="setting.value"
                      :disabled="setting.readonly === 'true'"
                      :items="getSelectOptions(setting.options)"
                      size="md"
                      class="w-full"
                      :placeholder="$t('admin.common.select')"
                      @change="updateSetting(setting.key, setting.value)"
                    />
                    <template v-if="setting.description" #help>{{ $t(setting.description) }}</template>
                  </UFormField>

                  <!-- Boolean Checkbox -->
                  <UFormField v-else-if="setting.type === 'boolean'">
                    <UCheckbox
                      v-model="setting.value"
                      :disabled="setting.readonly === 'true'"
                      :true-value="'true'"
                      :false-value="'false'"
                      :label="$t(setting.label)"
                      @change="updateSetting(setting.key, setting.value)"
                    />
                    <template v-if="setting.description" #help>{{ $t(setting.description) }}</template>
                  </UFormField>

                  <!-- File Upload -->
                  <UFormField v-else-if="setting.type === 'file'" :label="$t(setting.label)" :required="setting.required === 'true'">
                    <div class="space-y-2">
                      <UInput
                        :id="setting.key"
                        :disabled="setting.readonly === 'true'"
                        type="file"
                        accept=".pem"
                        class="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-800 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-600"
                        @change="handleFileUpload(setting.key, $event)"
                      />
                      <div v-if="setting.value" class="flex items-center gap-2">
                        <img :src="setting.value" alt="Preview" class="h-8 w-8 object-contain rounded">
                        <span class="text-sm">{{ $t('admin.systemSettings.currentFileUploaded') }}</span>
                        <UButton
                          @click="updateSetting(setting.key, null)"
                          color="error"
                          variant="ghost"
                          size="xs"
                          :label="$t('admin.common.remove')"
                        />
                      </div>
                    </div>
                    <template v-if="setting.description" #help>{{ $t(setting.description) }}</template>
                  </UFormField>

                  <!-- Number Input -->
                  <UFormField v-else-if="setting.type === 'number'" :label="$t(setting.label)" :required="setting.required === 'true'">
                    <UInput
                      v-model="setting.value"
                      :disabled="setting.readonly === 'true'"
                      type="number"
                      size="md"
                      class="w-full"
                      @change="updateSetting(setting.key, setting.value)"
                    />
                    <template v-if="setting.description" #help>{{ $t(setting.description) }}</template>
                  </UFormField>
                </div>

                <!-- LDAP Test Section -->
                <div v-if="category === 'authentication' && hasLdapSettings" class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <UAlert
                    :color="ldapTestResult?.success ? 'success' : ldapTestResult && !ldapTestResult.success ? 'error' : 'primary'"
                    variant="soft"
                    :icon="ldapTestResult?.success ? 'i-lucide-check-circle' : ldapTestResult && !ldapTestResult.success ? 'i-lucide-x-circle' : 'i-lucide-shield'"
                  >
                    <template #title>{{ $t('admin.ldapTest.title') }}</template>
                    <template #description>
                      <div class="space-y-4 mt-3">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <UFormField :label="$t('admin.ldapTest.username')">
                            <UInput
                              v-model="ldapTestForm.username"
                              type="text"
                              size="md"
                              class="w-full"
                              :placeholder="$t('admin.ldapTest.usernamePlaceholder')"
                            />
                          </UFormField>
                          <UFormField :label="$t('admin.ldapTest.password')">
                            <UInput
                              v-model="ldapTestForm.password"
                              type="password"
                              size="md"
                              class="w-full"
                              :placeholder="$t('admin.ldapTest.passwordPlaceholder')"
                            />
                          </UFormField>
                        </div>

                        <div class="flex items-center justify-between">
                          <UButton
                            @click="testLdapConnection"
                            :disabled="!ldapTestForm.username || !ldapTestForm.password || ldapTesting"
                            :loading="ldapTesting"
                            icon="i-lucide-plug"
                            :label="ldapTesting ? $t('admin.ldapTest.testing') : $t('admin.ldapTest.testConnection')"
                          />
                          
                          <span v-if="ldapTestResult" class="text-sm">
                            {{ ldapTestResult.message }}
                          </span>
                        </div>

                        <UCard v-if="ldapTestResult?.success && ldapTestResult.user" class="bg-success-50 dark:bg-success-950">
                          <div class="text-sm space-y-1">
                            <div class="font-medium mb-2">{{ $t('admin.ldapTest.success') }}</div>
                            <div><strong>{{ $t('admin.ldapTest.userDn') }}</strong> {{ ldapTestResult.user.dn }}</div>
                            <div><strong>Name:</strong> {{ ldapTestResult.user.name }}</div>
                            <div><strong>Email:</strong> {{ ldapTestResult.user.email }}</div>
                            <div v-if="Array.isArray(ldapTestResult.user.groups) && ldapTestResult.user.groups.length > 0">
                              <strong>{{ $t('admin.ldapTest.groups') }}</strong> {{ ldapTestResult.user.groups.join(', ') }}
                            </div>
                          </div>
                        </UCard>

                        <UAlert v-if="ldapTestResult && !ldapTestResult.success" color="error" variant="soft">
                          <template #title>{{ $t('admin.ldapTest.error') }}</template>
                          <template #description>{{ ldapTestResult.error }}</template>
                        </UAlert>
                      </div>
                    </template>
                  </UAlert>
                </div>
              </div>
            </template>
          </UAccordion>
        </UCard>

        <!-- System Update Section -->
        <UCard class="shadow-md">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold text-gray-950 dark:text-white flex items-center">
                <UIcon name="i-lucide-refresh-cw" class="w-5 h-5 mr-2 text-blue-600" />
                {{ $t('admin.systemUpdates.title') }}
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">{{ $t('admin.systemUpdates.subtitle') }}</p>
            </div>
            <UButton
              @click="checkForUpdates"
              :disabled="updateChecking"
              :loading="updateChecking"
              icon="i-lucide-refresh-cw"
              :label="$t('admin.updateManagement.checkForUpdates')"
              color="secondary"
              variant="outline"
            />
          </div>

          <!-- Loading State -->
          <div v-if="updateChecking" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <p class="text-gray-600 dark:text-gray-300 mt-2">{{ $t('admin.updateManagement.checking') }}</p>
          </div>

          <!-- Initial State -->
          <div v-else-if="!updateInfo" class="text-center py-8">
            <UIcon name="i-lucide-refresh-cw" class="mx-auto h-12 w-12 text-gray-400" />
            <p class="text-gray-600 dark:text-gray-300 mt-2">{{ $t('admin.systemUpdates.clickToCheck') }}</p>
          </div>

          <!-- Update Status -->
          <div v-else class="space-y-4">
            <!-- Current Version Info -->
            <UAlert 
              :color="updateInfo.updateAvailable ? 'warning' : 'primary'"
              variant="soft"
              :icon="updateInfo.updateAvailable ? 'i-lucide-alert-circle' : 'i-lucide-check-circle'"
            >
              <template #title>
                {{ updateInfo.updateAvailable ? $t('admin.updateManagement.updateAvailable') : $t('admin.updateManagement.upToDate') }}
              </template>
              <template #description>
                <div class="space-y-2 mt-2">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm font-medium">{{ $t('admin.updateManagement.currentVersion') }}</p>
                      <p class="text-lg font-semibold">{{ updateInfo.currentVersion }}</p>
                    </div>
                    <div v-if="updateInfo.updateAvailable" class="text-right">
                      <p class="text-sm font-medium">{{ $t('admin.updateManagement.latestVersion') }}</p>
                      <p class="text-lg font-semibold text-green-600 dark:text-green-400">{{ updateInfo.latestVersion }}</p>
                    </div>
                  </div>
                  <p v-if="updateInfo.lastCheck" class="text-xs opacity-75">
                    {{ $t('admin.systemUpdates.lastChecked') }}: {{ new Date(updateInfo.lastCheck).toLocaleString() }}
                  </p>
                </div>
              </template>
            </UAlert>

            <!-- Update Available Details -->
            <UCollapsible v-if="updateInfo.updateAvailable" :default-open="true">
              <template #default="{ open }">
                <div class="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
                  <UIcon name="i-lucide-package" class="w-5 h-5" />
                  <span class="font-medium">{{ $t('admin.systemUpdates.updateDetailsOptions') }}</span>
                  <UIcon
                    :name="open ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                    class="w-5 h-5 ml-auto text-gray-400 transition-transform"
                  />
                </div>
              </template>

              <template #content>
                <UCard class="mt-2">
                  <div class="space-y-4">
                    <!-- Release Notes -->
                    <div v-if="updateInfo.releaseNotes">
                      <p class="text-sm font-medium mb-2">{{ $t('admin.systemUpdates.releaseNotes') }}:</p>
                      <UCard class="bg-gray-50 dark:bg-gray-900">
                        <pre class="whitespace-pre-wrap text-xs max-h-32 overflow-y-auto">{{ updateInfo.releaseNotes }}</pre>
                      </UCard>
                    </div>

                    <!-- Update Options -->
                    <div class="space-y-3">
                      <UFormField>
                        <UCheckbox
                          v-model="waitForJobs"
                          :label="$t('admin.systemUpdates.waitForBuilds')"
                          :help="$t('admin.systemUpdates.waitForBuildsHelp')"
                        />
                      </UFormField>

                      <UButton
                        @click="triggerUpdate"
                        :disabled="updateTriggering"
                        :loading="updateTriggering"
                        icon="i-lucide-download"
                        :label="updateTriggering ? $t('admin.systemUpdates.initiatingUpdate') : $t('admin.systemUpdates.updateNow')"
                        color="success"
                        block
                      />
                    </div>
                  </div>
                </UCard>
              </template>
            </UCollapsible>
          </div>
        </UCard>

        <!-- Agent Updates Section -->
        <UCard class="shadow-md">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-lg font-semibold text-gray-950 dark:text-white flex items-center">
                  <UIcon name="i-lucide-cpu" class="w-5 h-5 mr-2 text-green-600" />
                  {{ $t('admin.agentUpdates.title') }}
                </h2>
                <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">{{ $t('admin.agentUpdates.subtitle') }}</p>
              </div>
            </div>

            <!-- Agents List -->
            <div v-if="loadingAgents" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <p class="text-gray-600 dark:text-gray-300 mt-2">{{ $t('admin.agentUpdates.loadingAgents') }}</p>
            </div>

            <div v-else-if="agents.length === 0" class="text-center py-8">
              <UIcon name="i-lucide-cpu" class="mx-auto h-12 w-12 text-gray-400" />
              <p class="text-gray-600 dark:text-gray-300 mt-2">{{ $t('admin.agentUpdates.noAgents') }}</p>
            </div>

            <div v-else class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead class="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('admin.agentUpdates.agent') }}</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('admin.agentUpdates.currentVersion') }}</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('admin.agentUpdates.status') }}</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('admin.agentUpdates.autoUpdate') }}</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('admin.agentUpdates.lastCheck') }}</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('admin.agentUpdates.actions') }}</th>
                  </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  <tr v-for="agent in agents" :key="agent.id">
                    <td class="px-4 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full" :class="agent.status === 'online' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-200 dark:bg-gray-800'">
                          <UIcon name="i-lucide-cpu" class="w-4 h-4" :class="agent.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'" />
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
                        <UIcon name="i-lucide-alert-circle" class="w-3 h-3 mr-1" />
                        {{ $t('admin.agentUpdates.updateAvailable') }}
                      </span>
                      <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        <UIcon name="i-lucide-check-circle" class="w-3 h-3 mr-1" />
                        {{ $t('admin.agentUpdates.upToDate') }}
                      </span>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap">
                      <button
                        @click="toggleAgentAutoUpdate(agent)"
                        :disabled="updatingAgentSettings"
                        class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        :class="agent.autoUpdate === 'true' ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-800'"
                      >
                        <span class="sr-only">{{ $t('admin.agentUpdates.enableAutoUpdate') }}</span>
                        <span
                          class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                          :class="agent.autoUpdate === 'true' ? 'translate-x-5' : 'translate-x-0'"
                        ></span>
                      </button>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span v-if="agent.lastVersionCheck">{{ formatDateTime(agent.lastVersionCheck) }}</span>
                      <span v-else class="text-gray-400 dark:text-gray-500">{{ $t('admin.agentUpdates.never') }}</span>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        v-if="agent.updateAvailable === 'true' && agent.status === 'online'"
                        @click="triggerAgentUpdate(agent)"
                        :disabled="updatingAgent === agent.id"
                        class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <UIcon v-if="updatingAgent === agent.id" name="i-lucide-refresh-cw" class="animate-spin w-3 h-3 mr-1" />
                        <span v-else>{{ $t('admin.agentUpdates.updateNow') }}</span>
                      </button>
                      <span v-else-if="agent.status !== 'online'" class="text-gray-400 dark:text-gray-500 text-xs">{{ $t('admin.agentUpdates.agentOffline') }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Latest Agent Version Info -->
            <div class="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div class="flex items-start">
                <UIcon name="i-lucide-info" class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                <div class="flex-1">
                  <p class="text-sm font-medium text-blue-900 dark:text-blue-200">{{ $t('admin.agentUpdates.latestVersion') }}: {{ latestAgentVersion }}</p>
                  <p class="text-xs text-blue-700 dark:text-blue-300 mt-1">{{ $t('admin.agentUpdates.autoUpdateInfo') }}</p>
                </div>
              </div>
            </div>
        </UCard>

        <!-- Notification Templates Section -->
        <UCard class="shadow-md">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold text-gray-950 dark:text-white">{{ $t('admin.notificationTemplates.title') }}</h2>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">{{ $t('admin.notificationTemplates.subtitle') }}</p>
            </div>
            <button
              @click="showTemplateModal = true; editingTemplate = null"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
            >
              <UIcon name="i-lucide-plus" class="w-5 h-5 mr-2" />
              {{ $t('admin.notificationTemplates.createTemplate') }}
            </button>
          </div>

          <div v-if="loadingTemplates" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <p class="text-gray-600 dark:text-gray-300 mt-2">{{ $t('admin.notificationTemplates.loadingTemplates') }}</p>
          </div>

          <div v-else-if="notificationTemplates.length === 0" class="text-center py-8">
            <UIcon name="i-lucide-bell" class="mx-auto h-12 w-12 text-gray-400" />
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ $t('admin.notificationTemplates.noTemplates') }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">{{ $t('admin.notificationTemplates.createFirstTemplate') }}</p>
          </div>

          <div v-else class="space-y-3">
            <div v-for="template in notificationTemplates" :key="template.id" class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <h3 class="text-md font-medium text-gray-950 dark:text-white">{{ template.name }}</h3>
                    <span v-if="template.is_built_in" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {{ $t('admin.notificationTemplates.builtIn') }}
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
                    {{ $t('admin.notificationTemplates.created') }} {{ formatDate(template.created_at) }}
                  </div>
                </div>
                <div class="flex items-center gap-2 ml-4">
                  <UTooltip :text="$t('admin.notificationTemplates.viewTemplate')">
                    <UButton
                      @click="viewNotificationTemplate(template)"
                      icon="i-lucide-eye"
                    />
                  </UTooltip>
                  <UTooltip :text="$t('admin.notificationTemplates.editTemplate')">
                    <UButton
                      v-if="!template.is_built_in"
                      @click="editNotificationTemplate(template)"
                      color="secondary"
                      icon="i-lucide-edit"
                    />
                  </UTooltip>
                  <UTooltip :text="$t('admin.notificationTemplates.deleteTemplate')">
                    <UButton
                      v-if="!template.is_built_in"
                      @click="confirmDeleteTemplate(template)"
                      color="error"
                      icon="i-lucide-trash-2"
                    />
                  </UTooltip>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Project Templates Section -->
        <UCard class="shadow-md">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-lg font-semibold text-gray-950 dark:text-white">{{ $t('admin.projectTemplates.title') }}</h2>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">{{ $t('admin.projectTemplates.subtitle') }}</p>
            </div>
          </div>

          <div v-if="loadingTemplates" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p class="text-gray-600 dark:text-gray-300 mt-2">{{ $t('admin.projectTemplates.loadingTemplates') }}</p>
          </div>

          <div v-else class="space-y-3">
            <div v-if="templates.length === 0" class="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
              {{ $t('admin.projectTemplates.noTemplates') }}
            </div>
            <div
              v-for="template in templates"
              :key="template.id"
              class="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <div class="flex-1">
                <div class="font-medium text-sm text-gray-950 dark:text-white">{{ template.name }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ template.description || $t('admin.projectTemplates.noDescription') }}</div>
                <div class="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  {{ $t('admin.projectTemplates.created') }} {{ formatDate(new Date(template.createdAt)) }}
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <button
                  @click="confirmDeleteProjectTemplate(template)"
                  class="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                >
                  <UIcon name="i-lucide-trash-2" class="w-3 h-3 mr-1" />
                  {{ $t('admin.common.delete') }}
                </button>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Environment Variables Section -->
        <UCard class="shadow-md">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-950 dark:text-white">{{ $t('admin.environmentVariables.title') }}</h2>
            <button
              @click="showEnvModal = true"
              class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <UIcon name="i-lucide-plus" class="w-4 h-4 mr-2" />
              {{ $t('admin.environmentVariables.addVariable') }}
            </button>
          </div>

          <div class="space-y-3">
            <div v-if="envVariables.length === 0" class="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
              {{ $t('admin.environmentVariables.noVariables') }}
            </div>
            <div
              v-for="variable in envVariables"
              :key="variable.id"
              class="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg"
            >
              <div class="flex-1">
                <div class="font-medium text-sm text-gray-950 dark:text-white">{{ variable.key }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ variable.description || $t('admin.environmentVariables.noDescription') }}</div>
                <div class="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  {{ variable.isSecret === 'true' ? '🔒 ' + $t('admin.environmentVariables.secret') : $t('admin.environmentVariables.public') }}
                </div>
              </div>
              <div class="flex space-x-2">
                <UIcon
                  name="i-lucide-edit"
                  @click="editEnvVariable(variable)"
                  class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                />
                <UIcon
                  name="i-lucide-trash-2"
                  @click="confirmDeleteEnvVariable(variable)"
                  class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                />
              </div>
            </div>
          </div>
        </UCard>

        <!-- Credential Vault Section -->
        <UCard class="shadow-md">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 class="text-lg font-semibold text-gray-950 dark:text-white">{{ $t('admin.credentialVault.title') }}</h2>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">{{ $t('admin.credentialVault.subtitle') }}</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-2">
              <USelectMenu
                v-model="credentialFilter"
                :items="credentialFilterOptions"
                placeholder="Filter by type"
                size="md"
                class="w-full sm:w-auto"
              />
              <UButton
                @click="showCredentialModal = true"
                icon="i-lucide-plus"
                :label="$t('admin.credentialVault.addCredential')"
                color="success"
              />
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredCredentials.length === 0" class="text-center py-8">
            <UIcon name="i-lucide-shield" class="mx-auto h-12 w-12 text-gray-400" />
            <p class="text-gray-500 dark:text-gray-400 text-sm mt-2">
              {{ credentialFilter && credentialFilter !== 'All Types' ? $t('admin.credentialVault.noCredentialsOfType') : $t('admin.credentialVault.noCredentials') }}
            </p>
          </div>

          <!-- Credentials List -->
          <div v-else class="space-y-3">
            <div v-for="credential in filteredCredentials" :key="credential.id" class="border border-gray-200 dark:border-gray-700 rounded-lg">
              <UCollapsible>
                <template #default="{ open }">
                  <div class="flex items-center justify-between w-full gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                      <UAvatar
                        :icon="credential.type === 'ssh_key' ? 'i-lucide-key' : credential.type === 'token' ? 'i-lucide-shield' : 'i-lucide-lock'"
                        size="sm"
                        color="primary"
                      />
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-medium truncate">{{ credential.name }}</span>
                          <UBadge :label="getCredentialTypeLabel(credential.type)" size="xs" variant="soft" />
                          <UBadge v-if="credential.environment" :label="credential.environment" color="primary" size="xs" variant="subtle" />
                          <UBadge v-if="!credential.isActive" :label="$t('admin.credentialVault.inactive')" color="error" size="xs" variant="soft" />
                        </div>
                        <p v-if="credential.description" class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                          {{ credential.description }}
                        </p>
                      </div>
                    </div>
                    <UIcon
                      :name="open ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                      class="w-5 h-5 flex-shrink-0 text-gray-400 transition-transform"
                    />
                  </div>
                </template>

                <template #content>
                  <div class="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                    <!-- Credential Details -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p class="text-gray-500 dark:text-gray-400 mb-1">{{ $t('admin.credentialVault.type') }}</p>
                        <p class="font-medium">{{ getCredentialTypeLabel(credential.type) }}</p>
                      </div>
                      <div v-if="credential.environment">
                        <p class="text-gray-500 dark:text-gray-400 mb-1">{{ $t('admin.credentialVault.environment') }}</p>
                        <p class="font-medium">{{ credential.environment }}</p>
                      </div>
                      <div v-if="credential.url">
                        <p class="text-gray-500 dark:text-gray-400 mb-1">{{ $t('admin.credentialVault.url') }}</p>
                        <p class="font-medium text-xs break-all">{{ credential.url }}</p>
                      </div>
                      <div>
                        <p class="text-gray-500 dark:text-gray-400 mb-1">{{ $t('admin.credentialVault.status') }}</p>
                        <UBadge :label="credential.isActive ? $t('admin.credentialVault.active') : $t('admin.credentialVault.inactive')" :color="credential.isActive ? 'success' : 'error'" variant="soft" size="xs" />
                      </div>
                    </div>

                    <!-- Tags -->
                    <div v-if="credential.tags && credential.tags.length > 0">
                      <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">{{ $t('admin.credentialVault.tags') }}</p>
                      <div class="flex flex-wrap gap-1">
                        <UBadge
                          v-for="tag in credential.tags"
                          :key="tag"
                          :label="tag"
                          size="xs"
                          variant="subtle"
                        />
                      </div>
                    </div>

                    <!-- Description -->
                    <div v-if="credential.description">
                      <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">{{ $t('admin.credentialVault.description') }}</p>
                      <p class="text-sm">{{ credential.description }}</p>
                    </div>

                    <!-- Actions -->
                    <div class="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <UButton
                        @click="viewCredential(credential)"
                        icon="i-lucide-eye"
                        :label="$t('admin.credentialVault.view')"
                        color="secondary"
                        variant="soft"
                        block
                      />
                      <UButton
                        @click="editCredential(credential)"
                        icon="i-lucide-edit"
                        :label="$t('admin.credentialVault.edit')"
                        color="primary"
                        variant="soft"
                        block
                      />
                      <UButton
                        @click="confirmDeleteCredential(credential)"
                        icon="i-lucide-trash-2"
                        :label="$t('admin.credentialVault.delete')"
                        color="error"
                        variant="soft"
                        block
                      />
                    </div>
                  </div>
                </template>
              </UCollapsible>
            </div>
          </div>
        </UCard>

        <!-- Groups Management Section -->
        <UCard class="shadow-md">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-950 dark:text-white">{{ $t('admin.groupManagement.title') }}</h2>
            <button
              @click="showGroupModal = true"
              class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              <UIcon name="i-lucide-plus" class="w-4 h-4 mr-2" />
              {{ $t('admin.groupManagement.createGroup') }}
            </button>
          </div>

          <div class="space-y-3">
            <div v-if="groups.length === 0" class="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
              {{ $t('admin.groupManagement.noGroups') }}
            </div>
            <div
              v-for="group in groups"
              :key="group.id"
              class="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg"
            >
              <div class="flex-1">
                <div class="font-medium text-sm text-gray-950 dark:text-white">{{ group.name }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ group.description || $t('admin.groupManagement.noDescription') }}</div>
                <div class="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  {{ group.memberCount || 0 }} {{ $t('admin.groupManagement.members') }}
                  <br />
                  {{ group.ldapMappings.length }} {{ $t('admin.groupManagement.ldapGroups') }}
                </div>
              </div>
              <div class="flex space-x-2">
                <button
                  @click="editGroup(group)"
                  class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                >
                  {{ $t('admin.common.edit') }}
                </button>
                <button
                  @click="confirmDeleteGroup(group)"
                  class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                >
                  {{ $t('admin.common.delete') }}
                </button>
              </div>
            </div>
          </div>
        </UCard>

        <!-- User Management Section -->
        <UCard class="shadow-md">
          <h2 class="text-lg font-semibold text-gray-950 dark:text-white mb-4">{{ $t('admin.userManagement.title') }}</h2>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead class="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('admin.userManagement.username') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('admin.userManagement.email') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('admin.userManagement.role') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('admin.userManagement.created') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('admin.userManagement.actions') }}</th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
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
                      <span :class="user.role === 'admin' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'" 
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                        {{ user.role }}
                      </span>
                      <span v-if="user.isActive === 'false'" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                        {{ $t('admin.userManagement.inactive') }}
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
                        {{ user.role === 'admin' ? $t('admin.userManagement.makeUser') : $t('admin.userManagement.makeAdmin') }}
                      </button>
                      <button
                        @click="manageUserGroups(user)"
                        class="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300"
                      >
                        {{ $t('admin.userManagement.groups') }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </main>

    <!-- Environment Variable Modal -->
    <ModalWrapper v-model="showEnvModal" class="max-w-md">
      <UCard class="shadow-md">
        <h3 class="text-lg font-bold text-gray-950 dark:text-white mb-4">
          {{ editingEnvVariable ? $t('admin.environmentVariables.editVariable') : $t('admin.environmentVariables.addVariable') }}
        </h3>
        
        <form @submit.prevent="saveEnvVariable">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.environmentVariables.key') }}</label>
            <input
              v-model="envForm.key"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
              :placeholder="$t('admin.environmentVariables.keyPlaceholder')"
            >
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.environmentVariables.value') }}</label>
            <input
              v-model="envForm.value"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
              :placeholder="$t('admin.environmentVariables.valuePlaceholder')"
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
              <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">{{ $t('admin.environmentVariables.markAsSecret') }}</span>
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
      </UCard>
    </ModalWrapper>

    <!-- Credential Modal -->
    <ModalWrapper v-model="showCredentialModal" class="max-w-2xl">
      <UCard class="shadow-md">
        <h3 class="text-lg font-bold text-gray-950 dark:text-white mb-4">
          {{ editingCredential ? $t('admin.credentialVault.editCredential') : $t('admin.credentialVault.addCredential') }}
        </h3>
        
        <form @submit.prevent="saveCredential" class="space-y-4">
          <!-- Basic Information -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.credentialVault.name') }} *</label>
              <input
                v-model="credentialForm.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
                :placeholder="$t('admin.credentialVault.namePlaceholder')"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.credentialVault.type') }} *</label>
              <select
                v-model="credentialForm.type"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
              >
                <option value="password">{{ $t('admin.credentialVault.types.password') }}</option>
                <option value="user_pass">{{ $t('admin.credentialVault.types.userPass') }}</option>
                <option value="token">{{ $t('admin.credentialVault.types.token') }}</option>
                <option value="ssh_key">{{ $t('admin.credentialVault.types.sshKey') }}</option>
                <option value="certificate">{{ $t('admin.credentialVault.types.certificate') }}</option>
                <option value="file">{{ $t('admin.credentialVault.types.file') }}</option>
                <option value="custom">{{ $t('admin.credentialVault.types.custom') }}</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              v-model="credentialForm.description"
              v-auto-resize
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none overflow-hidden bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
              placeholder="Optional description"
            ></textarea>
          </div>

          <!-- Credential Fields (shown based on type) -->
          <div class="border-t pt-4">
            <h4 class="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">{{ $t('admin.credentialVault.credentialData') }}</h4>
            
            <!-- Username (for user_pass, ssh_key) -->
            <div v-if="['user_pass', 'ssh_key'].includes(credentialForm.type)" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.credentialVault.username') }}</label>
              <input
                v-model="credentialForm.username"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
                :placeholder="'user@example.com' + $t('admin.credentialVault.usernamePlaceholder')"
              >
            </div>

            <!-- Password (for password, user_pass) -->
            <div v-if="['password', 'user_pass'].includes(credentialForm.type)" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.credentialVault.password') }}</label>
              <input
                v-model="credentialForm.password"
                type="password"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
                :placeholder="$t('admin.credentialVault.passwordPlaceholder')"
              >
            </div>

            <!-- Token (for token) -->
            <div v-if="credentialForm.type === 'token'" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.credentialVault.tokenApiKey') }}</label>
              <textarea
                v-model="credentialForm.token"
                v-auto-resize
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none overflow-hidden bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
                :placeholder="$t('admin.credentialVault.tokenPlaceholder')"
              ></textarea>
            </div>

            <!-- SSH Private Key (for ssh_key) -->
            <div v-if="credentialForm.type === 'ssh_key'" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.credentialVault.sshPrivateKey') }}</label>
              <textarea
                v-model="credentialForm.privateKey"
                v-auto-resize
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none overflow-hidden bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
                :placeholder="$t('admin.credentialVault.sshKeyPlaceholder')"
              ></textarea>
            </div>

            <!-- Certificate (for certificate) -->
            <div v-if="credentialForm.type === 'certificate'" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.credentialVault.certificate') }}</label>
              <textarea
                v-model="credentialForm.certificate"
                v-auto-resize
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none overflow-hidden bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
                :placeholder="$t('admin.credentialVault.certificatePlaceholder')"
              ></textarea>
            </div>

            <!-- File Upload (for file) -->
            <div v-if="credentialForm.type === 'file'" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.credentialVault.fileUpload') }}</label>
              <input
                type="file"
                @change="handleCredentialFileUpload"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
              >
              <div v-if="credentialForm.fileName" class="mt-2 text-sm text-gray-600">
                {{ $t('admin.credentialVault.selected') }}: {{ credentialForm.fileName }} ({{ credentialForm.fileMimeType }})
              </div>
            </div>
          </div>

          <!-- Additional Fields -->
          <div class="border-t pt-4">
            <h4 class="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">{{ $t('admin.credentialVault.additionalInfo') }}</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.credentialVault.url') }}</label>
                <input
                  v-model="credentialForm.url"
                  type="url"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
                  :placeholder="$t('admin.credentialVault.urlPlaceholder')"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.credentialVault.environment') }}</label>
                <select
                  v-model="credentialForm.environment"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
                >
                  <option value="">{{ $t('admin.credentialVault.selectEnvironment') }}</option>
                  <option value="development">{{ $t('admin.credentialVault.environments.development') }}</option>
                  <option value="staging">{{ $t('admin.credentialVault.environments.staging') }}</option>
                  <option value="production">{{ $t('admin.credentialVault.environments.production') }}</option>
                  <option value="testing">{{ $t('admin.credentialVault.environments.testing') }}</option>
                </select>
              </div>
            </div>

            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.credentialVault.expiresAt') }}</label>
              <input
                v-model="credentialForm.expiresAt"
                type="datetime-local"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white"
              >
            </div>

            <!-- Tags -->
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.credentialVault.tags') }}</label>
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
                    <UIcon name="i-lucide-x" class="w-4 h-4" />
                  </button>
                </span>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="newTag"
                  type="text"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  :placeholder="$t('admin.credentialVault.addTag')"
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
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('admin.credentialVault.customFields') }}</label>
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
                    <UIcon name="i-lucide-x" class="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <input
                  v-model="newCustomFieldKey"
                  type="text"
                  class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  :placeholder="$t('admin.credentialVault.fieldName')"
                >
                <input
                  v-model="newCustomFieldValue"
                  type="text"
                  class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  :placeholder="$t('admin.credentialVault.fieldValue')"
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
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ $t('admin.credentialVault.active') }}</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              @click="closeCredentialModal"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50"
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
      </UCard>
    </ModalWrapper>

    <!-- Credential View Modal -->
    <ModalWrapper v-model="showCredentialViewModal" class="max-w-2xl">
      <UCard class="shadow-md">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-gray-950 dark:text-white">{{ $t('admin.credentialVault.viewCredential') }}</h3>
          <button
            @click="closeCredentialViewModal"
            class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>
        
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">{{ $t('admin.credentialVault.name') }}</label>
              <p class="mt-1 text-sm text-gray-950">{{ viewingCredential.name }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">{{ $t('admin.credentialVault.type') }}</label>
              <span 
                :class="getCredentialTypeColor(viewingCredential.type)"
                class="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full"
              >
                {{ getCredentialTypeLabel(viewingCredential.type) }}
              </span>
            </div>
          </div>

          <div v-if="viewingCredential.description">
            <label class="block text-sm font-medium text-gray-700">{{ $t('admin.credentialVault.description') }}</label>
            <p class="mt-1 text-sm text-gray-950">{{ viewingCredential.description }}</p>
          </div>

          <!-- Credential Data (masked for security) -->
          <div class="border-t pt-4">
            <h4 class="text-md font-medium text-gray-950 mb-3">{{ $t('admin.credentialVault.credentialData') }}</h4>
            
            <div v-if="viewingCredential.username" class="mb-2">
              <label class="block text-sm font-medium text-gray-700">{{ $t('admin.credentialVault.username') }}</label>
              <p class="mt-1 text-sm font-mono bg-gray-50 p-2 rounded">{{ viewingCredential.username }}</p>
            </div>

            <div v-if="viewingCredential.password" class="mb-2">
              <label class="block text-sm font-medium text-gray-700">{{ $t('admin.credentialVault.password') }}</label>
              <p class="mt-1 text-sm font-mono bg-gray-50 p-2 rounded">••••••••••••</p>
            </div>

            <div v-if="viewingCredential.token" class="mb-2">
              <label class="block text-sm font-medium text-gray-700">{{ $t('admin.credentialVault.token') }}</label>
              <p class="mt-1 text-sm font-mono bg-gray-50 p-2 rounded">{{ viewingCredential.token.substring(0, 20) }}...</p>
            </div>

            <div v-if="viewingCredential.fileName" class="mb-2">
              <label class="block text-sm font-medium text-gray-700">{{ $t('admin.credentialVault.file') }}</label>
              <p class="mt-1 text-sm bg-gray-50 p-2 rounded">{{ viewingCredential.fileName }} ({{ viewingCredential.fileMimeType }})</p>
            </div>
          </div>

          <!-- Additional Information -->
          <div class="border-t pt-4">
            <h4 class="text-md font-medium text-gray-950 mb-3">{{ $t('admin.credentialVault.additionalInfo') }}</h4>
            
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
      </UCard>
    </ModalWrapper>

    <!-- Group Modal -->
    <ModalWrapper v-model="showGroupModal" class="max-w-md">
      <UCard class="shadow-md">
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
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              v-model="groupForm.description"
              v-auto-resize
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white resize-none overflow-hidden"
              placeholder="Optional description"
            ></textarea>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              LDAP Group Mappings
              <span class="text-xs text-gray-500 dark:text-gray-400 font-normal">(optional)</span>
            </label>
            <div class="space-y-2">
              <div v-for="(mapping, index) in groupForm.ldapMappings" :key="index" class="flex gap-2">
                <input
                  v-model="groupForm.ldapMappings[index]"
                  type="text"
                  class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-950 dark:text-white text-sm"
                  placeholder="DL-Admin-Group"
                >
                <button
                  type="button"
                  @click="groupForm.ldapMappings.splice(index, 1)"
                  class="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                >
                  <UIcon name="i-lucide-trash-2" class="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                @click="groupForm.ldapMappings = [...(groupForm.ldapMappings || []), '']"
                class="text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                + Add LDAP Group
              </button>
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter distribution list or group names (e.g., DL-Admin-Group). Users with these LDAP groups will automatically be added on login.
            </p>
          </div>

          <!-- Group Members Section (only show when editing) -->
          <div v-if="editingGroup" class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Group Members
              <span class="text-xs text-gray-500 dark:text-gray-400 font-normal">({{ groupMembers.length }})</span>
            </label>

            <div v-if="groupMembers.length > 0" class="border border-gray-300 dark:border-gray-600 rounded-md max-h-48 overflow-y-auto">
              <div
                v-for="member in groupMembers"
                :key="member.userId"
                class="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
              >
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {{ member.name }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {{ member.email }}
                  </div>
                </div>
                <button
                  type="button"
                  @click="removeGroupMember(member)"
                  class="ml-2 p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  title="Remove member"
                >
                  <UIcon name="i-lucide-x" class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div v-else class="text-sm text-gray-500 dark:text-gray-400 italic">
              No members in this group yet
            </div>
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
      </UCard>
    </ModalWrapper>

    <!-- User Groups Modal -->
    <ModalWrapper v-model="showUserGroupsModal" class="max-w-lg">
      <UCard class="shadow-md">
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
                  v-for="(groupId, index) in userGroupForm.groups"
                  :key="index"
                  class="inline-flex items-center px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full"
                >
                  {{ groups.find(g => g.id === groupId)?.name || groupId }}
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
                  :key="group.id"
                  :value="group.id"
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
      </UCard>
    </ModalWrapper>

    <!-- Notification Template Modal -->
    <ModalWrapper v-model="showTemplateModal" class="max-w-2xl">
      <UCard class="shadow-md">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-950 dark:text-white">
            {{ editingTemplate?.readOnly ? 'View' : (editingTemplate ? 'Edit' : 'Create') }} Notification Template
          </h3>
          <button @click="closeTemplateModal" class="text-gray-400 hover:text-gray-500">
            <UIcon name="i-lucide-x" class="w-6 h-6" />
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
              :disabled="editingTemplate?.readOnly"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="e.g., Production Deploy Success"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <input
              v-model="templateForm.description"
              type="text"
              :disabled="editingTemplate?.readOnly"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Brief description of this template"
            />
          </div>

          <!-- Template Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notification Type *</label>
            <select
              v-model="templateForm.type"
              required
              :disabled="editingTemplate?.readOnly"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
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
                :disabled="editingTemplate?.readOnly"
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
                :disabled="editingTemplate?.readOnly"
              ></textarea>
            </div>
            <div class="flex items-center">
              <input
                v-model="templateForm.email_html"
                type="checkbox"
                id="template-html"
                class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                :disabled="editingTemplate?.readOnly"
              />
              <label for="template-html" class="ml-2 text-sm text-gray-700 dark:text-gray-300">Send as HTML</label>
            </div>
          </div>

          <!-- Slack Fields -->
          <div v-if="templateForm.type === 'slack'" class="space-y-3 pt-2 border-t dark:border-gray-700">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slack Message Mode</label>
              <select
                :disabled="editingTemplate?.readOnly"
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
                :disabled="editingTemplate?.readOnly"
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
                :disabled="editingTemplate?.readOnly"
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
                :disabled="editingTemplate?.readOnly"
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
                :disabled="editingTemplate?.readOnly"
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
                :disabled="editingTemplate?.readOnly"
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
              <br />
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
              {{ editingTemplate?.readOnly ? 'Close' : 'Cancel' }}
            </button>
            <button
              v-if="!editingTemplate?.readOnly"
              type="submit"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              {{ editingTemplate ? 'Update' : 'Create' }} Template
            </button>
          </div>
        </form>
      </UCard>
    </ModalWrapper>

        <!-- Delete Confirmation Modal -->
    <ModalWrapper v-model="showDeleteEnvModal" class="max-w-lg">
      <UCard class="shadow-md">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
          <UIcon name="i-lucide-alert-triangle" class="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-950 dark:text-white mb-2 text-center">Delete Environment Variable</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
          Are you sure you want to delete "<strong>{{ envToDelete?.key }}</strong>"?
        </p>
        <div class="flex justify-end space-x-3">
          <UButton
            @click="cancelDeleteEnvVariable"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </UButton>
          <UButton
            @click="deleteEnvVariable"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            Delete Folder
          </UButton>
        </div>
      </UCard>
    </ModalWrapper>

    <!-- User Role Update Modal -->
    <ModalWrapper v-model="showRoleChangeModal" class="max-w-lg">
      <UCard class="shadow-md">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
          <UIcon name="i-lucide-alert-triangle" class="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-950 dark:text-white mb-2 text-center">Update User Role</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
          Are you sure you want to update the role of "<strong>{{ userForRoleChange?.name }}</strong>" from {{userForRoleChange.role == 'admin' ? 'Admin' : 'User'}} to {{userForRoleChange.role == 'admin' ? 'User' : 'Admin'}}?
        </p>
        <div class="flex justify-end space-x-3">
          <UButton
            @click="cancelRoleChange"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </UButton>
          <UButton
            @click="toggleUserRole"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            Update Role
          </UButton>
        </div>
      </UCard>
    </ModalWrapper>

    <!-- Delete Template Modal -->
    <ModalWrapper v-model="showDeleteTemplateModal" class="max-w-md">
      <UCard class="shadow-md">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
          <UIcon name="i-lucide-alert-triangle" class="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-950 dark:text-white mb-2 text-center">Delete Template</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
          Are you sure you want to delete the template "<strong>{{ templateToDelete?.name }}</strong>"? This action cannot be undone.
        </p>
        <div class="flex justify-end space-x-3">
          <UButton
            @click="showDeleteTemplateModal = false"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </UButton>
          <UButton
            @click="deleteProjectTemplate"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            Delete Template
          </UButton>
        </div>
      </UCard>
    </ModalWrapper>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import ModalWrapper from '~/components/ModalWrapper.vue'
const logger = useLogger()
const toast = useToast()
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
const migrating = ref(false)

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
const credentialFilter = ref('All Types')

// Credential filter options for USelectMenu
const credentialFilterOptions = [
  'All Types',
  'Password',
  'Username + Password',
  'Token',
  'SSH Key',
  'Certificate',
  'File',
  'Custom'
]

// Computed for filtered credentials
const filteredCredentials = computed(() => {
  if (!credentialFilter.value || credentialFilter.value === 'All Types') {
    return storedCredentials.value.credentials
  }
  // Map display labels to actual credential types
  const typeMap = {
    'Password': 'password',
    'Username + Password': 'user_pass',
    'Token': 'token',
    'SSH Key': 'ssh_key',
    'Certificate': 'certificate',
    'File': 'file',
    'Custom': 'custom'
  }
  const actualType = typeMap[credentialFilter.value]
  return storedCredentials.value.credentials.filter(cred => cred.type === actualType)
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

// Project Templates
const templates = ref([])
const showDeleteTemplateModal = ref(false)
const templateToDelete = ref(null)

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

const groupMembers = ref([])

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
  return groups.value.filter(group => !userGroupForm.value.groups.includes(group.id))
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
    groups.value = await $fetch('/api/admin/groups')
  } catch (error) {
    logger.error('Failed to load groups:', error)
    groups.value = []
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
  console.log('Editing variable:', variable)
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
    toast.add({ title: $t('admin.environmentVariables.deleteSuccess'), icon: 'i-lucide-check-circle' })
    showDeleteEnvModal.value = false
    envToDelete.value = null
    await loadEnvVariables()
  } catch (error) {
    logger.error('Failed to delete environment variable:', error)
    toast.add({ title: $t('admin.environmentVariables.deleteFailed'), icon: 'i-lucide-x-circle' })
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
        toast.add({ title: $t('admin.updateManagement.updateCheckSuccess', { version: response.latestVersion }), icon: 'i-lucide-alert-circle' })
      } else {
        toast.add({ title: $t('admin.updateManagement.alreadyLatest'), icon: 'i-lucide-check-circle' })
      }
    } else {
      toast.add({ title: response.error || $t('admin.updateManagement.checkFailed'), icon: 'i-lucide-x-circle' })
    }
  } catch (error) {
    logger.error('Failed to check for updates:', error)
    toast.add({ title: $t('admin.updateManagement.checkFailed'), icon: 'i-lucide-x-circle' })
  } finally {
    updateChecking.value = false
  }
}

const triggerUpdate = async () => {
  if (!confirm($t('admin.updateManagement.confirmUpdate', { version: updateInfo.value.latestVersion }))) {
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
      toast.add({ title: $t('admin.updateManagement.updateInitiated'), icon: 'i-lucide-check-circle' })

      // Show a countdown notification
      let countdown = 10
      toast.add({ title: $t('admin.updateManagement.serverRestarting', { count: countdown }), icon: 'i-lucide-alert-circle' })
      const countdownInterval = setInterval(() => {
        if (countdown > 0) {
          countdown--
        } else {
          clearInterval(countdownInterval)
        }
      }, 1000)
    } else {
      toast.add({ title: response.error || $t('admin.updateManagement.updateFailed'), icon: 'i-lucide-x-circle' })
      updateTriggering.value = false
    }
  } catch (error) {
    logger.error('Failed to trigger update:', error)
    toast.add({ title: $t('admin.updateManagement.updateFailed'), icon: 'i-lucide-x-circle' })
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
    toast.add({ title: $t('admin.systemSettings.updateSuccess'), icon: 'i-lucide-check-circle'})
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
  const titleKeys = {
    'branding': 'admin.systemSettings.categories.branding',
    'general': 'admin.systemSettings.categories.general',
    'security': 'admin.systemSettings.categories.security',
    'authentication': 'admin.systemSettings.categories.authentication',
    'notifications': 'admin.systemSettings.categories.notifications',
    'system': 'admin.systemSettings.categories.system'
  }
  return titleKeys[category] ? $t(titleKeys[category]) : category.charAt(0).toUpperCase() + category.slice(1)
}

const getCategoryIcon = (category) => {
  const icons = {
    'branding': 'i-lucide-tag',
    'security': 'i-lucide-shield',
    'authentication': 'i-lucide-users',
    'notifications': 'i-lucide-bell',
    'general': 'i-lucide-settings',
    'system': 'i-lucide-info'
  }
  return icons[category] || 'i-lucide-file-text'
}

// Computed property for accordion items
const settingsAccordionItems = computed(() => {
  return Object.keys(groupedSystemSettings.value).map(category => ({
    slot: category,
    label: getCategoryTitle(category),
    icon: getCategoryIcon(category),
    defaultOpen: category === 'branding'
  }))
})

// Helper to convert select options JSON to array format for USelect
const getSelectOptions = (optionsJson) => {
  try {
    const options = JSON.parse(optionsJson || '[]')
    return options.map(opt => ({ value: opt, label: opt }))
  } catch {
    return []
  }
}

// Credential utility methods
const getCredentialTypeLabel = (type) => {
  const labelKeys = {
    'password': 'admin.credentialVault.types.password',
    'user_pass': 'admin.credentialVault.types.userPass',
    'token': 'admin.credentialVault.types.token',
    'ssh_key': 'admin.credentialVault.types.sshKey',
    'certificate': 'admin.credentialVault.types.certificate',
    'file': 'admin.credentialVault.types.file'
  }
  return labelKeys[type] ? $t(labelKeys[type]) : type
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
    toast.add({ title: $t('admin.credentialVault.deleteSuccess'), icon: 'i-lucide-check-circle' })
    showDeleteCredentialModal.value = false
    credentialToDelete.value = null
    await loadCredentials()
  } catch (error) {
    logger.error('Failed to delete credential:', error)
    toast.add({ title: $t('admin.credentialVault.deleteFailed'), icon: 'i-lucide-x-circle' })
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
    toast.add({ title: $t('admin.userManagement.roleChangeSuccess', { role: newRole }), icon: 'i-lucide-check-circle'})
    showRoleChangeModal.value = false
    userForRoleChange.value = null
    await loadUsers()
  } catch (error) {
    logger.error('Failed to update user role:', error)
    toast.add({ title: $t('admin.userManagement.roleChangeFailed'), icon: 'i-lucide-x-circle' })
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
    if (editingGroup.value) {
      await $fetch(`/api/admin/groups/${editingGroup.value.id}`, {
        method: 'PUT',
        body: {
          name: groupForm.value.name,
          description: groupForm.value.description,
          ldapMappings: groupForm.value.ldapMappings || []
        }
      })
      toast.add({ title: $t('admin.groupManagement.updateSuccess'), icon: 'i-lucide-check-circle' })
    } else {
      await $fetch('/api/admin/groups', {
        method: 'POST',
        body: {
          name: groupForm.value.name,
          description: groupForm.value.description,
          ldapMappings: groupForm.value.ldapMappings || []
        }
      })
      toast.add({ title: $t('admin.groupManagement.createSuccess'), icon: 'i-lucide-check-circle' })
    }

    closeGroupModal()
    await loadGroups()
  } catch (error) {
    logger.error('Failed to save group:', error)
    toast.add({ title: $t('admin.groupManagement.saveFailed'), icon: 'i-lucide-x-circle', color: 'red' })
  }
}

const editGroup = async (group) => {
  editingGroup.value = group
  groupForm.value = {
    name: group.name,
    description: group.description,
    ldapMappings: group.ldapMappings || []
  }

  // Load group members if editing
  if (group.id) {
    try {
      groupMembers.value = await $fetch(`/api/admin/groups/${group.id}/members`)
    } catch (error) {
      logger.error('Failed to load group members:', error)
      groupMembers.value = []
    }
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
    await $fetch(`/api/admin/groups/${groupToDelete.value.id}`, {
      method: 'DELETE'
    })
    toast.add({ title: $t('admin.groupManagement.deleteSuccess'), icon: 'i-lucide-check-circle' })
    showDeleteGroupModal.value = false
    groupToDelete.value = null
    await loadGroups()
  } catch (error) {
    logger.error('Failed to delete group:', error)
    toast.add({ title: $t('admin.groupManagement.deleteFailed'), icon: 'i-lucide-x-circle', color: 'red' })
  }
}

const cancelDeleteGroup = () => {
  showDeleteGroupModal.value = false
  groupToDelete.value = null
}

const closeGroupModal = () => {
  showGroupModal.value = false
  editingGroup.value = null
  groupMembers.value = []
  groupForm.value = {
    name: '',
    description: '',
    ldapMappings: []
  }
}

const removeGroupMember = async (member) => {
  if (!editingGroup.value) return

  try {
    await $fetch(`/api/admin/groups/${editingGroup.value.id}/members/${member.userId}`, {
      method: 'DELETE'
    })
    toast.add({ title: $t('admin.groupManagement.memberRemoveSuccess'), icon: 'i-lucide-check-circle' })

    // Reload members
    groupMembers.value = await $fetch(`/api/admin/groups/${editingGroup.value.id}/members`)
    await loadGroups()
  } catch (error) {
    logger.error('Failed to remove member:', error)
    toast.add({ title: $t('admin.groupManagement.memberRemoveFailed'), icon: 'i-lucide-x-circle', color: 'red' })
  }
}

// User group management methods
const manageUserGroups = async (user) => {
  selectedUser.value = user

  // Load user's current group memberships
  const userMemberships = []
  for (const group of groups.value) {
    try {
      const members = await $fetch(`/api/admin/groups/${group.id}/members`)
      if (members.some(m => m.userId === user.id)) {
        userMemberships.push(group.id)
      }
    } catch (error) {
      logger.error(`Failed to check membership for group ${group.id}:`, error)
    }
  }

  userGroupForm.value = {
    groups: userMemberships
  }
  showUserGroupsModal.value = true
}

const addUserGroup = async (groupId) => {
  if (!groupId || userGroupForm.value.groups.includes(groupId)) return

  userGroupForm.value.groups.push(groupId)
}

const removeUserGroup = (index) => {
  userGroupForm.value.groups.splice(index, 1)
}

const saveUserGroups = async () => {
  if (!selectedUser.value) return

  try {
    // Get current memberships
    const currentMemberships = []
    for (const group of groups.value) {
      try {
        const members = await $fetch(`/api/admin/groups/${group.id}/members`)
        if (members.some(m => m.userId === selectedUser.value.id)) {
          currentMemberships.push(group.id)
        }
      } catch (error) {
        logger.error(`Failed to check membership:`, error)
      }
    }

    // Determine which groups to add and remove
    const toAdd = userGroupForm.value.groups.filter(gid => !currentMemberships.includes(gid))
    const toRemove = currentMemberships.filter(gid => !userGroupForm.value.groups.includes(gid))

    // Add new memberships
    for (const groupId of toAdd) {
      await $fetch(`/api/admin/groups/${groupId}/members`, {
        method: 'POST',
        body: { userId: selectedUser.value.id }
      })
    }

    // Remove old memberships
    for (const groupId of toRemove) {
      await $fetch(`/api/admin/groups/${groupId}/members/${selectedUser.value.id}`, {
        method: 'DELETE'
      })
    }

    toast.add({ title: $t('admin.userManagement.groupsUpdateSuccess'), icon: 'i-lucide-check-circle' })
    closeUserGroupsModal()
    await loadGroups()
  } catch (error) {
    logger.error('Failed to update user groups:', error)
    toast.add({ title: $t('admin.userManagement.groupsUpdateFailed'), icon: 'i-lucide-x-circle', color: 'red' })
  }
}

const closeUserGroupsModal = () => {
  showUserGroupsModal.value = false
  selectedUser.value = null
  userGroupForm.value = {
    groups: []
  }
}

// Migration function
const migrateI18n = async () => {
  migrating.value = true
  try {
    const response = await $fetch('/api/admin/migrate-i18n', {
      method: 'POST'
    })
    
    if (response.success) {
      toast.add({ 
        title: `Migration successful! Updated ${response.migratedCount} settings.`, 
        icon: 'i-lucide-check-circle' 
      })
      // Reload settings to see the changes
      await loadSystemSettings()
    }
  } catch (error) {
    logger.error('Migration failed:', error)
    toast.add({ 
      title: 'Migration failed: ' + (error.data?.statusMessage || error.message), 
      icon: 'i-lucide-x-circle' 
    })
  } finally {
    migrating.value = false
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
    loadProjectTemplates(),
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

// Load project templates
async function loadProjectTemplates() {
  try {
    const response = await $fetch('/api/templates')
    if (response.success) {
      templates.value = response.templates
    }
  } catch (error) {
    logger.error('Failed to load project templates:', error)
    toast.add({
      title: 'Failed to load templates',
      icon: 'i-lucide-x-circle'
    })
  }
}

// Confirm delete PROJECT template
function confirmDeleteProjectTemplate(template) {
  templateToDelete.value = template
  showDeleteTemplateModal.value = true
}

// Delete PROJECT template
async function deleteProjectTemplate() {
  if (!templateToDelete.value) return

  try {
    const response = await $fetch(`/api/templates/${templateToDelete.value.id}`, {
      method: 'DELETE'
    })

    if (response.success) {
      toast.add({
        title: 'Template deleted successfully',
        icon: 'i-lucide-check-circle'
      })
      await loadProjectTemplates()
    } else {
      toast.add({
        title: 'Failed to delete template',
        icon: 'i-lucide-x-circle'
      })
    }
  } catch (error) {
    logger.error('Failed to delete template:', error)
    toast.add({
      title: 'Failed to delete template',
      icon: 'i-lucide-x-circle'
    })
  } finally {
    showDeleteTemplateModal.value = false
    templateToDelete.value = null
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
      toast.add({ title: 'Template saved successfully', icon: 'i-lucide-check-circle' })
    }
  } catch (error) {
    logger.error('Failed to save template:', error)
    toast.add({ title: 'Failed to save template' + (error.data?.message || error.message), icon: 'i-lucide-x-circle' })
  }
}

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
    toast.add({ title: 'Template deleted successfully!', icon: 'i-lucide-check-circle' })
    showDeleteTemplateModal.value = false
    templateToDelete.value = null
    await loadNotificationTemplates()
  } catch (error) {
    logger.error('Failed to delete template:', error)
    toast.add({ title: 'Failed to delete template: ' + (error.data?.message || error.message), icon: 'i-lucide-x-circle' })
  }
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

// View notification template (read-only)
function viewNotificationTemplate(template) {
  editingTemplate.value = { ...template, readOnly: true }
  templateForm.value = {
    name: template.name,
    description: template.description || '',
    type: template.type,
    email_subject: template.email_subject || '',
    email_body: template.email_body || '',
    email_html: template.email_html || false,
    slack_message: template.slack_message || '',
    slack_blocks: template.slack_blocks || '',
    slack_mode: template.slack_mode || 'simple',
    webhook_method: template.webhook_method || 'POST',
    webhook_headers: template.webhook_headers || '{"Content-Type": "application/json"}',
    webhook_body: template.webhook_body || ''
  }
  showTemplateModal.value = true
}

// Edit notification template
function editNotificationTemplate(template) {
  editingTemplate.value = { ...template }
  templateForm.value = {
    name: template.name,
    description: template.description || '',
    type: template.type,
    email_subject: template.email_subject || '',
    email_body: template.email_body || '',
    email_html: template.email_html || false,
    slack_message: template.slack_message || '',
    slack_blocks: template.slack_blocks || '',
    slack_mode: template.slack_mode || 'simple',
    webhook_method: template.webhook_method || 'POST',
    webhook_headers: template.webhook_headers || '{"Content-Type": "application/json"}',
    webhook_body: template.webhook_body || ''
  }
  showTemplateModal.value = true
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
    toast.add({ title: 'Failed to Load Agents', icon: 'i-lucide-' })
  } finally {
    loadingAgents.value = false
  }
}

// Load latest agent version
async function loadLatestAgentVersion() {
  try {

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
    toast.add({ title: newValue === 'true' ? $t('admin.agentTemplates.autoUpdateEnabled', { name: agent.name }) : $t('admin.agentTemplates.autoUpdateDisabled', { name: agent.name }) })
  } catch (error) {
    console.error('Failed to update agent settings:', error)
    toast.add({ title: $t('admin.agentTemplates.updateSettingsFailed'), icon: 'i-lucide-circle-x' })
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
    toast.add({ title: $t('admin.agentTemplates.updateTriggered', { name: agent.name }) })
    // Reload agents after a short delay
    setTimeout(async () => {
      await loadAgents()
    }, 3000)
  } catch (error) {
    console.error('Failed to trigger agent update:', error)
    toast.add({ title: $t('admin.agentTemplates.updateTriggerFailed'), icon: 'i-lucide-circle-x' })
  } finally {
    updatingAgent.value = null
  }
}
</script>