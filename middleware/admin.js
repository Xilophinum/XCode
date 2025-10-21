export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()
  
  // First ensure user is authenticated
  if (import.meta.client && !authStore.isAuthenticated) {
    await authStore.initializeAuth()
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