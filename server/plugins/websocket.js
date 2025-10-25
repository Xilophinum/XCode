import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import jwt from 'jsonwebtoken'
import { getAgentManager } from '../utils/agentManager.js'
import { getDataService } from '../utils/dataService.js'
import { jobManager } from '../utils/jobManager.js'
import { getBuildStatsManager } from '../utils/buildStatsManager.js'
import logger from '../utils/logger.js'
// Store client connections for broadcasting
const clientConnections = new Map() // clientId -> socket
const projectSubscriptions = new Map() // projectId -> Set of clientIds

export default defineNitroPlugin(async (nitroApp) => {
  const engine = new Engine();
  const io = new Server();

  io.bind(engine);

  // Get the persistent agent manager
  const agentManager = await getAgentManager()
  logger.info(`WebSocket plugin initialized - existing agents: ${agentManager.agentData.size}, connections: ${agentManager.connectedAgents.size}`)

  // Mark all agents as offline on server startup and handle orphaned jobs
  const dataService = await getDataService()
  await dataService.markAllAgentsOffline()
  logger.info('All agents marked as offline on server startup - agents must reconnect')
  
  // Handle any jobs that were running when server restarted
  await handleServerRestartOrphanedJobs(agentManager)

  setInterval(async () => {
    try {
      const now = Date.now()
      const timedOutAgents = []

      // Check in-memory agent data instead of querying database
      for (const [agentId, agentInfo] of agentManager.agentData) {
        // Skip if already offline or no heartbeat recorded
        if (agentInfo.status === 'offline' || !agentInfo.lastHeartbeat) continue

        const lastHeartbeatTime = new Date(agentInfo.lastHeartbeat).getTime()
        const timeSinceHeartbeat = now - lastHeartbeatTime

        if (timeSinceHeartbeat > process.env.WEBSOCKET_HEARTBEAT_TIMEOUT) {
          logger.warn(`Agent ${agentId} (${agentInfo.name}) missed heartbeat (${Math.round(timeSinceHeartbeat / 1000)}s) - marking as offline`)
          timedOutAgents.push({ agentId, agentInfo })
        }
      }

      // Process timed-out agents
      for (const { agentId, agentInfo } of timedOutAgents) {
        // Update database status
        await dataService.updateAgentStatus(agentId, 'offline')

        // Handle orphaned jobs for timed-out agent
        await handleOrphanedJobs(agentId, agentManager)

        // Remove from connected agents
        if (agentManager.connectedAgents.has(agentId)) {
          agentManager.connectedAgents.delete(agentId)
        }

        // Update in-memory status
        agentInfo.status = 'offline'
        agentInfo.currentJobs = 0

        // Broadcast status update to clients
        broadcastToClients({
          type: 'agent_status_update',
          agentId: agentId,
          status: 'offline',
          currentJobs: 0,
          lastHeartbeat: agentInfo.lastHeartbeat,
          timestamp: new Date().toISOString()
        })
      }

      if (timedOutAgents.length > 0) {
        logger.info(`Processed ${timedOutAgents.length} timed-out agents (in-memory check)`)
      }
    } catch (error) {
      logger.error('Error checking agent heartbeat timeouts:', error)
    }
  }, process.env.WEBSOCKET_HEARTBEAT_CHECK_INTERVAL)

  // Store io instance globally for broadcasting from other modules
  globalThis.socketIO = io
  globalThis.broadcastToClients = broadcastToClients
  globalThis.broadcastToProject = broadcastToProject

  io.on("connection", (socket) => {
    // Handle Socket.IO events directly (for client connections)
    socket.on("authenticate", async (msg) => {
      try {
        // Handle client authentication
        if (msg.type === 'client') {
          await handleClientAuthentication(socket, msg)
        } else {
          // Handle agent authentication via message format
          await handleAuthentication(socket, msg, agentManager)
        }
      } catch (error) {
        logger.error('Error handling authenticate event:', error)
      }
    })
    
    socket.on("subscribe_project", async (msg) => {
      try {
        if (socket.clientAuthenticated) {
          await handleProjectSubscription(socket, msg)
        } else {
          logger.info(`Project subscription attempted by unauthenticated client: ${socket.id}`)
        }
      } catch (error) {
        logger.error('Error handling subscribe_project event:', error)
      }
    })
    
    socket.on("unsubscribe_project", async (msg) => {
      try {
        if (socket.clientAuthenticated) {
          await handleProjectUnsubscription(socket, msg)
        } else {
          logger.info(`Project unsubscription attempted by unauthenticated client: ${socket.id}`)
        }
      } catch (error) {
        logger.error('Error handling unsubscribe_project event:', error)
      }
    })
    
    socket.on("message", async (msg) => {
      try {
        // Handle both agent and client message types
        switch (msg.type) {
          // Agent authentication and communication
          case 'authenticate':
            await handleAuthentication(socket, msg, agentManager)
            break
            
          case 'register':
            if (socket.authenticated) {
              await handleAgentRegistration(socket, msg, agentManager)
            } else {
              logger.info(`Registration attempted by unauthenticated socket: ${socket.id}`)
            }
            break
            
          // Client authentication and subscriptions
          case 'client_authenticate':
            await handleClientAuthentication(socket, msg)
            break
            
          case 'subscribe_project':
            if (socket.clientAuthenticated) {
              await handleProjectSubscription(socket, msg)
            } else {
              logger.info(`Project subscription attempted by unauthenticated client: ${socket.id}`)
            }
            break
            
          case 'unsubscribe_project':
            if (socket.clientAuthenticated) {
              await handleProjectUnsubscription(socket, msg)
            } else {
              logger.info(`Project unsubscription attempted by unauthenticated client: ${socket.id}`)
            }
            break
            
          // Agent job communication (existing)
          case 'job_output':
            if (socket.authenticated) {
              await handleJobOutput(socket, msg, agentManager)
            } else {
              logger.info(`Job output from unauthenticated socket: ${socket.id}`)
            }
            break
            
          case 'job_complete':
            if (socket.authenticated) {
              await handleJobComplete(socket, msg, agentManager)
            } else {
              logger.info(`Job complete from unauthenticated socket: ${socket.id}`)
            }
            break
            
          case 'job_error':
            if (socket.authenticated) {
              await handleJobError(socket, msg, agentManager)
            } else {
              logger.info(`Job error from unauthenticated socket: ${socket.id}`)
            }
            break
            
          case 'job_failure':
            if (socket.authenticated) {
              await handleJobFailure(socket, msg, agentManager)
            } else {
              logger.info(`Job failure from unauthenticated socket: ${socket.id}`)
            }
            break
            
          case 'agent:job_status':
            if (socket.authenticated) {
              await handleAgentJobStatus(socket, msg, agentManager)
            } else {
              logger.info(`Job status from unauthenticated socket: ${socket.id}`)
            }
            break
            
          case 'heartbeat':
          case 'agent:heartbeat':
            if (socket.authenticated) {
              await handleHeartbeat(socket, msg, agentManager)
            } else {
              logger.info(`Heartbeat from unauthenticated socket: ${socket.id} - agentId: ${socket.agentId}`)
            }
            break
            
          default:
            logger.info('Unknown message type:', msg.type)
        }
      } catch (error) {
        logger.error('Error handling WebSocket message:', error)
        logger.error('Original message:', typeof msg, JSON.stringify(msg, null, 2))
        logger.error('Error details:', error.message, error.stack)
        socket.emit('message', {
          type: 'error',
          message: 'Invalid message format'
        })
      }
    });

    socket.on("disconnect", async () => {
      // Clean up agent from manager if it was authenticated
      if (socket.authenticated && socket.agentId) {
        // Mark agent as offline in database
        try {
          const dataService = agentManager.dataService || await getDataService()
          await dataService.updateAgentStatus(socket.agentId, 'offline')
        } catch (error) {
          logger.error('Error updating agent status to offline:', error)
        }
        
        // Broadcast agent disconnection to all connected clients
        broadcastToClients({
          type: 'agent_status_update',
          agentId: socket.agentId,
          status: 'offline',
          currentJobs: 0,
          lastHeartbeat: new Date().toISOString(),
          timestamp: new Date().toISOString()
        })
        
        agentManager.unregisterAgent(socket.agentId)
        logger.info(`Agent ${socket.agentId} disconnected and marked offline`)
      }
      
      // Clean up client connections and subscriptions
      if (socket.clientAuthenticated && socket.clientId) {
        // Remove from client connections
        clientConnections.delete(socket.clientId)
        
        // Clean up project subscriptions
        if (socket.subscribedProjects) {
          socket.subscribedProjects.forEach(projectId => {
            if (projectSubscriptions.has(projectId)) {
              projectSubscriptions.get(projectId).delete(socket.clientId)
              
              // Clean up empty subscription sets
              if (projectSubscriptions.get(projectId).size === 0) {
                projectSubscriptions.delete(projectId)
              }
            }
          })
        }
        
        logger.info(`Client ${socket.clientId} disconnected and cleaned up`)
      }
    });
  });

  nitroApp.router.use("/socket.io/", defineEventHandler({
    handler(event) {
      engine.handleRequest(event.node.req, event.node.res);
      event._handled = true;
    },
    websocket: {
      open(peer) {
        engine.prepare(peer._internal.nodeReq);
        engine.onWebSocket(peer._internal.nodeReq, peer._internal.nodeReq.socket, peer.websocket);
      }
    }
  }));
});

