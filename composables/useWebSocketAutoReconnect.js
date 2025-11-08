/**
 * WebSocket Auto-Reconnect Composable
 * 
 * Handles automatic WebSocket reconnection when JWT tokens expire
 * Works in conjunction with the auth-refresh plugin
 */

export const useWebSocketAutoReconnect = () => {
  const webSocketStore = useWebSocketStore()
  const authStore = useAuthStore()
  const logger = useLogger()

  let reconnectTimer = null

  /**
   * Start monitoring WebSocket connection and auth state
   */
  const startMonitoring = () => {
    // When auth state changes to authenticated, ensure WebSocket is connected
    watch(() => authStore.isAuthenticated, async (isAuth) => {
      if (isAuth && !webSocketStore.isConnected) {
        logger.info('Auth state changed to authenticated - reconnecting WebSocket')
        await webSocketStore.connect()
      } else if (!isAuth && webSocketStore.isConnected) {
        logger.info('Auth state changed to unauthenticated - disconnecting WebSocket')
        webSocketStore.disconnect()
      }
    })

    // Monitor WebSocket authentication failures
    watch(() => webSocketStore.connectionError, async (error) => {
      if (error && error.includes('authentication')) {
        logger.warn('WebSocket authentication error detected - will reconnect after token refresh')
        
        // Disconnect and wait for token refresh
        webSocketStore.disconnect()
        
        // Set up reconnection after a short delay to allow token refresh
        if (reconnectTimer) clearTimeout(reconnectTimer)
        
        reconnectTimer = setTimeout(async () => {
          if (authStore.isAuthenticated) {
            logger.info('Attempting WebSocket reconnection after token refresh')
            await webSocketStore.connect()
          }
        }, 2000) // 2 second delay
      }
    })
  }

  /**
   * Manually trigger WebSocket reconnection
   * Useful after token refresh
   */
  const reconnect = async () => {
    if (!authStore.isAuthenticated) {
      logger.warn('Cannot reconnect WebSocket - user not authenticated')
      return false
    }

    try {
      webSocketStore.disconnect()
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      await webSocketStore.connect()
      logger.info('WebSocket reconnected successfully')
      return true
    } catch (error) {
      logger.error('WebSocket reconnection failed:', error)
      return false
    }
  }

  /**
   * Cleanup function
   */
  const cleanup = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  return {
    startMonitoring,
    reconnect,
    cleanup
  }
}
