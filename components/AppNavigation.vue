<template>
  <nav class="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
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
            <img
              v-else
              src="/public/logo.png"
              :alt="brandName + ' Logo'"
              class="h-8 w-8 object-contain"
            >
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
              class="w-64 px-3 py-2 pl-10 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
            <UIcon name="i-lucide-search" class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            
            <!-- Search Results Dropdown -->
            <div
              v-if="showSearchResults && searchResults.length > 0"
              class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto"
            >
              <div
                v-for="result in searchResults.slice(0, 8)"
                :key="result.id"
                @mousedown="navigateToResult(result)"
                class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0"
              >
                <div class="flex items-center space-x-2">
                  <UIcon v-if="result.type === 'folder'" name="i-lucide-folder" class="h-4 w-4 text-blue-500" />
                  <UIcon v-else name="i-lucide-file-text" class="h-4 w-4 text-green-500" />
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
            {{ $t('common.welcome') }}, {{ authStore.user?.name }}
          </span>
          
          <UButton
            @click="handleLogout"
            color="neutral"
            variant="outline"
            icon="i-lucide-log-out"
          >
            Logout
          </UButton>

          <!-- Dark Mode Toggle -->
          <UTooltip :text="$t('common.toggleDarkMode')">
            <UButton
              @click="darkMode.toggle()"
              color="neutral"
              variant="outline"
              square
              size="xl"
            >
              <UIcon name="i-lucide-sun" v-if="isDark"/>
              <UIcon name="i-lucide-moon" v-else />
            </UButton>
          </UTooltip>
        </div>

        <!-- Mobile menu button -->
        <div class="md:hidden flex items-center space-x-1">
          <!-- Mobile Search Button -->
          <UTooltip :text="$t('common.search')">
            <UButton
              @click="showMobileSearch = !showMobileSearch"
              color="neutral"
              variant="outline"
              icon="i-lucide-search"
              square
            />
          </UTooltip>
          
          <!-- Mobile actions slot - limited to essential buttons only -->
          <div class="flex items-center space-x-1">
            <slot name="mobile-actions" />
          </div>
          
          <!-- Mobile hamburger menu -->
          <UTooltip :text="$t('common.menu')">
            <UButton
              @click="toggleMobileMenu"
              color="neutral"
              variant="outline"
              icon="i-lucide-menu"
              square
            />
          </UTooltip>
        </div>
      </div>

      <!-- Mobile Search -->
      <div v-if="showMobileSearch" class="md:hidden border-t border-gray-200 dark:border-gray-800 p-4">
        <div class="relative">
          <input
            v-model="searchQuery"
            @input="handleSearch"
            type="text"
            placeholder="Search projects and folders..."
            class="w-full px-3 py-2 pl-10 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
          <UIcon name="i-lucide-search" class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
        
        <!-- Mobile Search Results -->
        <div v-if="searchResults.length > 0" class="mt-3 space-y-1">
          <div
            v-for="result in searchResults.slice(0, 5)"
            :key="result.id"
            @click="navigateToResult(result)"
            class="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer"
          >
            <UIcon v-if="result.type === 'folder'" name="i-lucide-folder" class="h-4 w-4 text-blue-500" />
            <UIcon v-else name="i-lucide-file-text" class="h-4 w-4 text-green-500" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ result.name }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ getResultPath(result) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-if="showMobileMenu" class="md:hidden border-t border-gray-200 dark:border-gray-800 py-2">
        <!-- Mobile breadcrumbs -->
        <div v-if="breadcrumbs.length > 0" class="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
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

          <UButton
            @click="handleLogout"
            color="neutral"
            variant="ghost"
            icon="i-lucide-log-out"
            block
            class="justify-start"
          >
            Logout
          </UButton>

          <!-- Dark mode toggle -->
          <UButton
            @click="darkMode.toggle()"
            color="neutral"
            variant="ghost"
            block
            class="justify-start"
          >
            <template #leading>
              <UIcon name="i-lucide-sun" v-if="isDark"/>
              <UIcon name="i-lucide-moon" v-else />
            </template>
            {{ isDark ? $t('common.lightMode') : $t('common.darkMode') }}
          </UButton>
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
const brandName = ref('FlowForge')
const appLogo = ref(null)
const { t } = useI18n()
const isDark = computed(() => darkMode.isDark.value)

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
    const response = await $fetch('/api/public/system-settings/brand_name')
    if (response?.value) {
      brandName.value = response.value
    }
  } catch (error) {
    // Ignore errors, use default branding
    logger.info('Using default branding settings')
  }

  try {
    const logoResponse = await $fetch('/api/public/system-settings/app_logo')
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