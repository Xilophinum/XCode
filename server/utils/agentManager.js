import { getDataService } from './dataService.js'
import { jobManager } from './jobManager.js'

class AgentManager {
  constructor() {
    this.io = null
    this.connectedAgents = new Map() // agentId -> socket
    this.agentData = new Map() // agentId -> agent info
    this.dataService = null
    this.heartbeatIntervals = new Map() // agentId -> interval
  }

  async initialize(server = null) {
    this.dataService = await getDataService()
    console.log('AgentManager initialized (Socket.IO handled by plugin)')
    
    // Note: Socket.IO initialization is now handled by the Nitro plugin
    // This method is kept for backward compatibility and data service setup
  }

  // Register agent connection (called from the plugin)
  registerAgent(socket) {
    // Store the socket for later use
    this.connectedAgents.set(socket.id, socket)
  }

  // Unregister agent (called from the plugin)
  unregisterAgent(agentId) {
    if (this.connectedAgents.has(agentId)) {
      this.connectedAgents.delete(agentId)
    }
    
    // Clear heartbeat interval
    if (this.heartbeatIntervals.has(agentId)) {
      clearInterval(this.heartbeatIntervals.get(agentId))
      this.heartbeatIntervals.delete(agentId)
    }
  }

  // Update agent status
  updateAgentStatus(agentId, status, data = {}) {
    if (this.agentData.has(agentId)) {
      const agentInfo = this.agentData.get(agentId)
      agentInfo.status = status
      agentInfo.lastUpdate = new Date()
      Object.assign(agentInfo, data)
      this.agentData.set(agentId, agentInfo)
    }
  }

  // Handle job output from agent
  handleJobOutput(agentId, data) {
    const { jobId, output, type } = data
    
    if (jobId && output) {
      // The output from the agent is already in the correct format
      // Just add it to the job's output array
      jobManager.addJobOutput(jobId, output)
      console.log(`📋 Added job output for ${jobId}:`, output.message || output)
    }
  }

  // Handle job completion from agent
  async handleJobComplete(agentId, data) {
    const { jobId, exitCode, output } = data
    
    if (jobId) {
      // Get current job state
      const job = await jobManager.getJob(jobId)
      
      if (!job) {
        console.error(`❌ Job ${jobId} not found during completion handling`)
        return
      }

      // Check if this is a sequential execution job with more commands
      if (job.executionCommands && job.currentCommandIndex !== undefined) {
        const currentIndex = job.currentCommandIndex
        const totalCommands = job.executionCommands.length
        
        console.log(`✅ Command ${currentIndex + 1}/${totalCommands} completed for job ${jobId}`)
        
        // Check if there are more commands to execute
        if (currentIndex + 1 < totalCommands) {
          const nextIndex = currentIndex + 1
          const nextCommand = job.executionCommands[nextIndex]
          
          console.log(`🔄 Starting next command ${nextIndex + 1}/${totalCommands}: ${nextCommand.nodeLabel}`)
          
          // Find agent for the next command
          // Handle "any" as explicit choice for any available agent
          const nextRequiresSpecificAgent = nextCommand.requiredAgentId && nextCommand.requiredAgentId !== 'any' && nextCommand.requiredAgentId !== 'local'
          const nextAgentRequirements = nextRequiresSpecificAgent ? { agentId: nextCommand.requiredAgentId } : {}
          const nextAgent = await this.findAvailableAgent(nextAgentRequirements)
          
          if (!nextAgent) {
            const errorMsg = nextRequiresSpecificAgent
              ? `🚨 CRITICAL: Required agent "${nextCommand.requiredAgentId}" not available for command: ${nextCommand.nodeLabel}. Sequential execution STOPPED to prevent running on wrong environment.`
              : 'No agents available for next command'
            
            console.error(`❌ ${errorMsg}`)
            await jobManager.updateJob(jobId, {
              status: 'failed',
              error: errorMsg,
              failedAt: new Date()
            })
            return
          }
          
          if (nextRequiresSpecificAgent) {
            console.log(`🔒 ENFORCING agent selection: ${nextAgent.agentId} for command: ${nextCommand.nodeLabel}`)
          } else {
            console.log(`🎯 Selected agent ${nextAgent.agentId} for next command: ${nextCommand.nodeLabel} (user chose "any available")`)
          }
          
          // Update job with next command index and agent
          await jobManager.updateJob(jobId, { 
            currentCommandIndex: nextIndex,
            agentId: nextAgent.agentId,
            agentName: nextAgent.name || nextAgent.hostname,
            status: 'running'
          })
          
          // Dispatch next command to the appropriate agent
          const dispatchSuccess = await this.dispatchJobToAgent(nextAgent.agentId, {
            jobId,
            projectId: job.projectId,
            commands: nextCommand.script,
            environment: {},
            workingDirectory: nextCommand.workingDirectory || '.',
            timeout: nextCommand.timeout,
            jobType: nextCommand.type,
            isSequential: true,
            commandIndex: nextIndex,
            totalCommands: totalCommands
          })
          
          if (!dispatchSuccess) {
            console.error(`❌ Failed to dispatch next command for job ${jobId}`)
            await jobManager.updateJob(jobId, {
              status: 'failed',
              error: 'Failed to dispatch next command in sequence',
              failedAt: new Date()
            })
          }
          
          return // Don't mark job as completed yet
        }
      }
      
      // No more commands or not a sequential job - mark as completed
      console.log(`🎉 All commands completed for job ${jobId}`)
      await jobManager.updateJob(jobId, { 
        status: 'completed',
        exitCode: exitCode || 0,
        completedAt: new Date(),
        finalOutput: output
      })
    }
  }