async function handleAuthentication(socket, msg, agentManager) {
  try {
    logger.info('Agent authenticating with token')
    
    // Validate token
    if (!msg.token) {
      socket.emit('message', {
        type: 'error',
        message: 'Authentication token required'
      })
      return
    }

    // Check if token exists in database
    const dataService = agentManager.dataService || await getDataService()
    const agentRecord = await dataService.getAgentByToken(msg.token)
    
    if (!agentRecord) {
      socket.emit('message', {
        type: 'error',
        message: 'Invalid authentication token'
      })
      return
    }

    // Use the agent's database ID as the agentId
    const agentId = agentRecord.id
    
    // Store agent info
    socket.agentId = agentId
    socket.agentToken = msg.token
    socket.authenticated = true
    
    // Register this connection with agent manager
    agentManager.connectedAgents.set(agentId, socket)

    logger.info(`Agent ${agentId} (${agentRecord.name}) authenticated successfully`)
    
    // Send authentication success
    socket.emit('message', {
      type: 'authenticated',
      agentId: agentId,
      status: 'connected'
    })
    
  } catch (error) {
    logger.error('Authentication error:', error)
    socket.emit('message', {
      type: 'error',
      message: 'Authentication failed'
    })
  }
}

async function handleAgentRegistration(socket, msg, agentManager) {
  try {
    // Update agent in database with system information
    const dataService = agentManager.dataService || await getDataService()
    const updatedAgent = await dataService.registerAgent(socket.agentToken, {
      hostname: msg.hostname,
      platform: msg.platform,
      architecture: msg.architecture,
      capabilities: msg.capabilities || [],
      version: msg.version,
      systemInfo: msg.systemInfo || {},
      ipAddress: socket.handshake?.address
    })
    
    if (!updatedAgent) {
      socket.emit('message', {
        type: 'error',
        message: 'Failed to register agent'
      })
      return
    }
    
    // Store agent info in memory for quick access
    const agentInfo = {
      agentId: socket.agentId,
      name: updatedAgent.name, // Agent's name from database
      hostname: msg.hostname,
      platform: msg.platform,
      architecture: msg.architecture,
      capabilities: msg.capabilities || [],
      version: msg.version,
      systemInfo: msg.systemInfo || {},
      registeredAt: new Date(),
      status: 'online'
    }

    // Store in agent manager
    agentManager.agentData.set(socket.agentId, agentInfo)
    
    // Check for jobs that can retry on this agent reconnection
    await checkRetryableJobsOnReconnect(socket.agentId, agentManager)
    
    logger.info(`Agent ${updatedAgent.name} registered successfully`)
    logger.info(`Platform: ${agentInfo.platform} (${agentInfo.architecture})`)
    logger.info(`Hostname: ${agentInfo.hostname}`)
    
    // Broadcast agent registration to all admin connections
    logger.info(`Broadcasting agent registration update for ${updatedAgent.name}`)
    broadcastToClients({
      type: 'agent_status_update',
      agentId: socket.agentId,
      agentName: updatedAgent.name,
      status: 'online',
      hostname: agentInfo.hostname,
      platform: agentInfo.platform,
      architecture: agentInfo.architecture,
      capabilities: agentInfo.capabilities,
      version: agentInfo.version,
      currentJobs: 0,
      lastHeartbeat: new Date().toISOString(),
      timestamp: new Date().toISOString()
    })
    
    // Send registration success
    socket.emit('message', {
      type: 'registered',
      agentId: socket.agentId,
      agentName: updatedAgent.name,
      status: 'registered',
      message: 'Agent registered successfully'
    })
    
  } catch (error) {
    logger.error('Registration error:', error)
    socket.emit('message', {
      type: 'error',
      message: 'Registration failed'
    })
  }
}

