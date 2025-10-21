import { getDataService } from './dataService.js'
import { jobManager } from './jobManager.js'
import { getBuildStatsManager } from './buildStatsManager.js'
import { getExecutionConnectedNodes } from '../api/projects/execute.post.js'
import { executeParallelBranches } from './orchestrators/parallelBranchesOrchestrator.js'
import { executeParallelMatrix } from './orchestrators/parallelMatrixOrchestrator.js'

class AgentManager {
  constructor() {
    this.io = null
    this.connectedAgents = new Map() // agentId -> socket
    this.agentData = new Map() // agentId -> agent info
    this.dataService = null
    this.heartbeatIntervals = new Map() // agentId -> interval
    this.jobCompletionCallbacks = new Map() // jobId -> callback function
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
  async handleJobOutput(agentId, data) {
    const { jobId, output, type } = data
    
    if (jobId && output) {
      // The output from the agent is already in the correct format
      // Just add it to the job's output array (will be stored in build record)
      await jobManager.addJobOutput(jobId, output)
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

          // Check if the next command is a parallel orchestrator
          if (nextCommand.type === 'parallel_branches_orchestrator') {
            console.log(`🔀 Executing parallel branches orchestrator`)
            await this.executeParallelBranches(jobId, nextCommand, job)
            return // Don't continue with normal sequential flow
          }

          if (nextCommand.type === 'parallel_matrix_orchestrator') {
            console.log(`🔀 Executing parallel matrix orchestrator`)
            await this.executeParallelMatrix(jobId, nextCommand, job)
            return // Don't continue with normal sequential flow
          }
          
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
              failedAt: new Date().toISOString()
            })

            // Update build status if this job is associated with a build
            if (job.buildNumber) {
              try {
                const buildStatsManager = await getBuildStatsManager()
                await buildStatsManager.finishBuild(job.projectId, job.buildNumber, {
                  status: 'failure',
                  message: errorMsg,
                  nodesExecuted: currentIndex + 1
                })
                console.log(`📊 BUILD STATS: Build #${job.buildNumber} for project "${job.projectName}" marked as failed (no agent available)`)
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
              failedAt: new Date().toISOString()
            })

            // Update build status if this job is associated with a build
            if (job.buildNumber) {
              try {
                const buildStatsManager = await getBuildStatsManager()
                await buildStatsManager.finishBuild(job.projectId, job.buildNumber, {
                  status: 'failure',
                  message: 'Failed to dispatch next command in sequence',
                  nodesExecuted: nextIndex
                })
                console.log(`📊 BUILD STATS: Build #${job.buildNumber} for project "${job.projectName}" marked as failed (dispatch failed)`)
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
        completedAt: new Date().toISOString(),
        finalOutput: output,
        message: `Job completed successfully (exit code: ${exitCode || 0})`
      })

      // Notify any waiting parallel orchestrators
      this.notifyJobCompletion(jobId, {
        jobId: jobId,
        success: true,
        exitCode: exitCode || 0,
        output: output
      })

      // Trigger next nodes based on success
      await this.triggerNextNodes(job, { success: true, exitCode: exitCode || 0 })

      // Update build status if this job is associated with a build
      if (job.buildNumber) {
        try {
          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(job.projectId, job.buildNumber, {
            status: 'success',
            message: `Job completed successfully (exit code: ${exitCode || 0})`,
            nodesExecuted: job.executionCommands ? job.executionCommands.length : 1
          })
          console.log(`📊 BUILD STATS: Build #${job.buildNumber} for project "${job.projectName}" marked as successful`)
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
        failedAt: new Date().toISOString()
      })

      // Notify any waiting parallel orchestrators
      this.notifyJobCompletion(jobId, {
        jobId: jobId,
        success: false,
        error: errorMessage,
        exitCode: exitCode || 1
      })

      // Trigger next nodes based on failure
      if (job) {
        await this.triggerNextNodes(job, { success: false, exitCode: exitCode || 1, error: errorMessage })
      }

      // Update build status if this job is associated with a build
      if (job && job.buildNumber) {
        try {
          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(job.projectId, job.buildNumber, {
            status: 'failure',
            message: errorMessage,
            nodesExecuted: job.executionCommands ? (job.currentCommandIndex || 0) + 1 : 0
          })
          console.log(`📊 BUILD STATS: Build #${job.buildNumber} for project "${job.projectName}" marked as failed`)
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
      console.log(`🚀 Dispatching job to agent ${agentId}:\nJob ID: ${jobData.jobId}\nProject ID: ${jobData.projectId}\nCommand(s): ${jobData.commands}`)
      
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
    // Send cancellation to agent using Socket.IO
    socket.emit('message', {
      type: 'cancel_job',
      jobId: jobId
    })

    console.log(`Job ${jobId} cancellation sent to agent ${agentId}`)
    return true
  }

  // Cancel job (wrapper method for API compatibility)
  cancelJob(agentId, jobData) {
    try {
      return this.cancelJobOnAgent(agentId, jobData.jobId)
    } catch (error) {
      console.error(`Failed to cancel job ${jobData.jobId} on agent ${agentId}:`, error)
      return false
    }
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
        if (agentInfo && ['online', 'idle', 'ready', 'busy'].includes(agentInfo.status)) {
          console.log(`✅ Found available agent: ${agentId} (status: ${agentInfo.status})`)
          return agentInfo
        } else {
          console.log(`❌ Agent ${agentId} not available - status: ${agentInfo?.status || 'no data'}`)
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
      // Find the last executed node based on job execution commands
      let currentNode = null
      if (job.executionCommands && job.currentCommandIndex !== undefined) {
        const lastCommand = job.executionCommands[job.currentCommandIndex]
        if (lastCommand) {
          currentNode = job.nodes.find(node => node.id === lastCommand.nodeId)
        }
      }
      
      // Fallback: find any execution node if we can't determine the current one
      if (!currentNode) {
        currentNode = job.nodes.find(node =>
          ['bash', 'powershell', 'cmd', 'python', 'node', 'parallel_branches'].includes(node.data?.nodeType)
        )
      }

      if (!currentNode) {
        console.log(`⚠️ Could not find current execution node for job ${job.jobId}`)
        return
      }

      console.log(`🔍 Finding next nodes from: ${currentNode.data.label} (${currentNode.data.nodeType})`)

      // Get next nodes based on execution result
      const nextNodes = getExecutionConnectedNodes(currentNode.id, job.nodes, job.edges, new Map(), executionResult)

      if (nextNodes.length === 0) {
        console.log(`🏁 No next nodes to execute for job ${job.jobId}`)
        return
      }

      console.log(`🔄 Triggering ${nextNodes.length} next nodes for job ${job.jobId}`)

      // Execute next nodes by creating new jobs
      for (const nextNode of nextNodes) {
        console.log(`🚀 Executing next node: ${nextNode.data.label}`)
        
        try {
          // Create execution data for the next node
          const executionData = {
            projectId: job.projectId,
            nodes: [nextNode], // Only execute this specific node
            edges: job.edges,
            startTime: new Date().toISOString(),
            trigger: 'node-completion'
          }
          
          // Execute the next node
          const response = await $fetch('/api/projects/execute', {
            method: 'POST',
            body: executionData
          })
          
          if (response.success) {
            console.log(`✅ Successfully triggered next node ${nextNode.data.label} on agent ${response.agentName}`)
          } else {
            console.error(`❌ Failed to trigger next node ${nextNode.data.label}`)
          }
        } catch (error) {
          console.error(`❌ Error executing next node ${nextNode.data.label}:`, error)
        }
      }

    } catch (error) {
      console.error(`❌ Error triggering next nodes for job ${job.jobId}:`, error)
    }
  }

  // Execute parallel branches orchestrator
  async executeParallelBranches(parentJobId, orchestratorCommand, parentJob) {
    console.log(`🔀 Executing parallel branches orchestrator for job ${parentJobId}`)

    try {
      // Execute the orchestrator
      const result = await executeParallelBranches(orchestratorCommand, parentJob)

      console.log(`${result.success ? '✅' : '⚠️'} Parallel branches orchestrator completed: ${result.message}`)

      // Update parent job with aggregated results
      await jobManager.updateJob(parentJobId, {
        parallelBranchesResult: result
      })

      // Handle failure if necessary
      if (!result.success && orchestratorCommand.failFast) {
        console.error(`❌ Parallel branches failed with fail-fast enabled - marking parent job as failed`)
        await jobManager.updateJob(parentJobId, {
          status: 'failed',
          error: result.message,
          failedAt: new Date().toISOString()
        })

        // Update build status if applicable
        if (parentJob.buildNumber) {
          try {
            const buildStatsManager = await getBuildStatsManager()
            await buildStatsManager.finishBuild(parentJob.projectId, parentJob.buildNumber, {
              status: 'failure',
              message: result.message,
              nodesExecuted: parentJob.currentCommandIndex + 1
            })
          } catch (buildError) {
            console.warn('Failed to update build record:', buildError)
          }
        }
        return
      }

      // Continue with next sequential command (if any) or trigger next nodes
      await this.continueSequentialExecution(parentJobId)

    } catch (error) {
      console.error(`❌ Error in parallel branches orchestrator:`, error)
      await jobManager.updateJob(parentJobId, {
        status: 'failed',
        error: `Parallel branches orchestrator error: ${error.message}`,
        failedAt: new Date().toISOString()
      })

      // Update build status if applicable
      if (parentJob.buildNumber) {
        try {
          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(parentJob.projectId, parentJob.buildNumber, {
            status: 'failure',
            message: `Orchestrator error: ${error.message}`,
            nodesExecuted: parentJob.currentCommandIndex + 1
          })
        } catch (buildError) {
          console.warn('Failed to update build record:', buildError)
        }
      }
    }
  }

  // Execute parallel matrix orchestrator
  async executeParallelMatrix(parentJobId, orchestratorCommand, parentJob) {
    console.log(`🔀 Executing parallel matrix orchestrator for job ${parentJobId}`)

    try {
      // Execute the orchestrator
      const result = await executeParallelMatrix(orchestratorCommand, parentJob)

      console.log(`${result.success ? '✅' : '⚠️'} Parallel matrix orchestrator completed: ${result.message}`)

      // Update parent job with aggregated results
      await jobManager.updateJob(parentJobId, {
        parallelMatrixResult: result
      })

      // Handle failure if necessary
      if (!result.success && orchestratorCommand.failFast) {
        console.error(`❌ Parallel matrix failed with fail-fast enabled - marking parent job as failed`)
        await jobManager.updateJob(parentJobId, {
          status: 'failed',
          error: result.message,
          failedAt: new Date().toISOString()
        })

        // Update build status if applicable
        if (parentJob.buildNumber) {
          try {
            const buildStatsManager = await getBuildStatsManager()
            await buildStatsManager.finishBuild(parentJob.projectId, parentJob.buildNumber, {
              status: 'failure',
              message: result.message,
              nodesExecuted: parentJob.currentCommandIndex + 1
            })
          } catch (buildError) {
            console.warn('Failed to update build record:', buildError)
          }
        }
        return
      }

      // Continue with next sequential command (if any) or trigger next nodes
      await this.continueSequentialExecution(parentJobId)

    } catch (error) {
      console.error(`❌ Error in parallel matrix orchestrator:`, error)
      await jobManager.updateJob(parentJobId, {
        status: 'failed',
        error: `Parallel matrix orchestrator error: ${error.message}`,
        failedAt: new Date().toISOString()
      })

      // Update build status if applicable
      if (parentJob.buildNumber) {
        try {
          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(parentJob.projectId, parentJob.buildNumber, {
            status: 'failure',
            message: `Orchestrator error: ${error.message}`,
            nodesExecuted: parentJob.currentCommandIndex + 1
          })
        } catch (buildError) {
          console.warn('Failed to update build record:', buildError)
        }
      }
    }
  }

  // Wait for job completion (event-based, not polling)
  async waitForJobCompletion(jobId) {
    return new Promise((resolve) => {
      // Register callback that will be invoked when job completes
      this.jobCompletionCallbacks.set(jobId, (result) => {
        resolve(result)
      })

      // Set a timeout fallback (60 minutes) in case callback is never called
      setTimeout(async () => {
        if (this.jobCompletionCallbacks.has(jobId)) {
          this.jobCompletionCallbacks.delete(jobId)

          // Check job status as fallback
          const job = await jobManager.getJob(jobId)
          if (job) {
            resolve({
              jobId: jobId,
              success: job.status === 'completed',
              error: job.error || 'Job completion timeout',
              exitCode: job.exitCode
            })
          } else {
            resolve({
              jobId: jobId,
              success: false,
              error: 'Job not found or timed out'
            })
          }
        }
      }, 3600000) // 60 minutes timeout
    })
  }

  // Notify job completion (called by handleJobComplete and handleJobError)
  notifyJobCompletion(jobId, result) {
    const callback = this.jobCompletionCallbacks.get(jobId)
    if (callback) {
      console.log(`🔔 Notifying job completion for ${jobId}:`, result.success ? 'SUCCESS' : 'FAILED')
      callback(result)
      this.jobCompletionCallbacks.delete(jobId)
    }
  }

  // Continue sequential execution after parallel orchestration
  async continueSequentialExecution(parentJobId) {
    const parentJobUpdated = await jobManager.getJob(parentJobId)
    const nextIndex = parentJobUpdated.currentCommandIndex + 1

    console.log(`🔄 Continuing sequential execution: command ${nextIndex + 1}/${parentJobUpdated.executionCommands.length}`)

    if (nextIndex < parentJobUpdated.executionCommands.length) {
      // Update command index
      await jobManager.updateJob(parentJobId, {
        currentCommandIndex: nextIndex
      })

      const nextCommand = parentJobUpdated.executionCommands[nextIndex]

      // Check if the next command is also an orchestrator
      if (nextCommand.type === 'parallel_branches_orchestrator') {
        console.log(`🔀 Next command is parallel branches orchestrator`)
        await this.executeParallelBranches(parentJobId, nextCommand, parentJobUpdated)
        return
      }

      if (nextCommand.type === 'parallel_matrix_orchestrator') {
        console.log(`🔀 Next command is parallel matrix orchestrator`)
        await this.executeParallelMatrix(parentJobId, nextCommand, parentJobUpdated)
        return
      }

      // Regular sequential command - find agent and dispatch
      const nextRequiresSpecificAgent = nextCommand.requiredAgentId && nextCommand.requiredAgentId !== 'any'
      const nextAgentRequirements = nextRequiresSpecificAgent ? { agentId: nextCommand.requiredAgentId } : {}
      const nextAgent = await this.findAvailableAgent(nextAgentRequirements)

      if (!nextAgent) {
        const errorMsg = nextRequiresSpecificAgent
          ? `🚨 CRITICAL: Required agent "${nextCommand.requiredAgentId}" not available for command: ${nextCommand.nodeLabel}`
          : 'No agents available for next command'

        console.error(`❌ ${errorMsg}`)
        await jobManager.updateJob(parentJobId, {
          status: 'failed',
          error: errorMsg,
          failedAt: new Date().toISOString()
        })
        return
      }

      await jobManager.updateJob(parentJobId, {
        agentId: nextAgent.agentId,
        agentName: nextAgent.name || nextAgent.hostname,
        status: 'running'
      })

      const dispatchSuccess = await this.dispatchJobToAgent(nextAgent.agentId, {
        jobId: parentJobId,
        projectId: parentJobUpdated.projectId,
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
        totalCommands: parentJobUpdated.executionCommands.length
      })

      if (!dispatchSuccess) {
        console.error(`❌ Failed to dispatch next command for job ${parentJobId}`)
        await jobManager.updateJob(parentJobId, {
          status: 'failed',
          error: 'Failed to dispatch next command in sequence',
          failedAt: new Date().toISOString()
        })
      }
    } else {
      // No more commands - mark parent job as complete and trigger next nodes
      console.log(`🎉 All commands (including parallel orchestration) completed for job ${parentJobId}`)
      await jobManager.updateJob(parentJobId, {
        status: 'completed',
        completedAt: new Date().toISOString()
      })

      // Trigger next nodes based on success
      await this.triggerNextNodes(parentJobUpdated, { success: true, exitCode: 0 })

      // Update build status if this job is associated with a build
      if (parentJobUpdated.buildNumber) {
        try {
          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(parentJobUpdated.projectId, parentJobUpdated.buildNumber, {
            status: 'success',
            message: 'Job completed successfully with parallel execution',
            nodesExecuted: parentJobUpdated.executionCommands.length
          })
          console.log(`📊 BUILD STATS: Build #${parentJobUpdated.buildNumber} for project "${parentJobUpdated.projectName}" marked as successful`)
        } catch (buildError) {
          console.warn('Failed to update build record on job completion:', buildError)
        }
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