export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()
  
  // Initialize auth state on first load
  if (import.meta.client && !authStore.isAuthenticated) {
    await authStore.initializeAuth()
  }
  
  // Check if user is authenticated
  if (!authStore.isAuthenticated) {
    // Redirect to login page if not authenticated
    return navigateTo('/login')
  }
})