async function handleHeartbeat(socket, msg, agentManager) {
  try {
    // Update agent status with heartbeat data
    const agentId = socket.agentId
    const { status, currentJobs, timestamp } = msg
    
    // Update database heartbeat timestamp
    const dataService = agentManager.dataService || await getDataService()
    await dataService.updateAgentHeartbeat(agentId, status)
    
    // Update agent data
    if (agentManager.agentData.has(agentId)) {
      const agentInfo = agentManager.agentData.get(agentId)
      agentInfo.status = status
      agentInfo.currentJobs = currentJobs || 0
      agentInfo.lastHeartbeat = new Date()
      agentManager.agentData.set(agentId, agentInfo)
    } else {
      logger.info(`Agent ${agentId} not found in agentData during heartbeat - recreating entry`)
      // Recreate the agent data from heartbeat if it's missing
      agentManager.agentData.set(agentId, {
        agentId: agentId,
        status: status,
        currentJobs: currentJobs || 0,
        lastHeartbeat: new Date(),
        hostname: 'Unknown', // Will be updated on next registration
        platform: 'Unknown',
        architecture: 'Unknown',
        capabilities: [],
        version: 'Unknown'
      })
    }
    
    // Make sure agent is in connectedAgents
    if (!agentManager.connectedAgents.has(agentId)) {
      logger.info(`Re-adding agent ${agentId} to connectedAgents`)
      agentManager.connectedAgents.set(agentId, socket)
    }
    
    // Send heartbeat acknowledgment
    socket.emit('message', {
      type: 'heartbeat_ack',
      timestamp: new Date().toISOString(),
      status: 'received'
    })
    
  } catch (error) {
    logger.error('Heartbeat error:', error)
    socket.emit('message', {
      type: 'error',
      message: 'Heartbeat processing failed'
    })
  }
}

