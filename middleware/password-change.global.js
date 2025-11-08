/**
 * Global middleware to enforce password change requirement
 * Redirects users with passwordChangeRequired flag to /change-password
 */
export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip middleware on server-side
  if (process.server) return

  // Skip for these routes to prevent redirect loops
  const allowedRoutes = ['/change-password', '/login', '/logout']
  if (allowedRoutes.includes(to.path)) {
    return
  }

  // Skip for public routes
  if (to.path.startsWith('/api/public')) {
    return
  }

  // Check auth status
  const authStore = useAuthStore()
  
  // If not authenticated yet, let auth middleware handle it
  if (!authStore.user) {
    return
  }

  // Check if password change is required
  if (authStore.user.passwordChangeRequired === true) {
    console.log('Password change required, redirecting to /change-password')
    return navigateTo('/change-password')
  }
})