  // Handle job error from agent
  async handleJobError(agentId, data) {
    const { jobId, error, exitCode } = data
    
    if (jobId) {
      // Get current job state to provide better error context
      const job = await jobManager.getJob(jobId)
      
      let errorMessage = error
      if (job && job.executionCommands && job.currentCommandIndex !== undefined) {
        const currentIndex = job.currentCommandIndex
        const totalCommands = job.executionCommands.length
        const currentCommand = job.executionCommands[currentIndex]
        
        errorMessage = `Command ${currentIndex + 1}/${totalCommands} failed (${currentCommand.nodeLabel}): ${error}`
        console.log(`❌ Sequential execution failed at command ${currentIndex + 1}/${totalCommands}: ${currentCommand.nodeLabel}`)
      }
      
      // Mark job as failed
      await jobManager.updateJob(jobId, {
        status: 'failed',
        error: errorMessage,
        exitCode: exitCode || 1,
        failedAt: new Date()
      })
    }
  }

  // Dispatch job to specific agent
  async dispatchJobToAgent(agentId, jobData) {
    const socket = this.connectedAgents.get(agentId)
    
    if (!socket || !socket.connected) {
      console.error(`Agent ${agentId} is not connected`)
      return false
    }

    try {
      console.log(`🚀 Dispatching job to agent ${agentId}:`, jobData)
      
      // Send job to agent using Socket.IO
      socket.emit('message', {
        type: 'execute_job',
        ...jobData
      })

      console.log(`Job ${jobData.jobId} dispatched to agent ${agentId}`)
      return true
    } catch (error) {
      console.error(`Failed to dispatch job to agent ${agentId}:`, error)
      return false
    }
  }

  // Cancel job on specific agent
  async cancelJobOnAgent(agentId, jobId) {
    const socket = this.connectedAgents.get(agentId)
    
    if (!socket) {
      throw new Error(`Agent ${agentId} is not connected`)
    }
    // Send cancellation to agent using Nuxt WebSocket
    socket.send({
      type: 'cancel_job',
      jobId: jobId
    })

    console.log(`Job ${jobId} cancellation sent to agent ${agentId}`)
  }

  // Find available agent for job execution
  async findAvailableAgent(requirements = {}) {
    console.log(`🔍 findAvailableAgent: Checking ${this.connectedAgents.size} connected agents`)
    console.log(`🔍 findAvailableAgent: Agent data has ${this.agentData.size} entries`)
    console.log(`🔍 Requirements:`, requirements)
    
    // If a specific agent is requested, ONLY return that agent - no fallbacks!
    if (requirements.agentId) {
      const socket = this.connectedAgents.get(requirements.agentId)
      const agentInfo = this.agentData.get(requirements.agentId)
      
      if (socket && socket.connected && agentInfo && agentInfo.status === 'online') {
        console.log(`✅ Found requested agent: ${requirements.agentId}`)
        return agentInfo
      } else {
        console.log(`❌ REQUIRED agent ${requirements.agentId} not available - BLOCKING execution`)
        return null // NEVER fallback when specific agent is required
      }
    }
    
    // Only when NO specific agent is requested, find any available agent
    console.log(`🔍 No specific agent required - finding any available agent`)
    for (const [agentId, socket] of this.connectedAgents) {
      console.log(`🔍 Checking agent ${agentId}: connected=${socket?.connected}`)
      
      if (socket && socket.connected) { // Socket.IO connected state
        // Get agent data and return it
        const agentInfo = this.agentData.get(agentId)
        console.log(`🔍 Agent ${agentId} data:`, agentInfo)
        
        if (agentInfo && agentInfo.status === 'online') {
          console.log(`✅ Found available agent: ${agentId}`)
          return agentInfo
        } else {
          console.log(`❌ Agent ${agentId} not available - no data or not online`)
        }
      } else {
        console.log(`❌ Agent ${agentId} not connected`)
      }
    }
    
    console.log(`❌ No available agents found`)
    return null
  }

  // Get connected agents
  getConnectedAgents() {
    return Array.from(this.connectedAgents.keys())
  }

  // Broadcast message to all agents
  broadcastToAgents(type, data) {
    for (const [agentId, socket] of this.connectedAgents) {
      if (socket && socket.connected) {
        socket.emit('message', {
          type: type,
          ...data
        })
      }
    }
  }
}

// Create singleton instance that persists across HMR rebuilds
let agentManager = null

// Use globalThis to persist across rebuilds in development
if (process.env.NODE_ENV === 'development') {
  if (!globalThis.__agentManager) {
    globalThis.__agentManager = new AgentManager()
  }
  agentManager = globalThis.__agentManager
}

export async function getAgentManager() {
  if (!agentManager) {
    agentManager = new AgentManager()
    if (process.env.NODE_ENV === 'development') {
      globalThis.__agentManager = agentManager
    }
  }
  return agentManager
}

export { AgentManager }