// Client authentication and subscription handlers
async function handleClientAuthentication(socket, msg) {
  try {
    // For client authentication, we'll validate the JWT token from the cookie
    // The cookie should be available in the socket handshake
    const cookies = socket.handshake.headers.cookie
    
    if (!cookies) {
      socket.emit('client_auth_error', {
        message: 'No authentication cookie found'
      })
      return
    }
    
    // Parse the auth-token cookie
    let authToken = null
    const cookiePairs = cookies.split(';')
    for (const cookie of cookiePairs) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'auth-token') {
        authToken = value
        break
      }
    }
    
    if (!authToken) {
      socket.emit('client_auth_error', {
        message: 'No auth token in cookie'
      })
      return
    }
    
    // Verify JWT token
    const config = useRuntimeConfig()
    
    let decoded
    try {
      decoded = jwt.verify(authToken, config.jwtSecret)
    } catch (jwtError) {
      logger.error('JWT verification failed:', jwtError.message)
      socket.emit('client_auth_error', {
        message: 'Invalid authentication token'
      })
      return
    }
    
    // Get user from database to validate
    const dataService = await getDataService()
    const user = await dataService.getUserById(decoded.userId)
    
    if (!user) {
      socket.emit('client_auth_error', {
        message: 'User not found'
      })
      return
    }
    
    // Authentication successful
    socket.clientAuthenticated = true
    socket.clientId = `client_${user.id}` // Include user ID in client ID
    socket.userId = user.id
    socket.userEmail = user.email
    socket.userName = user.name
    
    // Store in client connections map
    clientConnections.set(socket.clientId, socket)
    // Send authentication success
    socket.emit('client_authenticated', {
      clientId: socket.clientId,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      status: 'connected'
    })
    
  } catch (error) {
    logger.error('Client authentication error:', error)
    socket.emit('client_auth_error', {
      message: 'Authentication failed: ' + error.message
    })
  }
}

async function handleProjectSubscription(socket, msg) {
  try {
    const { projectId } = msg
    
    if (!projectId) {
      socket.emit('subscription_error', {
        message: 'Project ID required'
      })
      return
    }
    
    // Add client to project subscriptions
    if (!projectSubscriptions.has(projectId)) {
      projectSubscriptions.set(projectId, new Set())
    }
    projectSubscriptions.get(projectId).add(socket.clientId)
    
    // Store project subscription on socket for cleanup
    if (!socket.subscribedProjects) {
      socket.subscribedProjects = new Set()
    }
    socket.subscribedProjects.add(projectId)
    
    socket.emit('project_subscribed', {
      projectId: projectId,
      status: 'subscribed'
    })
    
  } catch (error) {
    logger.error('Project subscription error:', error)
    socket.emit('subscription_error', {
      message: 'Failed to subscribe to project'
    })
  }
}

