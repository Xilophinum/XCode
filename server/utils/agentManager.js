import { getDataService } from './dataService.js'
import { jobManager } from './jobManager.js'
import { getBuildStatsManager } from './buildStatsManager.js'
import { executionStateManager } from './executionStateManager.js'
import { getExecutionConnectedNodes } from '../api/projects/execute.post.js'
import { executeParallelBranches } from './orchestrators/parallelBranchesOrchestrator.js'
import { executeParallelMatrix } from './orchestrators/parallelMatrixOrchestrator.js'
import { notificationService } from './notificationService.js'
import { getJobQueueManager } from './jobQueueManager.js'
import logger, { getBuildLogger } from './logger.js'

class AgentManager {
  constructor() {
    this.io = null
    this.connectedAgents = new Map() // agentId -> socket
    this.agentData = new Map() // agentId -> agent info
    this.dataService = null
    this.heartbeatIntervals = new Map() // agentId -> interval
    this.jobCompletionCallbacks = new Map() // jobId -> callback function
    this.jobQueueManager = null // Lazy loaded
  }

  /**
   * Get the appropriate logger for a job (build logger if available, otherwise main logger)
   * @param {Object} job - Job object with projectId and buildNumber
   * @returns {Object} - Winston logger instance
   */
  getJobLogger(job) {
    if (job && job.projectId && job.buildNumber) {
      return getBuildLogger(job.projectId, job.buildNumber)
    }
    return logger
  }

  /**
   * Get all environment variables from system settings as a key-value object
   * @returns {Promise<Object>} - Environment variables object
   */
  async getEnvironmentVariables() {
    if (!this.dataService) {
      this.dataService = await getDataService()
    }

    const envVars = await this.dataService.getEnvVariables()
    logger.debug(`Fetched ${envVars.length} environment variables from database`)

    const envObject = {}

    for (const envVar of envVars) {
      envObject[envVar.key] = envVar.value
    }

    // Log keys only (not values) to avoid exposing secrets in logs
    const secretCount = envVars.filter(v => v.isSecret === 'true').length
    logger.debug(`Environment variable keys: ${Object.keys(envObject).join(', ')} (${secretCount} marked as secret)`)
    return envObject
  }

