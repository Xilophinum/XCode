import { Server as Engine } from "engine.io";
import { Server } from "socket.io";
import jwt from 'jsonwebtoken'
import { getAgentManager } from '../utils/agentManager.js'
import { getDataService } from '../utils/dataService.js'

// Store client connections for broadcasting
const clientConnections = new Map() // clientId -> socket
const projectSubscriptions = new Map() // projectId -> Set of clientIds

export default defineNitroPlugin(async (nitroApp) => {
  const engine = new Engine();
  const io = new Server();

  io.bind(engine);

  // Get the persistent agent manager
  const agentManager = await getAgentManager()
  console.log(`🔧 WebSocket plugin initialized - existing agents: ${agentManager.agentData.size}, connections: ${agentManager.connectedAgents.size}`)

  // Store io instance globally for broadcasting from other modules
  globalThis.socketIO = io
  globalThis.broadcastToClients = broadcastToClients
  globalThis.broadcastToProject = broadcastToProject

  io.on("connection", (socket) => {
    console.log("New connection:", socket.id);
    
    // Check if this might be a reconnection of an existing agent
    console.log(`🔧 Current state - agentData: ${agentManager.agentData.size}, connectedAgents: ${agentManager.connectedAgents.size}`)
    
    // Handle Socket.IO events directly (for client connections)
    socket.on("authenticate", async (msg) => {
      try {
        console.log('📨 Direct authenticate event received:', msg)
        // Handle client authentication
        if (msg.type === 'client') {
          await handleClientAuthentication(socket, msg)
        } else {
          // Handle agent authentication via message format
          await handleAuthentication(socket, msg, agentManager)
        }
      } catch (error) {
        console.error('❌ Error handling authenticate event:', error)
      }
    })
    
    socket.on("subscribe_project", async (msg) => {
      try {
        console.log('📨 Direct subscribe_project event received:', msg)
        if (socket.clientAuthenticated) {
          await handleProjectSubscription(socket, msg)
        } else {
          console.log(`❌ Project subscription attempted by unauthenticated client: ${socket.id}`)
        }
      } catch (error) {
        console.error('❌ Error handling subscribe_project event:', error)
      }
    })
    
    socket.on("unsubscribe_project", async (msg) => {
      try {
        console.log('📨 Direct unsubscribe_project event received:', msg)
        if (socket.clientAuthenticated) {
          await handleProjectUnsubscription(socket, msg)
        } else {
          console.log(`❌ Project unsubscription attempted by unauthenticated client: ${socket.id}`)
        }
      } catch (error) {
        console.error('❌ Error handling unsubscribe_project event:', error)
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
              console.log(`❌ Registration attempted by unauthenticated socket: ${socket.id}`)
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
              console.log(`❌ Project subscription attempted by unauthenticated client: ${socket.id}`)
            }
            break
            
          case 'unsubscribe_project':
            if (socket.clientAuthenticated) {
              await handleProjectUnsubscription(socket, msg)
            } else {
              console.log(`❌ Project unsubscription attempted by unauthenticated client: ${socket.id}`)
            }
            break
            
          // Agent job communication (existing)
          case 'job_output':
            if (socket.authenticated) {
              await handleJobOutput(socket, msg, agentManager)
            } else {
              console.log(`❌ Job output from unauthenticated socket: ${socket.id}`)
            }
            break
            
          case 'job_complete':
            if (socket.authenticated) {
              await handleJobComplete(socket, msg, agentManager)
            } else {
              console.log(`❌ Job complete from unauthenticated socket: ${socket.id}`)
            }
            break
            
          case 'job_error':
            if (socket.authenticated) {
              await handleJobError(socket, msg, agentManager)
            } else {
              console.log(`❌ Job error from unauthenticated socket: ${socket.id}`)
            }
            break
            
          case 'agent:job_status':
            if (socket.authenticated) {
              // Job status update from agent - could update job progress if needed
              console.log(`📊 Job status update from agent ${socket.agentId}:`, msg)
            } else {
              console.log(`❌ Job status from unauthenticated socket: ${socket.id}`)
            }
            break
            
          case 'heartbeat':
          case 'agent:heartbeat':
            if (socket.authenticated) {
              await handleHeartbeat(socket, msg, agentManager)
            } else {
              console.log(`❌ Heartbeat from unauthenticated socket: ${socket.id} - agentId: ${socket.agentId}`)
            }
            break
            
          default:
            console.log('Unknown message type:', msg.type)
        }
      } catch (error) {
        console.error('❌ Error handling WebSocket message:', error)
        console.error('❌ Original message:', typeof msg, JSON.stringify(msg, null, 2))
        console.error('❌ Error details:', error.message, error.stack)
        socket.emit('message', {
          type: 'error',
          message: 'Invalid message format'
        })
      }
    });

    socket.on("disconnect", async () => {
      console.log("Connection disconnected:", socket.id);
      
      // Clean up agent from manager if it was authenticated
      if (socket.authenticated && socket.agentId) {
        // Mark agent as offline in database
        try {
          const dataService = agentManager.dataService || await getDataService()
          await dataService.updateAgentStatus(socket.agentId, 'offline')
        } catch (error) {
          console.error('Error updating agent status to offline:', error)
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
        console.log(`🔌 Agent ${socket.agentId} disconnected and marked offline`)
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
        
        console.log(`🔌 Client ${socket.clientId} disconnected and cleaned up`)
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
    console.log('Agent authenticating with token')
    
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

    console.log(`✅ Agent ${agentId} (${agentRecord.name}) authenticated successfully`)
    
    // Send authentication success
    socket.emit('message', {
      type: 'authenticated',
      agentId: agentId,
      status: 'connected'
    })
    
  } catch (error) {
    console.error('Authentication error:', error)
    socket.emit('message', {
      type: 'error',
      message: 'Authentication failed'
    })
  }
}

async function handleAgentRegistration(socket, msg, agentManager) {
  try {
    console.log(`Agent ${socket.agentId} registering with capabilities`)
    
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
    
    console.log(`✅ Agent ${socket.agentId} registered successfully`)
    console.log(`📊 Platform: ${agentInfo.platform} (${agentInfo.architecture})`)
    console.log(`🏠 Hostname: ${agentInfo.hostname}`)
    console.log(`⚡ Capabilities: ${agentInfo.capabilities.join(', ')}`)
    
    // Broadcast agent registration to all admin connections
    console.log(`📡 Broadcasting agent registration update for ${socket.agentId}`)
    broadcastToClients({
      type: 'agent_status_update',
      agentId: socket.agentId,
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
      status: 'registered',
      message: 'Agent registered successfully'
    })
    
  } catch (error) {
    console.error('Registration error:', error)
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
    
    // Update agent data
    if (agentManager.agentData.has(agentId)) {
      const agentInfo = agentManager.agentData.get(agentId)
      agentInfo.status = status
      agentInfo.currentJobs = currentJobs || 0
      agentInfo.lastHeartbeat = new Date()
      agentManager.agentData.set(agentId, agentInfo)
    } else {
      console.log(`⚠️ Agent ${agentId} not found in agentData during heartbeat - recreating entry`)
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
      console.log(`🔧 Re-adding agent ${agentId} to connectedAgents`)
      agentManager.connectedAgents.set(agentId, socket)
    }
    
    // Broadcast agent status update to all connected clients
    broadcastToClients({
      type: 'agent_status_update',
      agentId: agentId,
      status: status,
      currentJobs: currentJobs || 0,
      lastHeartbeat: new Date().toISOString(),
      timestamp: new Date().toISOString()
    })
    
    // Send heartbeat acknowledgment
    socket.emit('message', {
      type: 'heartbeat_ack',
      timestamp: new Date().toISOString(),
      status: 'received'
    })
    
  } catch (error) {
    console.error('Heartbeat error:', error)
    socket.emit('message', {
      type: 'error',
      message: 'Heartbeat processing failed'
    })
  }
}

// Client authentication and subscription handlers
async function handleClientAuthentication(socket, msg) {
  try {
    console.log('Client authenticating with user data:', msg)
    
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
      console.error('JWT verification failed:', jwtError.message)
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
    socket.clientId = `client_${user.id}_${socket.id}` // Include user ID in client ID
    socket.userId = user.id
    socket.userEmail = user.email
    
    // Store in client connections map
    clientConnections.set(socket.clientId, socket)
    
    console.log(`✅ Client authenticated: ${user.email} (ID: ${user.id})`)
    
    // Send authentication success
    socket.emit('client_authenticated', {
      clientId: socket.clientId,
      userId: user.id,
      userEmail: user.email,
      status: 'connected'
    })
    
  } catch (error) {
    console.error('Client authentication error:', error)
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
    
    console.log(`📡 Client ${socket.clientId} subscribed to project ${projectId}`)
    
    socket.emit('project_subscribed', {
      projectId: projectId,
      status: 'subscribed'
    })
    
  } catch (error) {
    console.error('Project subscription error:', error)
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
    
    console.log(`📡 Client ${socket.clientId} unsubscribed from project ${projectId}`)
    
    socket.emit('project_unsubscribed', {
      projectId: projectId,
      status: 'unsubscribed'
    })
    
  } catch (error) {
    console.error('Project unsubscription error:', error)
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
    console.error('Job output handling error:', error)
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
        timestamp: msg.timestamp || new Date().toISOString()
      })
    }
    
  } catch (error) {
    console.error('Job completion handling error:', error)
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
    console.error('Job error handling error:', error)
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
    console.log(`📡 Broadcasted to ${successCount} clients:`, message.type)
  } catch (error) {
    console.error('Error broadcasting to clients:', error)
  }
}

function broadcastToProject(projectId, message) {
  try {
    const subscribedClients = projectSubscriptions.get(projectId)
    if (!subscribedClients) {
      console.log(`📡 No subscribers for project ${projectId}`)
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
    
    console.log(`📡 Broadcasted to ${successCount}/${subscribedClients.size} clients for project ${projectId}:`, message.type)
  } catch (error) {
    console.error('Error broadcasting to project:', error)
  }
}