async function handleProjectUnsubscription(socket, msg) {
  try {
    const { projectId } = msg
    
    if (!projectId) {
      socket.emit('subscription_error', {
        message: 'Project ID required'
      })
      return
    }
    
    // Remove client from project subscriptions
    if (projectSubscriptions.has(projectId)) {
      projectSubscriptions.get(projectId).delete(socket.clientId)
      
      // Clean up empty subscription sets
      if (projectSubscriptions.get(projectId).size === 0) {
        projectSubscriptions.delete(projectId)
      }
    }
    
    // Remove from socket subscriptions
    if (socket.subscribedProjects) {
      socket.subscribedProjects.delete(projectId)
    }
    
    socket.emit('project_unsubscribed', {
      projectId: projectId,
      status: 'unsubscribed'
    })
    
  } catch (error) {
    logger.error('Project unsubscription error:', error)
    socket.emit('subscription_error', {
      message: 'Failed to unsubscribe from project'
    })
  }
}

// Enhanced job handlers that broadcast to clients
async function handleJobOutput(socket, msg, agentManager) {
  try {
    // Handle the agent job output (existing functionality)
    agentManager.handleJobOutput(socket.agentId, msg)

    // Broadcast job output to subscribed clients
    if (msg.projectId) {
      broadcastToProject(msg.projectId, {
        type: 'job_output',
        jobId: msg.jobId,
        nodeId: msg.nodeId,
        nodeLabel: msg.nodeLabel,
        output: msg.output,
        timestamp: msg.timestamp || new Date().toISOString()
      })
    }

  } catch (error) {
    logger.error('Job output handling error:', error)
  }
}

async function handleJobComplete(socket, msg, agentManager) {
  try {
    // Handle the agent job completion (existing functionality)
    agentManager.handleJobComplete(socket.agentId, msg)
    
    // Broadcast job completion to subscribed clients
    if (msg.projectId) {
      broadcastToProject(msg.projectId, {
        type: 'job_complete',
        jobId: msg.jobId,
        projectId: msg.projectId,
        status: 'completed',
        result: msg.result,
        message: msg.result?.message || msg.message || `Job completed (exit code: ${msg.result?.exitCode || 0})`,
        exitCode: msg.result?.exitCode || 0,
        timestamp: msg.timestamp || new Date().toISOString()
      })
    }
    
  } catch (error) {
    logger.error('Job completion handling error:', error)
  }
}

async function handleJobError(socket, msg, agentManager) {
  try {
    // Handle the agent job error (existing functionality)
    agentManager.handleJobError(socket.agentId, msg)
    
    // Broadcast job error to subscribed clients
    if (msg.projectId) {
      broadcastToProject(msg.projectId, {
        type: 'job_error',
        jobId: msg.jobId,
        projectId: msg.projectId,
        status: 'failed',
        error: msg.error,
        timestamp: msg.timestamp || new Date().toISOString()
      })
    }
    
  } catch (error) {
    logger.error('Job error handling error:', error)
  }
}

async function handleJobFailure(socket, msg, agentManager) {
  try {
    // Handle job failure (called on every failure, including during retries)
    agentManager.handleJobFailure(socket.agentId, msg)
    
    // Broadcast job failure to subscribed clients (but don't mark as permanently failed)
    if (msg.projectId) {
      broadcastToProject(msg.projectId, {
        type: 'job_failure',
        jobId: msg.jobId,
        projectId: msg.projectId,
        error: msg.error,
        isRetrying: msg.isRetrying || false,
        timestamp: msg.timestamp || new Date().toISOString()
      })
    }
    
  } catch (error) {
    logger.error('Job failure handling error:', error)
  }
}

