import { getDataService } from './dataService.js'
import { jobManager } from './jobManager.js'
import { getBuildStatsManager } from './buildStatsManager.js'

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
          const nextRequiresSpecificAgent = nextCommand.requiredAgentId && nextCommand.requiredAgentId !== 'any'
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

            // Update build status if this job is associated with a build
            if (job.buildId) {
              try {
                const buildStatsManager = await getBuildStatsManager()
                await buildStatsManager.finishBuild(job.buildId, {
                  status: 'failure',
                  message: errorMsg,
                  nodesExecuted: currentIndex + 1
                })
                console.log(`📊 BUILD STATS: Build ${job.buildId} marked as failed (no agent available)`)
              } catch (buildError) {
                console.warn('Failed to update build record on agent unavailable:', buildError)
              }
            }
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
            retryEnabled: nextCommand.retryEnabled,
            maxRetries: nextCommand.maxRetries,
            retryDelay: nextCommand.retryDelay,
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

            // Update build status if this job is associated with a build
            if (job.buildId) {
              try {
                const buildStatsManager = await getBuildStatsManager()
                await buildStatsManager.finishBuild(job.buildId, {
                  status: 'failure',
                  message: 'Failed to dispatch next command in sequence',
                  nodesExecuted: nextIndex
                })
                console.log(`📊 BUILD STATS: Build ${job.buildId} marked as failed (dispatch failed)`)
              } catch (buildError) {
                console.warn('Failed to update build record on dispatch failure:', buildError)
              }
            }
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
        finalOutput: output,
        message: `Job completed successfully (exit code: ${exitCode || 0})`
      })
      
      // Trigger next nodes based on success
      await this.triggerNextNodes(job, { success: true, exitCode: exitCode || 0 })

      // Update build status if this job is associated with a build
      if (job.buildId) {
        try {
          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(job.buildId, {
            status: 'success',
            message: `Job completed successfully (exit code: ${exitCode || 0})`,
            nodesExecuted: job.executionCommands ? job.executionCommands.length : 1
          })
          console.log(`📊 BUILD STATS: Build ${job.buildId} marked as successful`)
        } catch (buildError) {
          console.warn('Failed to update build record on job completion:', buildError)
        }
      }
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
      
      // Trigger next nodes based on failure
      if (job) {
        await this.triggerNextNodes(job, { success: false, exitCode: exitCode || 1, error: errorMessage })
      }

      // Update build status if this job is associated with a build
      if (job && job.buildId) {
        try {
          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(job.buildId, {
            status: 'failure',
            message: errorMessage,
            nodesExecuted: job.executionCommands ? (job.currentCommandIndex || 0) + 1 : 0
          })
          console.log(`📊 BUILD STATS: Build ${job.buildId} marked as failed`)
        } catch (buildError) {
          console.warn('Failed to update build record on job error:', buildError)
        }
      }
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
      // Handle "local" as a special case - find the local agent
      if (requirements.agentId === 'local') {
        console.log(`🔍 Looking for local agent...`)
        
        // Find the local agent by name
        for (const [agentId, agentInfo] of this.agentData) {
          if (agentInfo.name === 'Local Agent' && agentInfo.status === 'online') {
            const socket = this.connectedAgents.get(agentId)
            if (socket && socket.connected) {
              console.log(`✅ Found local agent: ${agentId}`)
              return agentInfo
            }
          }
        }
        
        console.log(`❌ Local agent not available - BLOCKING execution`)
        return null
      }
      
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
  
  // Trigger next nodes based on execution result
  async triggerNextNodes(job, executionResult) {
    if (!job.nodes || !job.edges) {
      console.log(`⚠️ No graph data available for job ${job.jobId} to trigger next nodes`)
      return
    }
    
    try {
      const { convertGraphToCommands } = await import('../api/projects/execute.post.js')
      
      // Find the current node that just completed
      const currentNode = job.nodes.find(node => 
        ['bash', 'powershell', 'cmd', 'python', 'node-js'].includes(node.data?.nodeType)
      )
      
      if (!currentNode) {
        console.log(`⚠️ Could not find execution node for job ${job.jobId}`)
        return
      }
      
      // Get next nodes based on execution result
      const { getExecutionConnectedNodes } = await import('../api/projects/execute.post.js')
      const nextNodes = getExecutionConnectedNodes(currentNode.id, job.nodes, job.edges, new Map(), executionResult)
      
      if (nextNodes.length === 0) {
        console.log(`🏁 No next nodes to execute for job ${job.jobId}`)
        return
      }
      
      console.log(`🔄 Triggering ${nextNodes.length} next nodes for job ${job.jobId}`)
      
      // Execute next nodes
      for (const nextNode of nextNodes) {
        const nextCommands = convertGraphToCommands([nextNode], job.edges)
        
        if (nextCommands.length > 0) {
          console.log(`🚀 Executing next node: ${nextNode.data.label}`)
          // This would trigger execution of the next node
          // For now, just log it - full implementation would dispatch to agent
        }
      }
      
    } catch (error) {
      console.error(`❌ Error triggering next nodes for job ${job.jobId}:`, error)
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