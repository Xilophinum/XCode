export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()
  
  // Initialize auth state on first load
  if (import.meta.client && !authStore.isAuthenticated) {
    authStore.initializeAuth()
  }
  
  // Redirect to home if already authenticated
  if (authStore.isAuthenticated) {
    return navigateTo('/')
  }
})