async function handleAgentJobStatus(socket, msg, agentManager) {
  try {
    const { jobId, status, error, output, outputLines, exitCode, currentJobs, message } = msg

    logger.info(`Agent job status update: ${jobId} -> ${status}`)

    // Update agent status based on current jobs
    if (currentJobs !== undefined) {
      const agent = agentManager.agentData.get(socket.agentId)
      if (agent) {
        agent.currentJobs = currentJobs
        agent.status = currentJobs > 0 ? 'busy' : 'online'
        agent.lastHeartbeat = new Date().toISOString()
      }
    }

    // Get projectId from job record
    const job = await jobManager.getJob(jobId)
    
    if (!job) {
      logger.error(`Job ${jobId} not found for status update`)
      return
    }

    const projectId = job.projectId

    // Get agent name from agent manager
    const agent = agentManager.agentData.get(socket.agentId)
    const agentName = agent?.name || socket.agentId

    // Handle different job status types
    switch (status) {
      case 'started':
        // Job has started execution on the agent
        broadcastToProject(projectId, {
          type: 'job_started',
          jobId,
          projectId,
          agentId: socket.agentId,
          agentName,
          status: 'running',
          timestamp: msg.timestamp || new Date().toISOString()
        })
        break

      case 'failed':
        // Job failed on the agent
        // Trigger failure routing (success/failure sockets)
        await agentManager.handleJobError(socket.agentId, {
          jobId,
          error: error || message,
          exitCode: exitCode || 1,
          output: output || ''
        })

        broadcastToProject(projectId, {
          type: 'job_error',
          jobId,
          projectId,
          status: 'failed',
          error: error || message,
          output: output || '',
          outputLines: outputLines || [],
          exitCode: exitCode || 1,
          timestamp: msg.timestamp || new Date().toISOString()
        })
        break

      case 'cancelled':
        // Job was successfully cancelled
        broadcastToProject(projectId, {
          type: 'job_cancelled',
          jobId,
          projectId,
          status: 'cancelled',
          message: message || 'Job was cancelled',
          timestamp: msg.timestamp || new Date().toISOString()
        })
        break

      case 'cancelling':
        // Job is in the process of being cancelled
        broadcastToProject(projectId, {
          type: 'job_cancelling',
          jobId,
          projectId,
          status: 'cancelling',
          message: message || 'Job cancellation initiated',
          timestamp: msg.timestamp || new Date().toISOString()
        })
        break

      case 'cancel_failed':
        // Job cancellation failed
        broadcastToProject(projectId, {
          type: 'job_cancel_failed',
          jobId,
          projectId,
          status: 'cancel_failed',
          error: error || message || 'Job cancellation failed',
          timestamp: msg.timestamp || new Date().toISOString()
        })
        break

      default:
        logger.warn(`Unknown job status: ${status} for job ${jobId}`)
        break
    }

  } catch (error) {
    logger.error('Agent job status handling error:', error)
  }
}

// Broadcasting functions
function broadcastToClients(message) {
  try {
    let successCount = 0
    clientConnections.forEach((socket, clientId) => {
      if (socket && socket.clientAuthenticated) {
        socket.emit('message', message) // Use emit() for Socket.IO
        successCount++
      }
    })
  } catch (error) {
    logger.error('Error broadcasting to clients:', error)
  }
}

function broadcastToProject(projectId, message) {
  try {
    const subscribedClients = projectSubscriptions.get(projectId)
    if (!subscribedClients) {
      logger.info(`No subscribers for project ${projectId}`)
      return
    }
    
    let successCount = 0
    subscribedClients.forEach(clientId => {
      const socket = clientConnections.get(clientId)
      if (socket && socket.clientAuthenticated) {
        socket.emit('message', message) // Use emit() for Socket.IO
        successCount++
      }
    })
  } catch (error) {
    logger.error('Error broadcasting to project:', error)
  }
}