  async initialize(server = null) {
    this.dataService = await getDataService()
    logger.info('AgentManager initialized (Socket.IO handled by plugin)')

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
    }
  }

  // Handle job failure (called on every failure, including during retries)
  async handleJobFailure(agentId, data) {
    const { jobId, error, exitCode, output, currentAttempt, maxAttempts, isRetrying } = data

    if (jobId) {
      const job = await jobManager.getJob(jobId)

      if (job) {
        // Get the failed node label if available
        let failedNodeLabel = null
        if (job.executionCommands && job.currentCommandIndex !== undefined) {
          const currentCommand = job.executionCommands[job.currentCommandIndex]
          if (currentCommand) {
            failedNodeLabel = currentCommand.nodeLabel
          }
        }

        // Only trigger failure handlers if retries are configured (maxAttempts > 1)
        // For non-retry scenarios (maxAttempts = 1), handleJobError will trigger handlers instead
        if (maxAttempts > 1) {
          logger.info(`Triggering failure handlers for failure (attempt ${currentAttempt}/${maxAttempts})`)
          await this.triggerNextNodes(job, {
            success: false,
            exitCode: exitCode || 1,
            error: error,
            output: output,
            failedNodeLabel: failedNodeLabel,
            currentAttempt: currentAttempt,
            maxAttempts: maxAttempts,
            isRetrying: isRetrying
          })
        } else {
          logger.info(`Skipping failure handlers in handleJobFailure - will be triggered by handleJobError for non-retry scenario`)
        }
      }
    }
  }

  // Handle job completion from agent
  async handleJobComplete(agentId, data) {
    const { jobId, exitCode, output } = data
    
    if (jobId) {
      // Get current job state
      const job = await jobManager.getJob(jobId)
      
      if (!job) {
        logger.error(`Job ${jobId} not found during completion handling`)
        return
      }

      // Mark the current node as completed
      // For parent jobs: use executionCommands[currentCommandIndex]
      // For sub-jobs: use currentNodeId directly
      let nodeIdToMark = null
      let nodeLabel = null
      
      if (job.executionCommands && job.currentCommandIndex !== undefined) {
        const currentCommand = job.executionCommands[job.currentCommandIndex]
        if (currentCommand?.nodeId) {
          nodeIdToMark = currentCommand.nodeId
          nodeLabel = currentCommand.nodeLabel
        }
      } else if (job.currentNodeId) {
        // Sub-job: use currentNodeId directly
        nodeIdToMark = job.currentNodeId
        nodeLabel = job.currentNodeLabel
      }

      if (nodeIdToMark && job.buildNumber && job.projectId) {
        if (exitCode === 0 || exitCode === undefined) {
          executionStateManager.markNodeCompleted(
            job.projectId,
            job.buildNumber,
            nodeIdToMark
          )
        } else {
          executionStateManager.markNodeFailed(
            job.projectId,
            job.buildNumber,
            nodeIdToMark
          )
        }
      }

      // Check if this is a sequential execution job with more commands
      if (job.executionCommands && job.currentCommandIndex !== undefined) {
        const currentIndex = job.currentCommandIndex
        const totalCommands = job.executionCommands.length
        
        logger.info(`Command ${currentIndex + 1}/${totalCommands} completed for job ${jobId}`)

        // Check if there are more commands to execute
        if (currentIndex + 1 < totalCommands) {
          const nextIndex = currentIndex + 1
          const nextCommand = job.executionCommands[nextIndex]

          logger.info(`Starting next command ${nextIndex + 1}/${totalCommands}: ${nextCommand.nodeLabel}`)

          // Check if the next command is a parallel orchestrator
          if (nextCommand.type === 'parallel_branches_orchestrator') {
            logger.info(`Executing parallel branches orchestrator`)
            await this.executeParallelBranches(jobId, nextCommand, job)
            return // Don't continue with normal sequential flow
          }

          if (nextCommand.type === 'parallel_matrix_orchestrator') {
            logger.info(`Executing parallel matrix orchestrator`)
            await this.executeParallelMatrix(jobId, nextCommand, job)
            return // Don't continue with normal sequential flow
          }

          // Check if the next command is a notification
          if (nextCommand.type === 'notification') {
            logger.info(`Processing notification: ${nextCommand.nodeLabel}`)

            try {
              // Get the failed node label if this is a failure notification
              let failedNodeLabel = null
              if (exitCode !== 0 && job.executionCommands && job.currentCommandIndex !== undefined) {
                const failedCommand = job.executionCommands[job.currentCommandIndex]
                if (failedCommand) {
                  failedNodeLabel = failedCommand.nodeLabel
                }
              }

              const context = {
                jobId: jobId,
                projectId: job.projectId,
                projectName: job.projectName,
                buildNumber: job.buildNumber,
                exitCode: exitCode || 0,
                output: output,
                failedNodeLabel: failedNodeLabel,
                currentAttempt: executionResult?.currentAttempt,
                maxAttempts: executionResult?.maxAttempts,
                isRetrying: executionResult?.isRetrying
              }

              const result = await notificationService.sendNotification(nextCommand, context)

              if (result.success) {
                logger.info(`Notification sent successfully for: ${nextCommand.nodeLabel}`)
              } else {
                logger.error(`Notification failed for: ${nextCommand.nodeLabel}`, result.error)
              }
            } catch (notificationError) {
              logger.error(`Notification error for: ${nextCommand.nodeLabel}`, notificationError)
            }

            // Update job to move to next command after notification
            await jobManager.updateJob(jobId, {
              currentCommandIndex: nextIndex
            })

            // Continue processing - trigger job complete again to move to next command
            await this.handleJobComplete(agentId, { jobId, exitCode, output })
            return
          }

          // Find agent for the next command
          // Handle "any" as explicit choice for any available agent
          const nextRequiresSpecificAgent = nextCommand.requiredAgentId && nextCommand.requiredAgentId !== 'any'
          const nextAgentRequirements = nextRequiresSpecificAgent ? { agentId: nextCommand.requiredAgentId } : {}
          
          // For sequential execution, allow some time for the agent to become available again
          let nextAgent = await this.findAvailableAgent(nextAgentRequirements)
          
          // If agent not found, wait briefly and retry (agent might be finishing previous command)
          if (!nextAgent) {
            logger.info(`Agent not immediately available, waiting 2 seconds for sequential execution...`)
            await new Promise(resolve => setTimeout(resolve, 2000))
            nextAgent = await this.findAvailableAgent(nextAgentRequirements)
          }
          
          if (!nextAgent) {
            const errorMsg = nextRequiresSpecificAgent
              ? `CRITICAL: Required agent "${nextCommand.requiredAgentId}" not available for command: ${nextCommand.nodeLabel}. Sequential execution STOPPED to prevent running on wrong environment.`
              : 'No agents available for next command'

            logger.error(errorMsg)
            await jobManager.updateJob(jobId, {
              status: 'failed',
              error: errorMsg,
              failedAt: new Date().toISOString()
            })

            // Update build status if this job is associated with a build
            if (job.buildNumber) {
              try {
                // Add error completion message to in-memory logs BEFORE finishing build
                await jobManager.addJobOutput(jobId, {
                  type: 'log',
                  level: 'error',
                  message: `Job failed: ${errorMsg}`,
                  source: 'System',
                  timestamp: new Date().toISOString(),
                  nanotime: (Date.now() * 1000000).toString()
                })

                const buildStatsManager = await getBuildStatsManager()
                await buildStatsManager.finishBuild(job.projectId, job.buildNumber, {
                  status: 'failure',
                  message: errorMsg,
                  nodesExecuted: currentIndex + 1
                })
                logger.info(`BUILD STATS: Build #${job.buildNumber} for project "${job.projectName}" marked as failed (no agent available)`)
              } catch (buildError) {
                logger.warn('Failed to update build record on agent unavailable:', buildError)
              }
            }
            return
          }
          
          if (nextRequiresSpecificAgent) {
            logger.info(`ENFORCING agent selection: ${nextAgent.agentId} for command: ${nextCommand.nodeLabel}`)
          } else {
            logger.info(`Selected agent ${nextAgent.agentId} for next command: ${nextCommand.nodeLabel} (user chose "any available")`)
          }
          
          // Update job with next command index and agent
          await jobManager.updateJob(jobId, { 
            currentCommandIndex: nextIndex,
            agentId: nextAgent.agentId,
            agentName: nextAgent.name || nextAgent.hostname,
            status: 'running'
          })
          
          // Get environment variables from system settings
          const environment = await this.getEnvironmentVariables()
          logger.debug(`Passing ${Object.keys(environment).length} environment variables to agent for job ${jobId}`)

          // Update job with current node info before dispatching
          await jobManager.updateJob(jobId, {
            currentNodeId: nextCommand.nodeId,
            currentNodeLabel: nextCommand.nodeLabel,
            currentCommandIndex: nextIndex
          })

          // Dispatch next command to the appropriate agent (with queue support)
          const dispatchResult = await this.dispatchJobWithQueue(nextAgent.agentId, {
            jobId,
            projectId: job.projectId,
            projectName: job.projectName,
            buildNumber: job.buildNumber,
            commands: nextCommand.script,
            environment,
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

          if (!dispatchResult.dispatched && !dispatchResult.queued) {
            logger.error(`Failed to dispatch or queue next command for job ${jobId}`)
            await jobManager.updateJob(jobId, {
              status: 'failed',
              error: dispatchResult.error || 'Failed to dispatch or queue next command in sequence',
              failedAt: new Date().toISOString()
            })
          } else if (dispatchResult.queued) {
            logger.info(`Next command for job ${jobId} queued at position ${dispatchResult.queuePosition}`)
            await jobManager.updateJob(jobId, {
              status: 'queued'
            })

            // Update build status if this job is associated with a build
            if (job.buildNumber) {
              try {
                // Add error completion message to in-memory logs BEFORE finishing build
                await jobManager.addJobOutput(jobId, {
                  type: 'log',
                  level: 'error',
                  message: 'Job failed: Failed to dispatch next command in sequence',
                  source: 'System',
                  timestamp: new Date().toISOString(),
                  nanotime: (Date.now() * 1000000).toString()
                })

                const buildStatsManager = await getBuildStatsManager()
                await buildStatsManager.finishBuild(job.projectId, job.buildNumber, {
                  status: 'failure',
                  message: 'Failed to dispatch next command in sequence',
                  nodesExecuted: nextIndex
                })
                logger.info(`BUILD STATS: Build #${job.buildNumber} for project "${job.projectName}" marked as failed (dispatch failed)`)
              } catch (buildError) {
                logger.warn('Failed to update build record on dispatch failure:', buildError)
              }
            }
          }
          
          return // Don't mark job as completed yet
        }
      }
      
      // No more commands or not a sequential job - mark as completed
      logger.info(`All commands completed for job ${jobId}`)
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

      // Add completion message for this job (always, regardless of whether build continues)
      // Use the node label as the source so it shows which node completed
      if (job.buildNumber && job.currentNodeLabel) {
        await jobManager.addJobOutput(jobId, {
          type: 'log',
          level: 'success',
          message: `Job completed: Job completed successfully (exit code: ${exitCode || 0})`,
          source: job.currentNodeLabel,
          timestamp: new Date().toISOString(),
          nanotime: (Date.now() * 1000000).toString()
        })
      }

      // Trigger next nodes for single-command jobs (external sequential execution)
      // Do NOT trigger for multi-command jobs (internal sequential execution)
      // Do NOT trigger for sub-jobs (they are managed by their parent orchestrator)
      let hasNextNodes = false

      if (job.parentJobId) {
        logger.info(`Sub-job completed - not triggering next nodes (managed by parent orchestrator)`)
        hasNextNodes = false
      } else if (job.executionCommands && job.executionCommands.length > 1) {
        logger.info(`Multi-command sequential job completed - not triggering next nodes (handled internally)`)
        hasNextNodes = false
      } else {
        // Single command job - trigger next nodes
        hasNextNodes = await this.triggerNextNodes(job, { success: true, exitCode: exitCode || 0, output: output })
      }

      // Only mark build as complete if there are no more nodes to execute
      // Don't finish the build as "success" if this was a failure handler node
      // Don't finish the build if this is a sub-job (managed by parent orchestrator)
      if (job.buildNumber && !hasNextNodes && !job.triggeredByFailure && !job.parentJobId) {
        try {
          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(job.projectId, job.buildNumber, {
            status: 'success',
            message: `Job completed successfully (exit code: ${exitCode || 0})`,
            nodesExecuted: job.executionCommands ? job.executionCommands.length : 1
          })
          logger.info(`BUILD STATS: Build #${job.buildNumber} for project "${job.projectName}" marked as successful`)
        } catch (buildError) {
          logger.warn('Failed to update build record on job completion:', buildError)
        }
      } else if (hasNextNodes) {
        logger.info(`Build #${job.buildNumber} continues - next nodes triggered, not finishing build yet`)
      } else if (job.triggeredByFailure) {
        logger.info(`Failure handler node completed successfully - build remains in failed state`)
      }
    }
  }

  // Handle job error from agent
  async handleJobError(agentId, data) {
    const { jobId, error, exitCode, isRetrying } = data
    
    if (jobId) {
      // Get current job state to provide better error context
      const job = await jobManager.getJob(jobId)
      
      let errorMessage = error
      if (job && job.executionCommands && job.currentCommandIndex !== undefined) {
        const currentIndex = job.currentCommandIndex
        const totalCommands = job.executionCommands.length
        const currentCommand = job.executionCommands[currentIndex]
        
        errorMessage = `Command ${currentIndex + 1}/${totalCommands} failed (${currentCommand.nodeLabel}): ${error}`
        logger.error(`Sequential execution failed at command ${currentIndex + 1}/${totalCommands}: ${currentCommand.nodeLabel}`)
      }
      
      // Only mark job as permanently failed if this is NOT a retry attempt
      if (!isRetrying) {
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

        // Trigger failure handlers only for final failure (not during retries)
        // Retries are handled by handleJobFailure which triggers handlers immediately
        // Do NOT trigger for sub-jobs (managed by parent orchestrator)
        if (job && !job.parentJobId) {
          // Get the failed node label if available
          let failedNodeLabel = null
          if (job.executionCommands && job.currentCommandIndex !== undefined) {
            const currentCommand = job.executionCommands[job.currentCommandIndex]
            if (currentCommand) {
              failedNodeLabel = currentCommand.nodeLabel
            }
          }

          logger.info(`Triggering failure handlers for final failure`)
          await this.triggerNextNodes(job, {
            success: false,
            exitCode: exitCode || 1,
            error: errorMessage,
            output: data.output,
            failedNodeLabel: failedNodeLabel,
            currentAttempt: data.currentAttempt,
            maxAttempts: data.maxAttempts,
            isRetrying: false
          })
        } else if (job && job.parentJobId) {
          logger.info(`Sub-job failed - not triggering failure handlers (managed by parent orchestrator)`)
        }

        // Mark build as failed IMMEDIATELY when a node fails
        // This ensures the build status is "failure" even if there are failure handler nodes
        // Do NOT finish the build if this is a sub-job (managed by parent orchestrator)
        if (job && job.buildNumber && !job.parentJobId) {
          try {
            // Add error completion message to in-memory logs BEFORE finishing build
            await jobManager.addJobOutput(jobId, {
              type: 'log',
              level: 'error',
              message: `Job failed: ${errorMessage}`,
              source: 'System',
              timestamp: new Date().toISOString(),
              nanotime: (Date.now() * 1000000).toString()
            })

            const buildStatsManager = await getBuildStatsManager()
            await buildStatsManager.finishBuild(job.projectId, job.buildNumber, {
              status: 'failure',
              message: errorMessage,
              nodesExecuted: job.executionCommands ? (job.currentCommandIndex || 0) + 1 : 0
            })
            logger.info(`BUILD STATS: Build #${job.buildNumber} for project "${job.projectName}" marked as failed`)
          } catch (buildError) {
            logger.warn('Failed to update build record on job error:', buildError)
          }
        }
      } else {
        logger.info(`Job ${jobId} failed but will retry - failure handlers already triggered by handleJobFailure`)
      }
    }
  }

  // Dispatch job to specific agent (low-level method - use dispatchJobWithQueue instead)
  async dispatchJobToAgent(agentId, jobData) {
    const socket = this.connectedAgents.get(agentId)

    if (!socket || !socket.connected) {
      logger.error(`Agent ${agentId} is not connected`)
      return false
    }

    try {
      logger.info(`Dispatching job to agent ${agentId}:\nJob ID: ${jobData.jobId}\nProject ID: ${jobData.projectId}\nCommand(s): ${jobData.commands}`)

      // Send job to agent using Socket.IO
      socket.emit('message', {
        type: 'execute_job',
        ...jobData
      })

      logger.info(`Job ${jobData.jobId} dispatched to agent ${agentId}`)
      return true
    } catch (error) {
      logger.error(`Failed to dispatch job to agent ${agentId}:`, error)
      return false
    }
  }

  /**
   * Dispatch job with queue support - enqueues if agent at capacity
   * This is the primary method that should be used for job dispatch
   * @param {string} agentId - Agent ID
   * @param {object} jobData - Job data
   * @param {string} priority - 'high' or 'normal' (default: 'normal')
   * @returns {Promise<object>} { dispatched: boolean, queued: boolean, queuePosition?: number }
   */
  async dispatchJobWithQueue(agentId, jobData, priority = 'normal') {
    // Lazy load job queue manager
    if (!this.jobQueueManager) {
      this.jobQueueManager = getJobQueueManager()
    }

    const agentInfo = this.agentData.get(agentId)

    if (!agentInfo) {
      logger.error(`Agent ${agentId} not found in agentData`)
      return { dispatched: false, queued: false, error: 'Agent not found' }
    }

    const currentJobs = agentInfo.currentJobs || 0
    const maxJobs = agentInfo.maxConcurrentJobs || 1

    logger.info(`Agent ${agentId} capacity: ${currentJobs}/${maxJobs}`)

    // Check if agent has capacity
    if (currentJobs < maxJobs) {
      // Agent has capacity - dispatch immediately
      logger.info(`✅ Agent ${agentId} has capacity - dispatching immediately`)
      const success = await this.dispatchJobToAgent(agentId, jobData)

      if (success) {
        // Broadcast queue status update (queue is empty since we dispatched)
        this.broadcastQueueStatus(agentId)
      }

      return { dispatched: success, queued: false }
    } else {
      // Agent at capacity - enqueue the job
      logger.warn(`⏸️  Agent ${agentId} at capacity (${currentJobs}/${maxJobs}) - enqueuing job`)

      const queuePosition = this.jobQueueManager.enqueueJob(agentId, jobData, priority)

      // Broadcast queue status update
      this.broadcastQueueStatus(agentId)

      return {
        dispatched: false,
        queued: true,
        queuePosition: queuePosition,
        queueLength: this.jobQueueManager.getQueueLength(agentId)
      }
    }
  }

  /**
   * Process queue for an agent - dequeue and dispatch next job if capacity available
   * Called automatically when a job completes
   * @param {string} agentId - Agent ID
   */
  async processAgentQueue(agentId) {
    if (!this.jobQueueManager) {
      this.jobQueueManager = getJobQueueManager()
    }

    const agentInfo = this.agentData.get(agentId)

    if (!agentInfo) {
      logger.warn(`Cannot process queue for agent ${agentId} - agent not found`)
      return
    }

    const currentJobs = agentInfo.currentJobs || 0
    const maxJobs = agentInfo.maxConcurrentJobs || 1
    const queueLength = this.jobQueueManager.getQueueLength(agentId)

    logger.debug(`Processing queue for agent ${agentId}: ${currentJobs}/${maxJobs} jobs, ${queueLength} queued`)

    // Keep dispatching jobs while agent has capacity and queue is not empty
    while (currentJobs < maxJobs && queueLength > 0) {
      const nextJob = this.jobQueueManager.dequeueNextJob(agentId)

      if (!nextJob) {
        // Queue is empty
        break
      }

      logger.info(`🚀 Dispatching queued job ${nextJob.jobId} to agent ${agentId}`)

      const success = await this.dispatchJobToAgent(agentId, nextJob)

      if (!success) {
        logger.error(`Failed to dispatch queued job ${nextJob.jobId} - re-enqueueing`)
        // Re-enqueue at front with high priority
        this.jobQueueManager.enqueueJob(agentId, nextJob, 'high')
        break
      }

      // Update currentJobs count (will be updated by heartbeat, but update immediately for accurate queue processing)
      agentInfo.currentJobs = (agentInfo.currentJobs || 0) + 1

      // Broadcast queue status after each dispatch
      this.broadcastQueueStatus(agentId)
    }

    // Final broadcast after queue processing
    this.broadcastQueueStatus(agentId)
  }

  /**
   * Broadcast queue status for an agent to all connected clients
   * @param {string} agentId - Agent ID
   */
  broadcastQueueStatus(agentId) {
    if (!this.jobQueueManager || !this.io) {
      return
    }

    const queuedJobs = this.jobQueueManager.getQueuedJobs(agentId)
    const queueLength = queuedJobs.length

    this.io.emit('message', {
      type: 'agent_queue_update',
      agentId: agentId,
      queueLength: queueLength,
      queuedJobs: queuedJobs,
      timestamp: new Date().toISOString()
    })

    logger.debug(`Broadcasted queue status for agent ${agentId}: ${queueLength} jobs queued`)
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

    logger.info(`Job ${jobId} cancellation sent to agent ${agentId}`)
    return true
  }

  // Cancel job (wrapper method for API compatibility)
  cancelJob(agentId, jobData) {
    try {
      return this.cancelJobOnAgent(agentId, jobData.jobId)
    } catch (error) {
      logger.error(`Failed to cancel job ${jobData.jobId} on agent ${agentId}:`, error)
      return false
    }
  }

  // Find available agent for job execution
  async findAvailableAgent(requirements = {}) {
    // If a specific agent is requested, ONLY return that agent - no fallbacks!
    if (requirements.agentId) {
      // Handle "local" as a special case - find the local agent
      if (requirements.agentId === 'local') {
        logger.info(`Looking for local agent...`)

        // Find the local agent by name
        for (const [agentId, agentInfo] of this.agentData) {
          if (agentInfo.name === 'Local Agent' && agentInfo.status === 'online') {
            const socket = this.connectedAgents.get(agentId)
            if (socket && socket.connected) {
              logger.info(`Found local agent: ${agentId}`)
              return agentInfo
            }
          }
        }

        logger.error(`Local agent not available - BLOCKING execution`)
        return null
      }
      
      const socket = this.connectedAgents.get(requirements.agentId)
      const agentInfo = this.agentData.get(requirements.agentId)

      if (socket && socket.connected && agentInfo) {
        // Accept agents that are online, idle, ready, or busy (busy agents can queue work)
        if (['online', 'idle', 'ready', 'busy'].includes(agentInfo.status)) {
          logger.info(`Found requested agent: ${requirements.agentId} (status: ${agentInfo.status})`)
          return agentInfo
        }
      }
      logger.error(`REQUIRED agent ${requirements.agentId} not available - status: ${agentInfo?.status || 'no data'}, connected: ${socket?.connected || false}`)
      return null
    }

    // Only when NO specific agent is requested, find any available agent
    logger.info(`No specific agent required - finding any available agent`)
    for (const [agentId, socket] of this.connectedAgents) {
      logger.debug(`Checking agent ${agentId}: connected=${socket?.connected}`)
      
      
      if (socket && socket.connected) { // Socket.IO connected state
        // Get agent data and return it
        const agentInfo = this.agentData.get(agentId)
        if (agentInfo && ['online', 'idle', 'ready', 'busy'].includes(agentInfo.status)) {
          logger.info(`Found available agent: ${agentId} (status: ${agentInfo.status})`)
          return agentInfo
        } else {
          logger.debug(`Agent ${agentId} not available - status: ${agentInfo?.status || 'no data'}`)
        }
      } else {
        logger.debug(`Agent ${agentId} not connected`)
      }
    }

    logger.error(`No available agents found`)
    return null
  }

  // Get connected agents
  getConnectedAgents() {
    return Array.from(this.connectedAgents.keys())
  }

  getAllAgents() {
    return Array.from(this.agentData.values())
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
  // Returns true if nodes were triggered, false otherwise
  async triggerNextNodes(job, executionResult) {
    if (!job.nodes || !job.edges) {
      logger.warn(`No graph data available for job ${job.jobId} to trigger next nodes`)
      return false
    }

    try {
      // Parse nodes and edges if they are JSON strings
      const nodes = typeof job.nodes === 'string' ? JSON.parse(job.nodes) : job.nodes
      const edges = typeof job.edges === 'string' ? JSON.parse(job.edges) : job.edges

      // Find the last executed node based on job execution commands
      let currentNode = null
      if (job.executionCommands && job.currentCommandIndex !== undefined) {
        const lastCommand = job.executionCommands[job.currentCommandIndex]
        if (lastCommand) {
          currentNode = nodes.find(node => node.id === lastCommand.nodeId)
        }
      } else {
        logger.warn(`🔗 No execution commands or currentCommandIndex in job`)
      }

      // Fallback: find any execution node if we can't determine the current one
      if (!currentNode) {
        currentNode = nodes.find(node =>
          ['api-request', 'bash', 'powershell', 'cmd', 'python', 'node', 'parallel_branches', 'parallel_matrix'].includes(node.data?.nodeType)
        )
        logger.warn(`🔗 Using fallback current node: ${currentNode?.data?.label || 'NOT FOUND'}`)
      }

      if (!currentNode) {
        logger.error(`🔗 Could not find current execution node for job ${job.jobId}`)
        return false
      }

      // Get next nodes based on execution result
      const nextNodes = getExecutionConnectedNodes(currentNode.id, nodes, edges, new Map(), executionResult)

      if (nextNodes.length === 0) {
        logger.debug(`🔗 No next nodes to execute for job ${job.jobId} - execution chain complete`)
        return false
      }


      // Execute next nodes by creating new jobs or sending notifications directly
      let successCount = 0
      let errorCount = 0
      
      for (const nextNode of nextNodes) {
        logger.debug(`🔗 Executing next node: ${nextNode.data.label}`)

        try {
          // Create parameter values map including execution outputs
          const parameterValues = new Map()

          // Add execution output if available
          if (executionResult && executionResult.output) {
            logger.info(`[DEBUG] Execution result output available:`, typeof executionResult.output === 'object' ? JSON.stringify(executionResult.output).substring(0, 200) : executionResult.output.substring(0, 200))

            // Find edges connecting current node's output to next node's input
            const outputConnection = edges.find(edge =>
              edge.source === currentNode.id &&
              edge.target === nextNode.id &&
              edge.sourceHandle === 'output'
            )

            if (outputConnection && outputConnection.targetHandle) {

              // Find the actual socket label from the target node's input sockets
              const targetSocket = nextNode.data.inputSockets?.find(s => s.id === outputConnection.targetHandle)
              const socketLabel = targetSocket?.label || outputConnection.targetHandle

              const executionOutputKey = `${nextNode.id}_${outputConnection.targetHandle}`
              logger.info(`[DEBUG] Storing execution output with key: ${executionOutputKey}, label: ${socketLabel}`)

              parameterValues.set(executionOutputKey, {
                label: socketLabel, // Use the actual socket label, not the socket ID
                value: executionResult.output,
                nodeType: 'execution-output'
              })
            } else {
              logger.warn(`[DEBUG] No output connection found from ${currentNode.id} to ${nextNode.id}`)
            }
          } else {
            logger.warn(`[DEBUG] No execution result output available`)
          }
          
          // Create execution data for the next node
          // Convert Map to plain object for JSON serialization
          const executionOutputsObj = Object.fromEntries(parameterValues)

          const executionData = {
            projectId: job.projectId,
            nodes: nodes, // Pass full graph so next nodes can be found
            edges: edges,
            startNodeId: nextNode.id, // Specify which node to start execution from
            startTime: new Date().toISOString(),
            trigger: 'node-completion',
            executionOutputs: executionOutputsObj, // Pass the execution outputs as plain object
            buildNumber: job.buildNumber, // Reuse existing build
            projectName: job.projectName, // Pass project name to avoid lookup
            triggeredByFailure: !executionResult.success, // Track if this was triggered by a failure
            failedNodeLabel: executionResult.failedNodeLabel || null, // Pass the failed node label for failure notifications
            currentAttempt: executionResult.currentAttempt,
            maxAttempts: executionResult.maxAttempts,
            isRetrying: executionResult.isRetrying
          }
          
          logger.debug(`🔗 Calling /api/projects/execute for node: ${nextNode.data.label}`)
          logger.debug(`🔗 Execution data:`, JSON.stringify(executionData, null, 2))
          
          // Execute the next node
          const response = await $fetch('/api/projects/execute', {
            method: 'POST',
            body: executionData
          })
          
          if (response.success) {
            logger.debug(`🔗 ✅ Successfully triggered next node ${nextNode.data.label} on agent ${response.agentName}`)
            successCount++
          } else {
            logger.error(`🔗 ❌ Failed to trigger next node ${nextNode.data.label}: ${response.error || 'Unknown error'}`)
            errorCount++
          }
        } catch (error) {
          logger.error(`🔗 ❌ Error executing next node ${nextNode.data.label}:`, error)
          errorCount++
        }
      }

      // Return true to indicate that nodes were triggered (even if some failed)
      return successCount > 0

    } catch (error) {
      logger.error(`🔗 ❌ Error triggering next nodes for job ${job?.jobId || 'undefined'}:`, error)
      return false
    }
  }

  // Execute parallel branches orchestrator
  async executeParallelBranches(parentJobId, orchestratorCommand, parentJob) {
    logger.info(`Executing parallel branches orchestrator for job ${parentJobId}`)

    try {
      // Mark the branches node as executing
      if (parentJob.buildNumber && parentJob.projectId && orchestratorCommand.nodeId) {
        executionStateManager.markNodeExecuting(
          parentJob.projectId,
          parentJob.buildNumber,
          orchestratorCommand.nodeId,
          orchestratorCommand.nodeLabel
        )
      }

      // Execute the orchestrator
      const result = await executeParallelBranches(orchestratorCommand, parentJob)

      logger.info(`Parallel branches orchestrator completed: ${result.message}`)

      // Mark the branches node as completed or failed based on result
      if (parentJob.buildNumber && parentJob.projectId && orchestratorCommand.nodeId) {
        if (result.success) {
          executionStateManager.markNodeCompleted(
            parentJob.projectId,
            parentJob.buildNumber,
            orchestratorCommand.nodeId
          )
        } else {
          executionStateManager.markNodeFailed(
            parentJob.projectId,
            parentJob.buildNumber,
            orchestratorCommand.nodeId
          )
        }
      }

      // Update parent job with aggregated results
      await jobManager.updateJob(parentJobId, {
        parallelBranchesResult: result
      })

      // Handle failure if necessary
      if (!result.success && orchestratorCommand.failFast) {
        logger.error(`Parallel branches failed with fail-fast enabled - marking parent job as failed`)
        await jobManager.updateJob(parentJobId, {
          status: 'failed',
          error: result.message,
          failedAt: new Date().toISOString()
        })

        // Update build status if applicable
        if (parentJob.buildNumber) {
          try {
            // Add error completion message to in-memory logs BEFORE finishing build
            await jobManager.addJobOutput(parentJobId, {
              type: 'log',
              level: 'error',
              message: `Job failed: ${result.message}`,
              source: 'System',
              timestamp: new Date().toISOString(),
              nanotime: (Date.now() * 1000000).toString()
            })

            const buildStatsManager = await getBuildStatsManager()
            await buildStatsManager.finishBuild(parentJob.projectId, parentJob.buildNumber, {
              status: 'failure',
              message: result.message,
              nodesExecuted: parentJob.currentCommandIndex + 1
            })
          } catch (buildError) {
            logger.warn('Failed to update build record:', buildError)
          }
        }
        return
      }

      // Continue with next sequential command (if any) or trigger next nodes
      await this.continueSequentialExecution(parentJobId)

    } catch (error) {
      logger.error(`Error in parallel branches orchestrator:`, error)
      await jobManager.updateJob(parentJobId, {
        status: 'failed',
        error: `Parallel branches orchestrator error: ${error.message}`,
        failedAt: new Date().toISOString()
      })

      // Update build status if applicable
      if (parentJob.buildNumber) {
        try {
          // Add error completion message to in-memory logs BEFORE finishing build
          await jobManager.addJobOutput(parentJobId, {
            type: 'log',
            level: 'error',
            message: `Job failed: Orchestrator error: ${error.message}`,
            source: 'System',
            timestamp: new Date().toISOString(),
            nanotime: (Date.now() * 1000000).toString()
          })

          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(parentJob.projectId, parentJob.buildNumber, {
            status: 'failure',
            message: `Orchestrator error: ${error.message}`,
            nodesExecuted: parentJob.currentCommandIndex + 1
          })
        } catch (buildError) {
          logger.warn('Failed to update build record:', buildError)
        }
      }
    }
  }

  // Execute parallel matrix orchestrator
  async executeParallelMatrix(parentJobId, orchestratorCommand, parentJob) {
    logger.info(`Executing parallel matrix orchestrator for job ${parentJobId}`)

    try {
      // Mark the matrix node as executing
      if (parentJob.buildNumber && parentJob.projectId && orchestratorCommand.nodeId) {
        executionStateManager.markNodeExecuting(
          parentJob.projectId,
          parentJob.buildNumber,
          orchestratorCommand.nodeId,
          orchestratorCommand.nodeLabel
        )
      }

      // Execute the orchestrator
      const result = await executeParallelMatrix(orchestratorCommand, parentJob)

      logger.info(`Parallel matrix orchestrator completed: ${result.message}`)

      // Mark the matrix node as completed or failed based on result
      if (parentJob.buildNumber && parentJob.projectId && orchestratorCommand.nodeId) {
        if (result.success) {
          executionStateManager.markNodeCompleted(
            parentJob.projectId,
            parentJob.buildNumber,
            orchestratorCommand.nodeId
          )
        } else {
          executionStateManager.markNodeFailed(
            parentJob.projectId,
            parentJob.buildNumber,
            orchestratorCommand.nodeId
          )
        }
      }

      // Update parent job with aggregated results
      await jobManager.updateJob(parentJobId, {
        parallelMatrixResult: result
      })

      // Handle failure if necessary
      if (!result.success && orchestratorCommand.failFast) {
        logger.error(`Parallel matrix failed with fail-fast enabled - marking parent job as failed`)
        await jobManager.updateJob(parentJobId, {
          status: 'failed',
          error: result.message,
          failedAt: new Date().toISOString()
        })

        // Update build status if applicable
        if (parentJob.buildNumber) {
          try {
            // Add error completion message to in-memory logs BEFORE finishing build
            await jobManager.addJobOutput(parentJobId, {
              type: 'log',
              level: 'error',
              message: `Job failed: ${result.message}`,
              source: 'System',
              timestamp: new Date().toISOString(),
              nanotime: (Date.now() * 1000000).toString()
            })

            const buildStatsManager = await getBuildStatsManager()
            await buildStatsManager.finishBuild(parentJob.projectId, parentJob.buildNumber, {
              status: 'failure',
              message: result.message,
              nodesExecuted: parentJob.currentCommandIndex + 1
            })
          } catch (buildError) {
            logger.warn('Failed to update build record:', buildError)
          }
        }
        return
      }

      // Continue with next sequential command (if any) or trigger next nodes
      await this.continueSequentialExecution(parentJobId)

    } catch (error) {
      logger.error(`Error in parallel matrix orchestrator:`, error)
      await jobManager.updateJob(parentJobId, {
        status: 'failed',
        error: `Parallel matrix orchestrator error: ${error.message}`,
        failedAt: new Date().toISOString()
      })

      // Update build status if applicable
      if (parentJob.buildNumber) {
        try {
          // Add error completion message to in-memory logs BEFORE finishing build
          await jobManager.addJobOutput(parentJobId, {
            type: 'log',
            level: 'error',
            message: `Job failed: Orchestrator error: ${error.message}`,
            source: 'System',
            timestamp: new Date().toISOString(),
            nanotime: (Date.now() * 1000000).toString()
          })

          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(parentJob.projectId, parentJob.buildNumber, {
            status: 'failure',
            message: `Orchestrator error: ${error.message}`,
            nodesExecuted: parentJob.currentCommandIndex + 1
          })
        } catch (buildError) {
          logger.warn('Failed to update build record:', buildError)
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
      logger.info(`Notifying job completion for ${jobId}:`, result.success ? 'SUCCESS' : 'FAILED')
      callback(result)
      this.jobCompletionCallbacks.delete(jobId)
    }
  }

  // Continue sequential execution after parallel orchestration
  async continueSequentialExecution(parentJobId) {
    const parentJobUpdated = await jobManager.getJob(parentJobId)
    const nextIndex = parentJobUpdated.currentCommandIndex + 1

    logger.info(`Continuing sequential execution: command ${nextIndex + 1}/${parentJobUpdated.executionCommands.length}`)

    if (nextIndex < parentJobUpdated.executionCommands.length) {
      // Update command index
      await jobManager.updateJob(parentJobId, {
        currentCommandIndex: nextIndex
      })

      const nextCommand = parentJobUpdated.executionCommands[nextIndex]

      // Check if the next command is also an orchestrator
      if (nextCommand.type === 'parallel_branches_orchestrator') {
        logger.info(`Next command is parallel branches orchestrator`)
        await this.executeParallelBranches(parentJobId, nextCommand, parentJobUpdated)
        return
      }

      if (nextCommand.type === 'parallel_matrix_orchestrator') {
        logger.info(`Next command is parallel matrix orchestrator`)
        await this.executeParallelMatrix(parentJobId, nextCommand, parentJobUpdated)
        return
      }

      // Regular sequential command - find agent and dispatch
      const nextRequiresSpecificAgent = nextCommand.requiredAgentId && nextCommand.requiredAgentId !== 'any'
      const nextAgentRequirements = nextRequiresSpecificAgent ? { agentId: nextCommand.requiredAgentId } : {}
      const nextAgent = await this.findAvailableAgent(nextAgentRequirements)

      if (!nextAgent) {
        const errorMsg = nextRequiresSpecificAgent
          ? `CRITICAL: Required agent "${nextCommand.requiredAgentId}" not available for command: ${nextCommand.nodeLabel}`
          : 'No agents available for next command'

        logger.error(errorMsg)
        await jobManager.updateJob(parentJobId, {
          status: 'failed',
          error: errorMsg,
          failedAt: new Date().toISOString()
        })
        return
      }

      // Get environment variables from system settings
      const environment = await this.getEnvironmentVariables()
      logger.debug(`Passing ${Object.keys(environment).length} environment variables to agent for job ${parentJobId}`)

      const dispatchResult = await this.dispatchJobWithQueue(nextAgent.agentId, {
        jobId: parentJobId,
        projectId: parentJobUpdated.projectId,
        projectName: parentJobUpdated.projectName,
        buildNumber: parentJobUpdated.buildNumber,
        commands: nextCommand.script,
        environment,
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

      if (dispatchResult.dispatched) {
        await jobManager.updateJob(parentJobId, {
          agentId: nextAgent.agentId,
          agentName: nextAgent.name || nextAgent.hostname,
          status: 'running'
        })
      } else if (dispatchResult.queued) {
        logger.info(`Next command for job ${parentJobId} queued at position ${dispatchResult.queuePosition}`)
        await jobManager.updateJob(parentJobId, {
          agentId: nextAgent.agentId,
          agentName: nextAgent.name || nextAgent.hostname,
          status: 'queued'
        })
      } else {
        logger.error(`Failed to dispatch or queue next command for job ${parentJobId}`)
        await jobManager.updateJob(parentJobId, {
          status: 'failed',
          error: 'Failed to dispatch next command in sequence',
          failedAt: new Date().toISOString()
        })
      }
    } else {
      // No more commands - mark parent job as complete and trigger next nodes
      logger.info(`All commands (including parallel orchestration) completed for job ${parentJobId}`)
      await jobManager.updateJob(parentJobId, {
        status: 'completed',
        completedAt: new Date().toISOString()
      })

      // Trigger next nodes based on success
      const hasNextNodes = await this.triggerNextNodes(parentJobUpdated, { success: true, exitCode: 0, output: parentJobUpdated.finalOutput })

      // Update build status if this job is associated with a build
      // Only finish the build if there are NO next nodes to execute
      if (parentJobUpdated.buildNumber && !hasNextNodes) {
        try {
          // Add completion message to in-memory logs BEFORE finishing build
          await jobManager.addJobOutput(parentJobId, {
            type: 'log',
            level: 'success',
            message: 'Job completed: Job completed successfully with parallel execution',
            source: 'System',
            timestamp: new Date().toISOString(),
            nanotime: (Date.now() * 1000000).toString()
          })

          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(parentJobUpdated.projectId, parentJobUpdated.buildNumber, {
            status: 'success',
            message: 'Job completed successfully with parallel execution',
            nodesExecuted: parentJobUpdated.executionCommands.length
          })
          logger.info(`BUILD STATS: Build #${parentJobUpdated.buildNumber} for project "${parentJobUpdated.projectName}" marked as successful`)
        } catch (buildError) {
          logger.warn('Failed to update build record on job completion:', buildError)
        }
      } else if (hasNextNodes) {
        logger.info(`Build #${parentJobUpdated.buildNumber} continues - next nodes triggered after orchestrator, not finishing build yet`)
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