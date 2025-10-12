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

// Initialize WebSocket connection when app loads
onMounted(async () => {
  try {
    // Wait for auth to be initialized first
    if (!authStore.isAuthenticated) {
      await authStore.initializeAuth()
    }
    
    // Only connect WebSocket if user is authenticated
    if (authStore.isAuthenticated) {
      console.log('🌐 Initializing global WebSocket connection...')
      await webSocketStore.connect()
    }
  } catch (error) {
    console.error('❌ Failed to initialize global WebSocket:', error)
  }
})

// Cleanup WebSocket on app unmount
onUnmounted(() => {
  webSocketStore.disconnect()
})
</script>
