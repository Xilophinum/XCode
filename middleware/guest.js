export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()
  
  // Initialize auth state on client side only
  if (import.meta.client) {
    // Always try to initialize auth if we don't have user data yet
    if (!authStore.user) {
      await authStore.initializeAuth()
    }
  }
  
  // Redirect to home if already authenticated
  if (authStore.isAuthenticated) {
    return navigateTo('/')
  }
})