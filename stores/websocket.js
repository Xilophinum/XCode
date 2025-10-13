import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io } from 'socket.io-client'

export const useWebSocketStore = defineStore('websocket', () => {
  // Connection state
  const socket = ref(null)
  const isConnected = ref(false)
  const isAuthenticated = ref(false)
  const connectionError = ref(null)
  const lastReconnectAttempt = ref(null)
  
  // Subscriptions
  const subscribedProjects = ref(new Set())
  const messageHandlers = ref(new Map()) // Map of event types to handler functions
  
  // Job state for real-time updates
  const currentJobs = ref(new Map()) // Map of projectId to job info
  const jobMessages = ref(new Map()) // Map of projectId to messages array
  
  // Connection status computed
  const connectionStatus = computed(() => {
    if (isConnected.value) return 'connected'
    if (connectionError.value) return 'error'
    return 'disconnected'
  })
  
  // Initialize WebSocket connection
  const connect = async () => {
    if (socket.value && socket.value.connected) {
      console.log('🔌 WebSocket already connected')
      return
    }
    
    try {
      console.log('🔌 Initializing universal WebSocket connection...')
      
      // Create Socket.IO connection
      socket.value = io('/', {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling']
      })

      // Handle connection events
      socket.value.on('connect', async () => {
        console.log('✅ WebSocket connected successfully')
        isConnected.value = true
        connectionError.value = null
        
        // Authenticate the client
        await authenticateClient()
        
        // Re-subscribe to any previously subscribed projects
        for (const projectId of subscribedProjects.value) {
          await subscribeToProject(projectId)
        }
      })

      socket.value.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected:', reason)
        isConnected.value = false
        isAuthenticated.value = false
        
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          socket.value.connect()
        }
      })

      socket.value.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error)
        isConnected.value = false
        connectionError.value = error.message
        lastReconnectAttempt.value = new Date()
      })

      socket.value.on('reconnect', (attemptNumber) => {
        console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`)
        isConnected.value = true
        connectionError.value = null
      })

      // Handle all real-time messages and events
      socket.value.on('message', handleWebSocketMessage)
      socket.value.on('client_authenticated', (data) => {
        console.log('✅ Client authenticated successfully:', data.userEmail)
        isAuthenticated.value = true
        connectionError.value = null
        
        // Re-subscribe to any previously subscribed projects after authentication
        for (const projectId of subscribedProjects.value) {
          subscribeToProject(projectId)
        }
      })
      socket.value.on('client_auth_error', (data) => {
        console.error('❌ Client authentication error:', data.message)
        connectionError.value = data.message
        isConnected.value = false
        isAuthenticated.value = false
      })
      socket.value.on('project_subscribed', (data) => {
        console.log('✅ Project subscribed:', data.projectId)
      })
      socket.value.on('subscription_error', (data) => {
        console.error('❌ Subscription error:', data.message)
      })
      
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket:', error)
      connectionError.value = error.message
    }
  }
  
  // Authenticate client with server
  const authenticateClient = async () => {
    try {
      const authStore = useAuthStore()
      
      // Check if user is authenticated
      if (!authStore.isAuthenticated || !authStore.user) {
        throw new Error('User not authenticated')
      }
      
      // Get the JWT token from the cookie (this will be sent automatically with the WebSocket handshake)
      // For WebSocket authentication, we'll send the user ID and let the server validate the session
      socket.value.emit('authenticate', { 
        type: 'client',
        userId: authStore.user.id,
        userEmail: authStore.user.email
      })
      
      console.log('🔐 Client authentication sent for user:', authStore.user.email)
    } catch (error) {
      console.error('❌ Client authentication failed:', error)
      connectionError.value = 'Authentication failed: ' + error.message
    }
  }
  
  // Subscribe to project updates
  const subscribeToProject = async (projectId) => {
    try {
      if (!socket.value || !isConnected.value) {
        console.warn('⚠️ Cannot subscribe: WebSocket not connected')
        return false
      }
      
      if (!isAuthenticated.value) {
        console.warn('⚠️ Cannot subscribe: Client not authenticated, adding to pending subscriptions')
        subscribedProjects.value.add(projectId)
        return false
      }
      
      socket.value.emit('subscribe_project', { projectId })
      subscribedProjects.value.add(projectId)
      
      console.log(`📡 Subscribed to project: ${projectId}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to subscribe to project ${projectId}:`, error)
      return false
    }
  }
  
  // Unsubscribe from project updates
  const unsubscribeFromProject = (projectId) => {
    try {
      if (socket.value && isConnected.value) {
        socket.value.emit('unsubscribe_project', { projectId })
      }
      subscribedProjects.value.delete(projectId)
      
      // Clean up project-specific data
      currentJobs.value.delete(projectId)
      jobMessages.value.delete(projectId)
      
      console.log(`📡 Unsubscribed from project: ${projectId}`)
    } catch (error) {
      console.error(`❌ Failed to unsubscribe from project ${projectId}:`, error)
    }
  }
  
  // Add message handler for specific event types
  const addMessageHandler = (eventType, handler) => {
    if (!messageHandlers.value.has(eventType)) {
      messageHandlers.value.set(eventType, new Set())
    }
    messageHandlers.value.get(eventType).add(handler)
  }
  
  // Remove message handler
  const removeMessageHandler = (eventType, handler) => {
    if (messageHandlers.value.has(eventType)) {
      messageHandlers.value.get(eventType).delete(handler)
    }
  }
  
  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (message) => {
    try {
      console.log('📨 WebSocket message received:', message.type, message)
      
      // Debug: Log message structure for troubleshooting
      if (message.type?.includes('job') || message.type?.includes('cron')) {
        console.log('🔍 Debug message structure:', {
          type: message.type,
          hasProjectId: !!message.projectId,
          hasJobId: !!message.jobId,
          hasData: !!message.data,
          keys: Object.keys(message)
        })
      }
      
      // Update internal state based on message type
      updateInternalState(message)
      
      // Call registered handlers for this message type
      if (messageHandlers.value.has(message.type)) {
        const handlers = messageHandlers.value.get(message.type)
        for (const handler of handlers) {
          try {
            handler(message)
          } catch (error) {
            console.error(`❌ Error in message handler for ${message.type}:`, error)
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error)
    }
  }
  
  // Update internal store state based on message
  const updateInternalState = (message) => {
    const { type, projectId } = message
    
    // Skip processing if no projectId
    if (!projectId && (type !== 'agent_status_update')) {
      console.warn('⚠️ Received message without projectId:', message)
      return
    }
    
    switch (type) {
      case 'webhook_trigger_fired':
        addJobMessage(projectId, 'System', 'info', `🎣 Webhook triggered: ${message.webhookNodeLabel || message.endpoint}`)
        break
        
      case 'webhook_trigger_error':
        addJobMessage(projectId, 'System', 'error', `❌ Webhook trigger error: ${message.error}`)
        break
        
      case 'cron_trigger_fired':
        addJobMessage(projectId, 'System', 'info', `⏰ Cron trigger fired: ${message.cronExpression || message.cronNodeLabel}`)
        break
        
      case 'cron_job_starting':
        // Only create job record if we have the required fields
        if (message.jobId && message.agentId) {
          currentJobs.value.set(projectId, {
            jobId: message.jobId,
            agentId: message.agentId,
            status: message.status || 'running',
            startTime: message.startTime,
            nodeId: message.nodeId,
            trigger: 'cron'
          })
          addJobMessage(projectId, 'System', 'success', `🤖 Job started on agent ${message.agentName || message.agentId}`)
          addJobMessage(projectId, 'System', 'info', `Job ID: ${message.jobId}`)
        } else {
          // Fallback message when job details aren't available yet
          addJobMessage(projectId, 'System', 'info', `🎯 Cron job starting for ${message.cronNodeLabel || 'trigger'}...`)
        }
        break
        
      case 'job_created':
        currentJobs.value.set(projectId, {
          jobId: message.jobId,
          agentId: message.agentId,
          status: message.status || 'created',
          startTime: message.startTime,
          nodeId: message.nodeId,
          trigger: 'manual'
        })
        addJobMessage(projectId, 'System', 'success', `🚀 Job created: ${message.jobId}`)
        break
        
      case 'job_status_updated':
        const currentJob = currentJobs.value.get(projectId)
        if (currentJob) {
          currentJob.status = message.status
          currentJob.nodeId = message.currentNodeId
          
          // Only show status messages for failures and cancellations
          // Success completions are handled by 'job_complete' message type
          if (message.status === 'failed' || message.status === 'cancelled') {
            addJobMessage(projectId, 'System', 'warning', 
              `Job ${message.status}: ${message.message || 'No details provided'}`)
            // Keep job in map for a while so UI can show final status
            setTimeout(() => {
              currentJobs.value.delete(projectId)
            }, 5000)
          } else if (message.status === 'completed' && !message.suppressMessage) {
            // Only show completion message if there wasn't already a job_complete message
            // and the message contains useful details
            if (message.message && message.message !== 'No details provided') {
              addJobMessage(projectId, 'System', 'success', 
                `Job completed: ${message.message}`)
            }
            setTimeout(() => {
              currentJobs.value.delete(projectId)
            }, 5000)
          }
        }
        break
        
      case 'job_output_line':
        const outputData = message.output || message
        addJobMessage(projectId, outputData.nodeLabel || 'Agent', outputData.level || outputData.type || 'info', outputData.message, outputData.value)
        break
        
      case 'job_output':
        if (message.output && Array.isArray(message.output)) {
          message.output.forEach(outputLine => {
            addJobMessage(projectId, outputLine.nodeLabel || 'Agent', outputLine.type || 'info', 
              outputLine.message, outputLine.value)
          })
        }
        break
        
      case 'job_complete':
        const completionMessage = message.result?.message || message.message || 'Job completed successfully'
        addJobMessage(projectId, 'System', 'success', `✅ ${completionMessage}`)
        const completedJob = currentJobs.value.get(projectId)
        if (completedJob) {
          completedJob.status = 'completed'
          setTimeout(() => {
            currentJobs.value.delete(projectId)
          }, 5000)
        }
        break
        
      case 'job_error':
        addJobMessage(projectId, 'System', 'error', `❌ Job error: ${message.error || 'Unknown error'}`)
        const errorJob = currentJobs.value.get(projectId)
        if (errorJob) {
          errorJob.status = 'failed'
          setTimeout(() => {
            currentJobs.value.delete(projectId)
          }, 5000)
        }
        break
        
      case 'cron_trigger_error':
        addJobMessage(projectId, 'System', 'error', `❌ Cron trigger error: ${message.error}`)
        break
        
      case 'agent_status_update':
        // Agent status changed - emit event for other components to handle
        console.log('🤖 Agent status update received:', message)
        
        // Create a custom event for agent status changes
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('agentStatusUpdate', {
            detail: {
              agentId: message.agentId,
              status: message.status,
              currentJobs: message.currentJobs,
              lastHeartbeat: message.lastHeartbeat,
              hostname: message.hostname,
              platform: message.platform,
              architecture: message.architecture,
              capabilities: message.capabilities,
              version: message.version
            }
          })
          window.dispatchEvent(event)
        }
        break
    }
  }
  
  // Add message to project's message array
  const addJobMessage = (projectId, nodeLabel, type, message, value = undefined) => {
    if (!jobMessages.value.has(projectId)) {
      jobMessages.value.set(projectId, [])
    }
    
    const messages = jobMessages.value.get(projectId)
    messages.push({
      nodeLabel,
      type,
      message,
      value,
      timestamp: new Date()
    })
    
    // Keep only last 1000 messages to prevent memory issues
    if (messages.length > 1000) {
      messages.splice(0, messages.length - 1000)
    }
  }
  
  // Get job messages for a project
  const getJobMessages = (projectId) => {
    return jobMessages.value.get(projectId) || []
  }
  
  // Get current job for a project
  const getCurrentJob = (projectId) => {
    return currentJobs.value.get(projectId) || null
  }
  
  // Clear messages for a project
  const clearJobMessages = (projectId) => {
    jobMessages.value.set(projectId, [])
  }
  
  // Check if a project has a running job
  const isProjectJobRunning = (projectId) => {
    const job = currentJobs.value.get(projectId)
    return job && ['running', 'pending', 'queued', 'created'].includes(job.status)
  }
  
  // Disconnect WebSocket
  const disconnect = () => {
    try {
      if (socket.value) {
        socket.value.disconnect()
        socket.value = null
      }
      isConnected.value = false
      isAuthenticated.value = false
      connectionError.value = null
      subscribedProjects.value.clear()
      messageHandlers.value.clear()
      console.log('🔌 WebSocket disconnected')
    } catch (error) {
      console.error('❌ Error disconnecting WebSocket:', error)
    }
  }
  
  return {
    // State
    socket,
    isConnected,
    isAuthenticated,
    connectionError,
    connectionStatus,
    lastReconnectAttempt,
    subscribedProjects,
    currentJobs,
    jobMessages,
    
    // Actions
    connect,
    disconnect,
    subscribeToProject,
    unsubscribeFromProject,
    addMessageHandler,
    removeMessageHandler,
    addJobMessage,
    
    // Getters
    getJobMessages,
    getCurrentJob,
    clearJobMessages,
    isProjectJobRunning
  }
})