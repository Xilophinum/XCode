<template>
  <nav class="bg-white dark:bg-gray-950 shadow-sm border-b border-gray-200 dark:border-gray-700">
    <div class="max-w mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <!-- Left side - Logo and breadcrumbs (desktop) -->
        <div class="flex items-center space-x-2">
          <NuxtLink 
            to="/"
            class="flex items-center space-x-2 text-xl font-semibold text-gray-950 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <!-- Dynamic App Logo -->
            <img
              v-if="appLogo"
              :src="appLogo"
              :alt="brandName + ' Logo'"
              class="h-8 w-8 object-contain"
            >
            <!-- Default Icon if no logo -->
            <svg
              v-else
              class="h-8 w-8 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
            </svg>
            <!-- Dynamic Brand Name -->
            <span class="hidden sm:inline">{{ brandName }}</span>
          </NuxtLink>
          
          <!-- Breadcrumb for non-root pages (hidden on mobile) -->
          <template v-if="breadcrumbs.length > 0" v-for="(crumb, index) in breadcrumbs" :key="index">
            <span class="text-gray-400 dark:text-gray-500 hidden md:inline">/</span>
            <NuxtLink 
              v-if="index < breadcrumbs.length - 1 && isClickableBreadcrumb(index)"
              :to="getBreadcrumbUrl(index)"
              class="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hidden md:inline"
            >
              {{ capitalizeFirst(crumb) }}
            </NuxtLink>
            <span 
              v-else-if="index < breadcrumbs.length - 1"
              class="text-gray-600 dark:text-gray-300 hidden md:inline cursor-default"
            >
              {{ capitalizeFirst(crumb) }}
            </span>
            <span v-else class="text-gray-600 dark:text-gray-300 font-medium hidden md:inline">{{ capitalizeFirst(crumb) }}</span>
          </template>
        </div>
        
        <!-- Right side - Desktop navigation -->
        <div class="hidden md:flex items-center space-x-4">
          <!-- Search -->
          <div class="relative">
            <input
              v-model="searchQuery"
              @input="handleSearch"
              @focus="showSearchResults = true"
              @blur="hideSearchResults"
              type="text"
              placeholder="Search projects and folders..."
              class="w-64 px-3 py-2 pl-10 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
            <svg class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            
            <!-- Search Results Dropdown -->
            <div
              v-if="showSearchResults && searchResults.length > 0"
              class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto"
            >
              <div
                v-for="result in searchResults.slice(0, 8)"
                :key="result.id"
                @mousedown="navigateToResult(result)"
                class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <div class="flex items-center space-x-2">
                  <svg v-if="result.type === 'folder'" class="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <svg v-else class="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ result.name }}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ getResultPath(result) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Slot for additional buttons/content -->
          <slot name="actions" />
          

          
          <span class="text-sm text-gray-700 dark:text-gray-200">
            Welcome, {{ authStore.user?.name }}
          </span>
          <button
            @click="handleLogout"
            class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="mr-2"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h7v2H5v14h7v2zm11-4l-1.375-1.45l2.55-2.55H9v-2h8.175l-2.55-2.55L16 7l5 5z"/></svg>
            Logout
          </button>

          <!-- Dark Mode Toggle -->
          <button
            @click="darkMode.toggle()"
            class="inline-flex items-center p-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Toggle dark mode"
          >
            <!-- Sun icon for light mode -->
            <svg
              v-if="darkMode.isDark.value"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
            <!-- Moon icon for dark mode -->
            <svg
              v-else
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
            </svg>
          </button>
        </div>

        <!-- Mobile menu button -->
        <div class="md:hidden flex items-center space-x-1">
          <!-- Mobile Search Button -->
          <button
            @click="showMobileSearch = !showMobileSearch"
            class="inline-flex items-center p-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Search"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          <!-- Mobile actions slot - limited to essential buttons only -->
          <div class="flex items-center space-x-1">
            <slot name="mobile-actions" />
          </div>
          
          <!-- Mobile hamburger menu -->
          <button
            @click="toggleMobileMenu"
            class="inline-flex items-center p-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Menu"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Search -->
      <div v-if="showMobileSearch" class="md:hidden border-t border-gray-200 dark:border-gray-700 p-4">
        <div class="relative">
          <input
            v-model="searchQuery"
            @input="handleSearch"
            type="text"
            placeholder="Search projects and folders..."
            class="w-full px-3 py-2 pl-10 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
          <svg class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <!-- Mobile Search Results -->
        <div v-if="searchResults.length > 0" class="mt-3 space-y-1">
          <div
            v-for="result in searchResults.slice(0, 5)"
            :key="result.id"
            @click="navigateToResult(result)"
            class="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
          >
            <svg v-if="result.type === 'folder'" class="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <svg v-else class="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ result.name }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ getResultPath(result) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-if="showMobileMenu" class="md:hidden border-t border-gray-200 dark:border-gray-700 py-2">
        <!-- Mobile breadcrumbs -->
        <div v-if="breadcrumbs.length > 0" class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Navigation:</div>
          <div class="flex flex-wrap items-center gap-1">
            <template v-for="(crumb, index) in breadcrumbs" :key="index">
              <span v-if="index > 0" class="text-gray-400 dark:text-gray-500">/</span>
              <NuxtLink 
                v-if="index < breadcrumbs.length - 1 && isClickableBreadcrumb(index)"
                :to="getBreadcrumbUrl(index)"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                @click="showMobileMenu = false"
              >
                {{ capitalizeFirst(crumb) }}
              </NuxtLink>
              <span 
                v-else-if="index < breadcrumbs.length - 1"
                class="text-gray-600 dark:text-gray-300"
              >
                {{ capitalizeFirst(crumb) }}
              </span>
              <span v-else class="text-gray-600 dark:text-gray-300 font-medium">{{ capitalizeFirst(crumb) }}</span>
            </template>
          </div>
        </div>

        <!-- Mobile menu items -->
        <div class="px-4 py-2 space-y-3">
          <!-- User info -->
          <div class="text-sm text-gray-700 dark:text-gray-200">
            Welcome, {{ authStore.user?.name }}
          </div>

          <!-- Logout button -->
          <button
            @click="handleLogout"
            class="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="mr-2"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h7v2H5v14h7v2zm11-4l-1.375-1.45l2.55-2.55H9v-2h8.175l-2.55-2.55L16 7l5 5z"/></svg>
            Logout
          </button>

          <!-- Dark mode toggle -->
          <button
            @click="darkMode.toggle()"
            class="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            <svg
              v-if="darkMode.isDark.value"
              class="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
            <svg
              v-else
              class="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
            </svg>
            {{ darkMode.isDark.value ? 'Light Mode' : 'Dark Mode' }}
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  breadcrumbs: {
    type: Array,
    default: () => []
  }
})

