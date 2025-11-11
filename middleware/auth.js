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
  
  // Check if password change is required (skip for change-password page itself)
  if (authStore.user?.passwordChangeRequired === true && to.path !== '/change-password') {
    console.log('Password change required - redirecting to /change-password')
    return navigateTo('/change-password')
  }
})