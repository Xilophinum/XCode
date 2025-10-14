import { getLocalAgentManager } from '../utils/localAgentManager.js'

export default defineNitroPlugin(async (nitroApp) => {
  console.log('🔧 Local Agent Plugin initializing...')
  
  // Add a small delay to ensure websocket server is ready
  setTimeout(async () => {
    try {
      // Get the local agent manager
      const localAgentManager = await getLocalAgentManager()
      
      // Determine server URL for local agent connection
      // In development, use localhost:3000, in production use the actual server URL
      const isDev = process.env.NODE_ENV === 'development'
      const serverUrl = isDev ? 'ws://localhost:3000' : process.env.APP_WS_SERVER_ADDRESS
      
      // Start the local agent
      await localAgentManager.start(serverUrl)
      
      console.log('✅ Local Agent Plugin initialized successfully')
      
      // Store reference globally for cleanup
      globalThis.localAgentManager = localAgentManager
      
    } catch (error) {
      console.error('❌ Failed to initialize Local Agent Plugin:', error.message)
      // Don't throw - let the server continue without local agent
    }
  }, 2000) // 2 second delay
})

// Cleanup on process exit
process.on('SIGINT', async () => {
  if (globalThis.localAgentManager) {
    await globalThis.localAgentManager.stop()
  }
})

process.on('SIGTERM', async () => {
  if (globalThis.localAgentManager) {
    await globalThis.localAgentManager.stop()
  }
})