// Handle orphaned jobs when agent disconnects
async function handleOrphanedJobs(agentId, agentManager) {
  try {
    const activeJobs = await jobManager.getActiveJobs()
    
    const orphanedJobs = activeJobs.filter(job => job.agentId === agentId)
    
    if (orphanedJobs.length === 0) {
      logger.info(`No orphaned jobs for disconnected agent ${agentId}`)
      return
    }
    
    logger.info(`🚨 Found ${orphanedJobs.length} orphaned jobs for agent ${agentId}`)
    
    for (const job of orphanedJobs) {
      const errorMsg = `Agent ${agentId} disconnected during job execution`
      
      // Check if job requires specific agent (no reassignment possible)
      const requiresSpecificAgent = job.executionCommands && 
        job.currentCommandIndex !== undefined &&
        job.executionCommands[job.currentCommandIndex]?.requiredAgentId &&
        job.executionCommands[job.currentCommandIndex].requiredAgentId !== 'any'
      
      if (requiresSpecificAgent) {
        // Job requires specific agent - mark as failed and wait for reconnection
        logger.info(`⏸️ Job ${job.jobId} requires specific agent ${agentId} - marking as failed (will retry on reconnection)`)
        
        await jobManager.updateJob(job.jobId, {
          status: 'failed',
          error: `${errorMsg}. Job requires specific agent and cannot be reassigned.`,
          failedAt: new Date(),
          canRetryOnReconnect: true // Flag for potential retry
        })
      } else {
        // Job can run on any agent - attempt reassignment
        logger.info(`🔄 Attempting to reassign job ${job.jobId} to another agent`)
        
        const availableAgent = await agentManager.findAvailableAgent()
        
        if (availableAgent) {
          logger.info(`Reassigning job ${job.jobId} to agent ${availableAgent.agentId}`)
          
          // Get current command to retry
          const currentCommand = job.executionCommands?.[job.currentCommandIndex || 0]
          
          if (currentCommand) {
            // Update job with new agent
            await jobManager.updateJob(job.jobId, {
              agentId: availableAgent.agentId,
              agentName: availableAgent.name || availableAgent.hostname,
              status: 'running',
              error: null // Clear previous error
            })
            
            // Dispatch to new agent
            const dispatchSuccess = await agentManager.dispatchJobToAgent(availableAgent.agentId, {
              jobId: job.jobId,
              projectId: job.projectId,
              commands: currentCommand.script,
              environment: {},
              workingDirectory: currentCommand.workingDirectory || '.',
              timeout: currentCommand.timeout,
              jobType: currentCommand.type,
              retryEnabled: currentCommand.retryEnabled,
              maxRetries: currentCommand.maxRetries,
              retryDelay: currentCommand.retryDelay,
              isSequential: true,
              commandIndex: job.currentCommandIndex || 0,
              totalCommands: job.executionCommands?.length || 1,
              isReassignment: true
            })
            
            if (!dispatchSuccess) {
              logger.error(`Failed to reassign job ${job.jobId} - marking as failed`)
              await jobManager.updateJob(job.jobId, {
                status: 'failed',
                error: `${errorMsg}. Failed to reassign to available agent.`,
                failedAt: new Date()
              })
            }
          } else {
            logger.error(`No current command found for job ${job.jobId} - marking as failed`)
            await jobManager.updateJob(job.jobId, {
              status: 'failed',
              error: `${errorMsg}. No command to retry.`,
              failedAt: new Date()
            })
          }
        } else {
          // No available agents - mark as failed
          logger.info(`No available agents for reassignment - marking job ${job.jobId} as failed`)
          await jobManager.updateJob(job.jobId, {
            status: 'failed',
            error: `${errorMsg}. No available agents for reassignment.`,
            failedAt: new Date()
          })
        }
      }
      
      // Update build status if job has associated build
      if (job.buildNumber) {
        try {
          const buildStatsManager = await getBuildStatsManager()

          const updatedJob = await jobManager.getJob(job.jobId)
          if (updatedJob.status === 'failed') {
            await buildStatsManager.finishBuild(job.projectId, job.buildNumber, {
              status: 'failure',
              message: updatedJob.error,
              nodesExecuted: (job.currentCommandIndex || 0) + 1
            })
            logger.info(`BUILD STATS: Build #${job.buildNumber} for project "${job.projectName}" marked as failed due to agent disconnect`)
          }
        } catch (buildError) {
          logger.warn('Failed to update build record for orphaned job:', buildError)
        }
      }
    }
    
  } catch (error) {
    logger.error('Error handling orphaned jobs:', error)
  }
}

// Check for jobs that can retry when specific agent reconnects
async function checkRetryableJobsOnReconnect(agentId, agentManager) {
  try {
    const allJobs = Array.from(jobManager.jobs.values())
    
    const retryableJobs = allJobs.filter(job => 
      job.status === 'failed' && 
      job.canRetryOnReconnect === true &&
      job.agentId === agentId
    )
    
    if (retryableJobs.length === 0) {
      logger.info(`No retryable jobs for reconnected agent ${agentId}`)
      return
    }
    
    logger.info(`🔄 Found ${retryableJobs.length} retryable jobs for agent ${agentId}`)
    
    for (const job of retryableJobs) {
      logger.info(`🔄 Retrying job ${job.jobId} on reconnected agent ${agentId}`)
      
      // Get current command to retry
      const currentCommand = job.executionCommands?.[job.currentCommandIndex || 0]
      
      if (currentCommand) {
        // Update job status to retry
        await jobManager.updateJob(job.jobId, {
          status: 'running',
          error: null,
          canRetryOnReconnect: false, // Clear retry flag
          retriedAt: new Date()
        })
        
        // Dispatch to reconnected agent
        const dispatchSuccess = await agentManager.dispatchJobToAgent(agentId, {
          jobId: job.jobId,
          projectId: job.projectId,
          commands: currentCommand.script,
          environment: {},
          workingDirectory: currentCommand.workingDirectory || '.',
          timeout: currentCommand.timeout,
          jobType: currentCommand.type,
          retryEnabled: currentCommand.retryEnabled,
          maxRetries: currentCommand.maxRetries,
          retryDelay: currentCommand.retryDelay,
          isSequential: true,
          commandIndex: job.currentCommandIndex || 0,
          totalCommands: job.executionCommands?.length || 1,
          isRetry: true
        })
        
        if (!dispatchSuccess) {
          logger.error(`Failed to retry job ${job.jobId} on reconnected agent`)
          await jobManager.updateJob(job.jobId, {
            status: 'failed',
            error: 'Failed to retry job on agent reconnection',
            failedAt: new Date()
          })
        } else {
          logger.info(`Successfully retried job ${job.jobId} on reconnected agent ${agentId}`)
        }
      }
    }
    
  } catch (error) {
    logger.error('Error checking retryable jobs on reconnect:', error)
  }
}

