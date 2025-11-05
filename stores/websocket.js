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
  const metricsStore = useMetricsStore()
  // Subscriptions
  const subscribedProjects = ref(new Set())
  
  // Job state for real-time updates
  const currentJobs = ref(new Map()) // Map of projectId to { jobId, buildNumber, ... }
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
      logger.info('WebSocket already connected')
      return
    }
    
    try {
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
        logger.info('WebSocket disconnected:', reason)
        isConnected.value = false
        isAuthenticated.value = false
        
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          socket.value.connect()
        }
      })

      socket.value.on('connect_error', (error) => {
        logger.error('WebSocket connection error:', error)
        isConnected.value = false
        connectionError.value = error.message
        lastReconnectAttempt.value = new Date()
      })

      socket.value.on('reconnect', (attemptNumber) => {
        logger.info(`🔄 WebSocket reconnected after ${attemptNumber} attempts`)
        isConnected.value = true
        connectionError.value = null
      })

      // Handle all real-time messages and events
      socket.value.on('message', handleWebSocketMessage)
      socket.value.on('client_authenticated', async (data) => {
        isAuthenticated.value = true
        connectionError.value = null
        
        // Re-subscribe to any previously subscribed projects after authentication
        for (const projectId of subscribedProjects.value) {
          await subscribeToProject(projectId)
        }
      })
      socket.value.on('client_auth_error', (data) => {
        logger.error('Client authentication error:', data.message)
        connectionError.value = data.message
        isConnected.value = false
        isAuthenticated.value = false
      })
      
    } catch (error) {
      logger.error('Failed to initialize WebSocket:', error)
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
    } catch (error) {
      logger.error('Client authentication failed:', error)
      connectionError.value = 'Authentication failed: ' + error.message
    }
  }
  
  // Subscribe to project updates
  const subscribeToProject = async (projectId) => {
    try {
      if (!socket.value || !isConnected.value) {
        logger.warn('Cannot subscribe: WebSocket not connected')
        return false
      }

      if (!isAuthenticated.value) {
        logger.warn('Cannot subscribe: Client not authenticated, adding to pending subscriptions')
        subscribedProjects.value.add(projectId)
        return false
      }
      socket.value.emit('subscribe_project', { projectId })
      subscribedProjects.value.add(projectId)
      return true
    } catch (error) {
      logger.error(`Failed to subscribe to project ${projectId}:`, error)
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

      // Only clear messages - job state should persist for progress bars and status indicators
      // currentJobs will be cleared when job completes (see job_complete, job_error, job_status_updated handlers)
      jobMessages.value.delete(projectId)
    } catch (error) {
      logger.error(`Failed to unsubscribe from project ${projectId}:`, error)
    }
  }

  const unsubscribeFromAllProjects = () => {
    try {
      for (const projectId of subscribedProjects.value) {
          unsubscribeFromProject(projectId)
      }
      subscribedProjects.value.clear()

      // DON'T clear currentJobs - they're needed for progress bars across navigation
      // Jobs are automatically cleared when they complete (see job_complete, job_error handlers)

      // Clear all messages since we're leaving all projects
      jobMessages.value.clear()

      logger.info('Unsubscribed from all projects (keeping job state for progress bars)')
    } catch (error) {
      logger.error(`Failed to unsubscribe from all projects:`, error)
    }
  }
  
  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (message) => {
    try {
      // Update internal state based on message type
      updateInternalState(message)
      
    } catch (error) {
      logger.error('Error handling WebSocket message:', error)
    }
  }
  
  // Update internal store state based on message
  const updateInternalState = (message) => {
    const { type, projectId } = message
    
    switch (type) {
      case 'webhook_trigger_fired':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        addJobMessage(projectId, 'System', 'info', `🎣 Webhook triggered: ${message.webhookNodeLabel || message.endpoint}`, undefined, message.timestamp, message.nanotime)
        break

      case 'webhook_trigger_error':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        addJobMessage(projectId, 'System', 'error', `Webhook trigger error: ${message.error}`, undefined, message.timestamp, message.nanotime)
        break

      case 'cron_trigger_fired':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        addJobMessage(projectId, 'System', 'info', `⏰ Cron trigger fired: ${message.cronExpression || message.cronNodeLabel}`, undefined, message.timestamp, message.nanotime)
        break
        
      case 'cron_job_starting':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        if (message.jobId && message.agentId) {
          currentJobs.value.set(projectId, {
            jobId: message.jobId,
            buildNumber: message.buildNumber,
            agentId: message.agentId,
            status: message.status || 'running',
            startTime: message.startTime || new Date().toISOString(),
            nodeId: message.nodeId,
            trigger: 'cron'
          })
          addJobMessage(projectId, 'System', 'success', `🤖 Job started on agent ${message.agentName || message.agentId}`, undefined, message.timestamp, message.nanotime)
          addJobMessage(projectId, 'System', 'info', `Build #: ${message.buildNumber}`, undefined, message.timestamp, message.nanotime)
        } else {
          // Fallback message when job details aren't available yet
          addJobMessage(projectId, 'System', 'info', `Cron job starting for ${message.cronNodeLabel || 'trigger'}...`, undefined, message.timestamp, message.nanotime)
        }
        break
        
      case 'cron_job_started':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        currentJobs.value.set(projectId, {
          jobId: message.jobId,
          buildNumber: message.buildNumber,
          agentId: message.agentId,
          status: 'running',
          startTime: message.timestamp || message.startTime || new Date().toISOString(),
          nodeId: message.cronNodeId,
          trigger: 'cron'
        })
        addJobMessage(projectId, 'System', 'success', `🤖 Cron job started on agent ${message.agentName}`, undefined, message.timestamp, message.nanotime)
        addJobMessage(projectId, 'System', 'info', `Job ID: ${message.jobId}`, undefined, message.timestamp, message.nanotime)
        if (message.buildNumber) {
          addJobMessage(projectId, 'System', 'info', `Build #: ${message.buildNumber}`, undefined, message.timestamp, message.nanotime)
        }
        break
        
      case 'job_created':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        const isSubJob = message.jobId.includes('_branch_') || message.jobId.includes('_matrix_')
        if (!isSubJob) {
          currentJobs.value.set(projectId, {
            jobId: message.jobId,
            buildNumber: message.buildNumber,
            agentId: message.agentId,
            status: message.status || 'created',
            startTime: message.startTime || new Date().toISOString(),
            nodeId: message.nodeId,
            trigger: 'manual'
          })
          logger.info(`Main job created with buildNumber: ${message.buildNumber}`)
        } else {
          // This is a sub-job - don't overwrite main job, just log it
          logger.info(`Sub-job created: ${message.jobId} (preserving main job)`)
        }
        // Show the message for all jobs
        addJobMessage(projectId, 'System', 'success', `Job created: ${message.jobId}`, undefined, message.timestamp, message.nanotime)
        break

      case 'job_started':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        const existingJob = currentJobs.value.get(projectId)
        currentJobs.value.set(projectId, {
          ...(existingJob || {}),
          jobId: message.jobId,
          buildNumber: message.buildNumber || existingJob?.buildNumber,
          agentId: message.agentId,
          agentName: message.agentName,
          status: message.status || 'running',
          startTime: message.startTime || new Date().toISOString(),
          nodeId: message.nodeId,
          trigger: message.trigger || 'manual'
        })
        logger.info(`Job started with buildNumber: ${message.buildNumber || existingJob?.buildNumber}`)
        break
        
      case 'job_status_updated':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        const currentJob = currentJobs.value.get(projectId)
        if (currentJob) {
          currentJob.status = message.status
          currentJob.nodeId = message.currentNodeId

          // Handle job status updates
          if (message.status === 'failed' || message.status === 'cancelled') {
            addJobMessage(projectId, 'System', 'warning',
              `Job ${message.status}: ${message.message || 'No details provided'}`, undefined, message.timestamp, message.nanotime)
            // Remove job and clear messages for failed/cancelled jobs
            currentJobs.value.delete(projectId)
            // Note: Messages are NOT cleared here - user should still see failure logs
          } else if (message.status === 'completed') {
            // Remove job for completed jobs
            currentJobs.value.delete(projectId)
            // Note: Messages are NOT cleared here - user should still see completion logs
          }
        }
        break
        
      case 'job_output_line':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        const outputData = message.output || message
        // source contains the nodeLabel
        addJobMessage(projectId, outputData.source || 'Agent', outputData.level || 'info', outputData.message, outputData.value, outputData.timestamp, outputData.nanotime)
        break

      case 'job_output':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        if (message.output && Array.isArray(message.output)) {
          message.output.forEach(outputLine => {
            // source contains the nodeLabel
            addJobMessage(projectId, outputLine.source || 'Agent', outputLine.level || 'info',
              outputLine.message, outputLine.value, outputLine.timestamp, outputLine.nanotime)
          })
        }
        break

      case 'job_complete':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        const completionMessage = message.message || 'Job completed successfully (exit code: 0)'
        addJobMessage(projectId, 'System', 'success', `Job completed: ${completionMessage}`, undefined, message.timestamp, message.nanotime)
        const completedJob = currentJobs.value.get(projectId)
        if (completedJob) {
          completedJob.status = 'completed'
          // Remove job immediately so UI updates right away
          currentJobs.value.delete(projectId)
        }
        break

      case 'job_error':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        addJobMessage(projectId, 'System', 'error', `Job error: ${message.error || 'Unknown error'}`, undefined, message.timestamp, message.nanotime)
        const errorJob = currentJobs.value.get(projectId)
        if (errorJob) {
          errorJob.status = 'failed'
          // Remove job immediately so UI updates right away
          currentJobs.value.delete(projectId)
        }
        break

      case 'job_started':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        addJobMessage(projectId, 'System', 'success', `Job started on agent ${message.agentName || message.agentId}`, undefined, message.timestamp, message.nanotime)
        const startedJob = currentJobs.value.get(projectId)
        if (startedJob) {
          startedJob.status = 'running'
          startedJob.agentId = message.agentId
          startedJob.agentName = message.agentName
        }
        break

      case 'job_cancelled':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        addJobMessage(projectId, 'System', 'warning', `🛑 ${message.message || 'Job was cancelled'}`, undefined, message.timestamp, message.nanotime)
        const cancelledJob = currentJobs.value.get(projectId)
        if (cancelledJob) {
          cancelledJob.status = 'cancelled'
          // Remove job immediately so UI updates right away
          currentJobs.value.delete(projectId)
        }
        break

      case 'job_cancelling':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        addJobMessage(projectId, 'System', 'warning', `⏳ ${message.message || 'Job cancellation initiated'}`, undefined, message.timestamp, message.nanotime)
        const cancellingJob = currentJobs.value.get(projectId)
        if (cancellingJob) {
          cancellingJob.status = 'cancelling'
        }
        break

      case 'job_cancel_failed':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        addJobMessage(projectId, 'System', 'error', `${message.error || 'Job cancellation failed'}`, undefined, message.timestamp, message.nanotime)
        const cancelFailedJob = currentJobs.value.get(projectId)
        if (cancelFailedJob) {
          cancelFailedJob.status = 'cancel_failed'
        }
        break

      case 'cron_trigger_error':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        addJobMessage(projectId, 'System', 'error', `Cron trigger error: ${message.error}`, undefined, message.timestamp, message.nanotime)
        break
        
      case 'agent_status_update':
        // Agent status changed - emit event for other components to handle
        logger.info('🤖 Agent status update received:', message)

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
              agentVersion: message.agentVersion
            }
          })
          window.dispatchEvent(event)
        }
        break

      case 'node_execution_state_changed':
        if (!projectId) return logger.warn('Received message without projectId:', message);
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('nodeExecutionStateChanged', {
            detail: {
              projectId: message.projectId,
              buildNumber: message.buildNumber,
              nodeId: message.nodeId,
              status: message.status,
              nodeState: message.nodeState,
              timestamp: message.timestamp
            }
          })
          window.dispatchEvent(event)
        }
        break
      case 'agent_metrics_update':
        // Forward to metrics store for processing
        metricsStore.handleAgentMetricsUpdate(message)
        break
      case 'metrics_update':
        // Forward to metrics store for processing
        metricsStore.handleRealtimeUpdate(message)
        break
    }
  }
  
  // Add message to project's message array
  // nodeLabel is now the source/label of the log (e.g., node name, 'System', 'Agent')
  const addJobMessage = (projectId, nodeLabel, level, message, value = undefined, timestamp = undefined, nanotime = undefined) => {
    if (!jobMessages.value.has(projectId)) {
      jobMessages.value.set(projectId, [])
    }

    const messages = jobMessages.value.get(projectId)
    const newMessage = {
      nodeLabel,
      level,
      message,
      value,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      nanotime: nanotime || (typeof process !== 'undefined' && process.hrtime ? process.hrtime.bigint().toString() : Date.now().toString() + '000000')
    }
    
    messages.push(newMessage)

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
    logger.info(`🧹 Clearing all messages for project ${projectId}`)
    jobMessages.value.delete(projectId)
  }

  // Check if a project has a running job
  const isProjectJobRunning = (projectId) => {
    const job = currentJobs.value.get(projectId)
    return job && ['running', 'pending', 'queued', 'created', 'dispatched'].includes(job.status)
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
      logger.info('WebSocket disconnected')
    } catch (error) {
      logger.error('Error disconnecting WebSocket:', error)
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
    unsubscribeFromAllProjects,
    addJobMessage,
    // Getters
    getJobMessages,
    getCurrentJob,
    clearJobMessages,
    isProjectJobRunning
  }
})