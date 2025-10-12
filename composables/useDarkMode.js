import { ref, computed, onMounted, watch, readonly } from 'vue'

const isDark = ref(false)

export const useDarkMode = () => {
  const toggle = () => {
    isDark.value = !isDark.value
    updateDOM()
    saveToLocalStorage()
  }

  const enable = () => {
    isDark.value = true
    updateDOM()
    saveToLocalStorage()
  }

  const disable = () => {
    isDark.value = false
    updateDOM()
    saveToLocalStorage()
  }

  const updateDOM = () => {
    if (process.client) {
      if (isDark.value) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  const saveToLocalStorage = () => {
    if (process.client) {
      localStorage.setItem('darkMode', isDark.value.toString())
    }
  }

  const loadFromLocalStorage = () => {
    if (process.client) {
      const stored = localStorage.getItem('darkMode')
      if (stored !== null) {
        isDark.value = stored === 'true'
      } else {
        // Default to system preference
        isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      updateDOM()
    }
  }

  const systemPreference = computed(() => {
    if (process.client) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  // Initialize on mount
  onMounted(() => {
    loadFromLocalStorage()
    
    // Listen for system preference changes
    if (process.client) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', (e) => {
        // Only update if user hasn't manually set a preference
        if (localStorage.getItem('darkMode') === null) {
          isDark.value = e.matches
          updateDOM()
        }
      })
    }
  })

  return {
    isDark: readonly(isDark),
    toggle,
    enable,
    disable,
    systemPreference
  }
}