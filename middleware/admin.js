export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()
  
  // Initialize auth state on client side only
  if (import.meta.client) {
    // Always try to initialize auth if we don't have user data yet
    if (!authStore.user) {
      await authStore.initializeAuth()
    }
  }
  
  // Check if user is authenticated
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }
  
  // Check if user has admin role
  if (!authStore.user || authStore.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied. Admin privileges required.'
    })
  }
})