const authStore = useAuthStore()
const projectsStore = useProjectsStore()
const darkMode = useDarkMode()
const router = useRouter()
const logger = useLogger()
// Mobile menu state
const showMobileMenu = ref(false)
const showMobileSearch = ref(false)

// Search state
const searchQuery = ref('')
const searchResults = ref([])
const showSearchResults = ref(false)

// Branding settings
const brandName = ref('XCode')
const appLogo = ref(null)

const getBreadcrumbUrl = (index) => {
  const pathUpToIndex = props.breadcrumbs.slice(0, index + 1)
  if (pathUpToIndex.length === 0) return '/browse'
  
  // Handle special single-level pages
  if (pathUpToIndex.length === 1) {
    const page = pathUpToIndex[0]
    if (page === 'admin' || page === 'agents') {
      return `/${page}`
    }
  }
  
  return `/browse?path=${pathUpToIndex.join('/')}`
}

const capitalizeFirst = (str) => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const isClickableBreadcrumb = (index) => {
  const route = useRoute()
  const currentPath = route.path
  
  // Handle special single-level pages (admin, agents) - they should not be clickable when you're on them
  if (props.breadcrumbs.length === 1) {
    const page = props.breadcrumbs[0]
    if (page === 'admin' || page === 'agents') {
      return false // Don't make single breadcrumb clickable when on that page
    }
  }
  
  // Check if we're in a project context (editor, builds, or build page)
  const isInProjectContext = currentPath.includes('/editor') || currentPath.includes('/builds') || currentPath.includes('/build/')
  
  if (!isInProjectContext) {
    // Not in a project, all breadcrumbs are clickable (except the last one which is handled elsewhere)
    return true
  }
  
  // In project context: the project name should not be clickable
  // For build pages, also make 'build' and build number non-clickable
  if (currentPath.includes('/build/')) {
    // In build view: project name, 'build', and build number are not clickable
    const isProjectName = index === props.breadcrumbs.length - 3
    const isBuildLabel = index === props.breadcrumbs.length - 2
    const isBuildNumber = index === props.breadcrumbs.length - 1
    return !isProjectName && !isBuildLabel && !isBuildNumber
  } else {
    // In editor/builds view: the project name (second-to-last breadcrumb) should not be clickable
    const isProjectName = index === props.breadcrumbs.length - 2
    return !isProjectName
  }
}

const handleLogout = async () => {
  showMobileMenu.value = false
  await authStore.logout()
}

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
}

// Search functionality
const handleSearch = () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  
  const query = searchQuery.value.toLowerCase()
  const allItems = projectsStore.allItems || []
  
  searchResults.value = allItems
    .filter(item => item.name.toLowerCase().includes(query))
    .sort((a, b) => {
      // Prioritize exact matches, then projects, then folders
      const aExact = a.name.toLowerCase() === query
      const bExact = b.name.toLowerCase() === query
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      if (a.type !== b.type) return a.type === 'project' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

const navigateToResult = (result) => {
  searchQuery.value = ''
  searchResults.value = []
  showSearchResults.value = false
  showMobileSearch.value = false
  
  if (result.type === 'project') {
    const projectPath = [...result.path, result.name]
    router.push(`/${projectPath.join('/')}/editor`)
  } else {
    const folderPath = [...result.path, result.name]
    router.push(`/browse?path=${folderPath.join('/')}`)
  }
}

const getResultPath = (result) => {
  if (!result.path || result.path.length === 0) return 'Root'
  return result.path.join(' / ')
}

const hideSearchResults = () => {
  setTimeout(() => {
    showSearchResults.value = false
  }, 150)
}

const loadBrandingSettings = async () => {
  try {
    // Try to load branding settings, but don't fail if we can't
    const response = await $fetch('/api/admin/system-settings/brand_name')
    if (response?.value) {
      brandName.value = response.value
    }
  } catch (error) {
    // Ignore errors, use default branding
    logger.info('Using default branding settings')
  }

  try {
    const logoResponse = await $fetch('/api/admin/system-settings/app_logo')
    if (logoResponse?.value) {
      appLogo.value = logoResponse.value
    }
  } catch (error) {
    // Ignore errors, no logo
    logger.info('No custom logo configured')
  }
}

// Load branding settings on mount
onMounted(() => {
  loadBrandingSettings()
})
</script>