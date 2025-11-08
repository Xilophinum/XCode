export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()
  
  // Initialize auth state on client side only
  if (import.meta.client) {
    // Only initialize if we haven't tried yet
    if (!authStore.user && !authStore.isAuthenticated && !authStore.isLoading) {
      try {
        await authStore.initializeAuth()
      } catch (error) {
        // Silently fail - user will be redirected to login below
      }
    }
  }
  
  // Check if user is authenticated
  if (!authStore.isAuthenticated) {
    // Redirect to login page if not authenticated
    return navigateTo('/login')
  }
})