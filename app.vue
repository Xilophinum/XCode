<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
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
})

// Cleanup WebSocket on app unmount
onUnmounted(() => {
  webSocketStore.disconnect()
})
</script>
