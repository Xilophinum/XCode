<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </UApp>
</template>

<script setup>
// Initialize WebSocket store globally for the entire app
const webSocketStore = useWebSocketStore()
const authStore = useAuthStore()
const logger = useLogger()
// Initialize WebSocket connection when app loads
onMounted(async () => {
  try {
    // Wait for auth to be initialized first
    if (!authStore.isAuthenticated) {
      await authStore.initializeAuth()
    }
    
    // Only connect WebSocket if user is authenticated
    if (authStore.isAuthenticated) {
      await webSocketStore.connect()
    }
  } catch (error) {
    logger.error('Failed to initialize global WebSocket:', error)
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      e.stopPropagation()
    }
  }, true)
  
  try {
    const logLevel = await $fetch('/api/public/system-settings/log_level')
    if (logLevel?.value) {
      logger.setLevel(logLevel.value)
      logger.info('Client Log level set to:', logLevel.value)
    }
  } catch (error) {
    logger.warn('Failed to load log level setting:', error)
  }
})

// Cleanup WebSocket on app unmount
onUnmounted(() => {
  webSocketStore.disconnect()
})
</script>