// Handle orphaned jobs on server restart
async function handleServerRestartOrphanedJobs(agentManager) {
  try {
    const activeJobs = await jobManager.getActiveJobs()
    
    if (activeJobs.length === 0) {
      logger.info(`No orphaned jobs found on server restart`)
      return
    }
    
    logger.info(`🚨 Found ${activeJobs.length} orphaned jobs on server restart`)
    
    for (const job of activeJobs) {
      const errorMsg = 'Server restarted during job execution'
      
      logger.info(`Marking job ${job.jobId} as failed due to server restart`)
      
      await jobManager.updateJob(job.jobId, {
        status: 'failed',
        error: errorMsg,
        failedAt: new Date()
      })
      
      // Update build status if job has associated build
      if (job.buildNumber) {
        try {
          const buildStatsManager = await getBuildStatsManager()

          await buildStatsManager.finishBuild(job.projectId, job.buildNumber, {
            status: 'failure',
            message: errorMsg,
            nodesExecuted: (job.currentCommandIndex || 0) + 1
          })
          logger.info(`BUILD STATS: Build #${job.buildNumber} for project "${job.projectName}" marked as failed due to server restart`)
        } catch (buildError) {
          logger.warn('Failed to update build record for restart orphaned job:', buildError)
        }
      }
    }
    
  } catch (error) {
    logger.error('Error handling server restart orphaned jobs:', error)
  }
}

export async function broadcastBuildCompletion(buildEvent) {
  try {
    logger.info(`Processing build completion for job triggers:\nType: ${buildEvent.type}\nStatus: ${buildEvent.status}\nSource Project ID: ${buildEvent.sourceProjectId}`)
    await checkAndTriggerJobs(buildEvent)
  } catch (error) {
    logger.error('Error broadcasting build completion:', error)
  }
}

async function checkAndTriggerJobs(buildEvent) {
  try {
    const dataService = await getDataService()
    const allProjects = await dataService.getAllItems()
    
    for (const project of allProjects) {
      if (project.type !== 'project' || !project.diagramData) continue
      
      const { nodes } = project.diagramData
      if (!nodes || !Array.isArray(nodes)) continue
      
      const jobTriggerNodes = nodes.filter(node => 
        node.data?.nodeType === 'job-trigger' &&
        node.data.sourceProjectId === buildEvent.sourceProjectId
      )
      
      for (const triggerNode of jobTriggerNodes) {
        const shouldTrigger = checkTriggerCondition(triggerNode.data.triggerOn, buildEvent.status)
        
        if (shouldTrigger) {
          logger.info(`Triggering project ${project.name} due to ${buildEvent.sourceProjectId} completion`)
          await executeTriggeredProject(project, triggerNode, buildEvent)
        }
      }
    }
  } catch (error) {
    logger.error('Error checking job triggers:', error)
  }
}

function checkTriggerCondition(triggerOn, buildStatus) {
  switch (triggerOn) {
    case 'success': return buildStatus === 'success'
    case 'failure': return buildStatus === 'failure'
    case 'always': return buildStatus === 'success' || buildStatus === 'failure'
    default: return false
  }
}

async function executeTriggeredProject(project, triggerNode, buildEvent) {
  try {
    if (project.status === 'disabled') {
      logger.info(`Skipping disabled project: ${project.name}`)
      return
    }
    
    const executionData = {
      projectId: project.id,
      nodes: project.diagramData.nodes,
      edges: project.diagramData.edges,
      startTime: new Date().toISOString(),
      trigger: 'job-trigger'
    }
    
    const response = await $fetch('/api/projects/execute', {
      method: 'POST',
      body: executionData
    })
    
    if (response.success) {
      logger.info(`Successfully triggered project ${project.name} on agent ${response.agentName}`)
      broadcastToProject(project.id, {
        type: 'job_triggered',
        projectId: project.id,
        sourceProjectId: buildEvent.sourceProjectId,
        triggerNode: triggerNode.data.label,
        agentId: response.agentId,
        jobId: response.jobId,
        message: `Project triggered by ${buildEvent.sourceProjectId} completion (${buildEvent.status})`,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    logger.error(`Error executing triggered project ${project.name}:`, error)
  }
}