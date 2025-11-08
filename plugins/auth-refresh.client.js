/**
 * Automatic Token Refresh Plugin
 * 
 * This plugin intercepts all $fetch calls and automatically refreshes
 * expired access tokens using the refresh token.
 * 
 * CRITICAL: This prevents users from being logged out every 15 minutes
 * when their short-lived JWT access token expires.
 */

export default defineNuxtPlugin((nuxtApp) => {
  const authStore = useAuthStore()
  const logger = useLogger()
  const route = useRoute()

  let isRefreshing = false
  let refreshPromise = null
  let originalFetch = null
  let isLoggingOut = false  // Prevent logout cascades
  let isHMRReloading = false  // Detect HMR reloads

  // Detect HMR reloads in development
  if (import.meta.hot) {
    import.meta.hot.on('vite:beforeUpdate', () => {
      isHMRReloading = true
      logger.debug('HMR reload detected - pausing auth operations')
      
      // Store the last refresh time in sessionStorage to survive HMR
      if (authStore.isAuthenticated) {
        sessionStorage.setItem('lastTokenRefresh', Date.now().toString())
      }
      
      // Resume after reload completes
      setTimeout(() => {
        isHMRReloading = false
        logger.debug('HMR reload complete - resuming auth operations')
      }, 2000)
    })
  }

  // Intercept all $fetch calls
  nuxtApp.hook('app:created', () => {
    // Store reference to original fetch before proxying
    originalFetch = globalThis.$fetch.create({})

    const currentFetch = globalThis.$fetch

    globalThis.$fetch = new Proxy(currentFetch, {
      async apply(target, thisArg, args) {
        // Don't intercept refresh endpoint calls to prevent recursion
        const url = args[0]
        if (typeof url === 'string' && url.includes('/api/auth/refresh')) {
          return await Reflect.apply(target, thisArg, args)
        }

        try {
          // Make the original request
          return await Reflect.apply(target, thisArg, args)
        } catch (error) {
          // Don't handle auth errors during HMR
          if (isHMRReloading) {
            logger.debug('Skipping auth error handling during HMR reload')
            throw error
          }

          // Check if error is 401 Unauthorized
          if (error?.response?.status === 401 || error?.statusCode === 401) {
            logger.info('Received 401 error - attempting token refresh')

            // Don't try to refresh if already logging out
            if (isLoggingOut) {
              throw error
            }

            // Check if we have a refresh token before attempting refresh
            if (!hasRefreshTokenCookie()) {
              logger.warn('No refresh token available - logging out')
              await performLogout()
              throw error
            }

            // Attempt to refresh the token
            const refreshed = await refreshAccessToken()

            if (refreshed) {
              // Retry the original request
              logger.info('Token refreshed successfully - retrying request')
              return await Reflect.apply(target, thisArg, args)
            } else {
              // Refresh failed - log user out
              logger.warn('Token refresh failed - logging out')
              await performLogout()
              throw error
            }
          }

          // Re-throw non-401 errors
          throw error
        }
      }
    })
  })

  /**
   * Perform logout with cascade prevention
   */
  async function performLogout() {
    if (isLoggingOut) {
      return // Already logging out, don't cascade
    }
    
    isLoggingOut = true
    try {
      await authStore.logout()
    } finally {
      // Reset after a delay to allow logout to complete
      setTimeout(() => {
        isLoggingOut = false
      }, 1000)
    }
  }

  /**
   * Refresh the access token using the refresh token
   * Returns true if successful, false otherwise
   */
  async function refreshAccessToken() {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshing) {
      return await refreshPromise
    }

    isRefreshing = true
    refreshPromise = (async () => {
      try {
        // Use original fetch (before proxy) to avoid recursion
        const fetchFn = originalFetch || globalThis.$fetch
        
        // Call refresh endpoint (uses HttpOnly refresh-token cookie)
        const response = await fetchFn('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include' // Ensure cookies are sent
        })

        if (response && response.user) {
          // Update auth store with new user data
          authStore.user = response.user
          authStore.isAuthenticated = true

          logger.info('Access token refreshed successfully')
          return true
        }

        return false
      } catch (error) {
        logger.error('Token refresh failed:', error)
        return false
      } finally {
        isRefreshing = false
        refreshPromise = null
      }
    })()

    return await refreshPromise
  }

  /**
   * Check if refresh token cookie exists
   */
  function hasRefreshTokenCookie() {
    if (import.meta.server) return false
    
    const cookies = document.cookie.split('; ')
    const hasToken = cookies.some(cookie => cookie.startsWith('refresh-token='))
    
    // Log cookie state for debugging
    if (!hasToken && authStore.isAuthenticated) {
      logger.debug('Cookie check: refresh-token not found', {
        totalCookies: cookies.length,
        cookieNames: cookies.map(c => c.split('=')[0])
      })
    }
    
    return hasToken
  }

  /**
   * Proactive token refresh timer
   * Refreshes token 1 minute before it expires (at 14 minutes)
   */
  let refreshTimer = null

  const startProactiveRefresh = () => {
    // Clear any existing timer
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }

    // Refresh every 14 minutes (1 minute before expiry)
    refreshTimer = setInterval(async () => {
      // Skip if logging out or HMR is reloading
      if (isLoggingOut || isHMRReloading) {
        return
      }

      // Only refresh if both conditions are true:
      // 1. User is authenticated in store
      // 2. Refresh token cookie exists
      const isAuth = authStore.isAuthenticated
      const hasCookie = hasRefreshTokenCookie()
      
      if (isAuth && hasCookie) {
        logger.info('Proactive token refresh triggered')
        const success = await refreshAccessToken()
        
        // If proactive refresh fails, log out the user
        if (!success) {
          logger.warn('Proactive refresh failed - logging out')
          await performLogout()
        }
      } else if (isAuth && !hasCookie) {
        // Auth store says authenticated but no refresh token
        // This can happen if cookies were cleared manually or expired
        // In development, this might be due to HMR - be more forgiving
        if (import.meta.dev) {
          logger.warn('No refresh token cookie in dev mode - will retry on next interval')
          // Don't log out immediately in dev, give it another chance
        } else {
          logger.warn('No refresh token cookie found but store is authenticated - logging out')
          await performLogout()
        }
      }
      // If !isAuth, just skip silently (user is logged out, which is fine)
    }, 14 * 60 * 1000) // 14 minutes
  }

  const stopProactiveRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
      logger.debug('Proactive refresh timer stopped')
    }
  }

  // Start proactive refresh when authenticated
  watch(() => authStore.isAuthenticated, (isAuth) => {
    if (isAuth) {
      logger.debug('Starting proactive refresh timer')
      startProactiveRefresh()
    } else {
      logger.debug('Stopping proactive refresh timer')
      stopProactiveRefresh()
    }
  }, { immediate: true })

  // Cleanup on app unmount
  nuxtApp.hook('app:beforeUnmount', () => {
    stopProactiveRefresh()
  })

  logger.info('Auth refresh plugin initialized')
})
