/**
 * Trigger Execution Utility
 * Handles execution of projects triggered by cron or other automated triggers
 */

import { v4 as uuidv4 } from 'uuid'
import { jobManager } from './jobManager.js'
import { getAgentManager } from './agentManager.js'
import { getBuildStatsManager } from './buildStatsManager.js'
import { getDataService } from './dataService.js'
import { convertGraphToCommands }  from '../api/projects/execute.post.js'
/**
 * Execute project from trigger (for cron or other triggers)
 */
export async function executeProjectFromTrigger(projectId, nodes, edges, triggerNodeId, triggerContext = null) {
    // Start build recording for triggered execution
  let currentBuildNumber = null
  let projectName = null
  try {
    // Check project status before execution

    const dataService = await getDataService()
    const project = await dataService.getItemById(projectId)

    if (!project) {
      console.log(`❌ Project ${projectId} not found`)
      return { success: false, message: 'Project not found' }
    }

    projectName = project.name
    console.log(`🎯 Executing project "${projectName}" from trigger ${triggerNodeId}`)

    if (project.status === 'disabled') {
      console.log(`🚫 Project "${projectName}" is disabled - skipping trigger execution`)
      return { success: false, message: 'Project is disabled' }
    }
    
    // Get agent manager instance
    const agentManager = await getAgentManager()

    console.log(`🔍 Trigger Execute: Looking for available agent...`)

    // Convert graph to execution commands for the agent
    const executionCommands = convertGraphToCommands(nodes, edges, triggerContext)

    console.log(`🔧 Generated ${executionCommands.length} commands`)

    // Filter to get only executable commands
    const executableCommands = executionCommands.filter(cmd => 
      ['bash', 'powershell', 'cmd', 'python', 'node'].includes(cmd.type)
    )

    if (executableCommands.length === 0) {
      console.log('⚠️ No executable commands found in triggered graph')
      return { success: false, message: 'No executable commands found' }
    }

    // Skip agent selection validation for triggered executions (assume cron jobs are pre-configured)
    console.log(`🎯 Executing ${executableCommands.length} commands sequentially (triggered):`, executableCommands.map(cmd => ({
      type: cmd.type,
      label: cmd.nodeLabel,
      requiredAgent: cmd.requiredAgentId || 'any',
      scriptLength: cmd.script?.length || 0
    })))

    // Generate unique job ID
    const jobId = `cron_job_${uuidv4()}`

    try {
      const buildStatsManager = await getBuildStatsManager()
      
      const triggerType = triggerContext ? 'webhook' : 'cron'
      const triggerMessage = triggerContext 
        ? `Webhook trigger: ${triggerContext.endpoint}` 
        : `Cron trigger: ${triggerNodeId}`
      
      const buildResult = await buildStatsManager.startBuild({
        projectId,
        projectName: projectName,
        agentId: null, // Will be updated when agent is assigned
        jobId,
        trigger: triggerType,
        message: triggerMessage,
        nodeCount: nodes.length,
        branch: null,
        commit: null,
        metadata: {
          triggerNodeId,
          triggerContext: triggerContext ? {
            endpoint: triggerContext.endpoint,
            method: 'POST',
            timestamp: triggerContext.timestamp
          } : null
        }
      })
      currentBuildNumber = buildResult.buildNumber
      console.log(`✅ Build #${currentBuildNumber} started for triggered execution of "${projectName}"`)
    } catch (error) {
      console.warn('Failed to start build recording for triggered execution:', error)
    }

    // Create job record
    const job = {
      jobId,
      projectId,
      projectName: projectName,
      status: 'queued',
      nodes,
      edges,
      startTime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      output: [],
      currentNodeId: null,
      currentNodeLabel: null,
      triggeredBy: triggerNodeId,
      triggerContext: triggerContext,
      buildNumber: currentBuildNumber
    }

    // Store job in job manager
    await jobManager.createJob(job)

    // Store all commands in the job for sequential execution
    job.executionCommands = executableCommands
    job.currentCommandIndex = 0

    // Start with the first command - find appropriate agent
    const firstCommand = executableCommands[0]
    console.log(`🚀 Starting triggered sequential execution with command 1/${executableCommands.length}: ${firstCommand.nodeLabel}`)
    
    // Find agent for the first command
    const requiresSpecificAgent = firstCommand.requiredAgentId && firstCommand.requiredAgentId !== 'any' && firstCommand.requiredAgentId !== 'local'
    const agentRequirements = requiresSpecificAgent ? { agentId: firstCommand.requiredAgentId } : {}
    const selectedAgent = await agentManager.findAvailableAgent(agentRequirements)
    
    if (!selectedAgent) {
      const errorMsg = requiresSpecificAgent
        ? `🚨 CRITICAL: Required agent "${firstCommand.requiredAgentId}" not available for triggered command: ${firstCommand.nodeLabel}`
        : 'No agents available for triggered job execution'
      
      console.error(errorMsg)
      await jobManager.updateJob(jobId, { status: 'failed', error: errorMsg })
      
      // Broadcast failure to UI
      if (globalThis.broadcastToProject) {
        globalThis.broadcastToProject(projectId, {
          type: 'job_error',
          projectId: projectId,
          jobId: jobId,
          error: errorMsg,
          timestamp: new Date().toISOString(),
          source: 'trigger_executor'
        })
      }
      
      // Update build record with failure
      if (currentBuildId) {
        try {
          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(currentBuildId, {
            status: 'failure',
            message: errorMsg,
            nodesExecuted: 0
          })
        } catch (buildError) {
          console.warn('Failed to update build record on agent selection failure:', buildError)
        }
      }
      
      return { success: false, message: errorMsg }
    }
    
    if (requiresSpecificAgent) {
      console.log(`🔒 ENFORCING agent selection for triggered job: ${selectedAgent.agentId} for command: ${firstCommand.nodeLabel}`)
    } else {
      console.log(`🎯 Selected agent ${selectedAgent.agentId} for triggered command: ${firstCommand.nodeLabel}`)
    }

    // Update build record with agent selection
    if (currentBuildId) {
      try {
        const buildStatsManager = await getBuildStatsManager()
        await buildStatsManager.updateBuild(currentBuildId, {
          agentId: selectedAgent.agentId,
          agentName: selectedAgent.nickname || selectedAgent.name || selectedAgent.agentId,
          status: 'running'
        })
        console.log(`📊 BUILD STATS: Agent ${selectedAgent.nickname} assigned to build ${currentBuildId}`)
      } catch (buildError) {
        console.warn('Failed to update build record with agent selection:', buildError)
      }
    }

    const dispatchSuccess = await agentManager.dispatchJobToAgent(selectedAgent.agentId, {
      jobId,
      projectId,
      commands: firstCommand.script,
      environment: {},
      workingDirectory: firstCommand.workingDirectory || '.',
      timeout: firstCommand.timeout,
      jobType: firstCommand.type,
      isSequential: true,
      commandIndex: 0,
      totalCommands: executableCommands.length
    })

    if (!dispatchSuccess) {
      // Failed to dispatch, clean up job
      await jobManager.deleteJob(jobId)
      const errorMsg = 'Failed to dispatch triggered job to agent'
      console.error(`❌ ${errorMsg}`)
      
      // Broadcast failure to UI
      if (globalThis.broadcastToProject) {
        globalThis.broadcastToProject(projectId, {
          type: 'job_error',
          projectId: projectId,
          jobId: jobId,
          error: errorMsg,
          timestamp: new Date().toISOString(),
          source: 'trigger_executor'
        })
      }
      
      // Update build record with dispatch failure
      if (currentBuildId) {
        try {
          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(currentBuildId, {
            status: 'failure',
            message: errorMsg,
            nodesExecuted: 0
          })
        } catch (buildError) {
          console.warn('Failed to update build record on dispatch failure:', buildError)
        }
      }
      
      return { success: false, message: errorMsg }
    }

    // Update job status to dispatched and store execution commands
    await jobManager.updateJob(jobId, { 
      status: 'dispatched',
      agentId: selectedAgent.agentId,
      agentName: selectedAgent.name || selectedAgent.hostname,
      executionCommands: executableCommands,
      currentCommandIndex: 0,
      buildNumber: currentBuildNumber
    })

    console.log(`✅ Triggered job ${jobId} dispatched to agent ${selectedAgent.agentId}${currentBuildNumber ? ` (build #: ${currentBuildNumber})` : ''}`)

    return {
      success: true,
      jobId,
      buildNumber: currentBuildNumber,
      agentId: selectedAgent.agentId,
      agentName: selectedAgent.name || selectedAgent.hostname,
      startTime: job.startTime,
      message: `Triggered job dispatched to agent ${selectedAgent.name || selectedAgent.hostname}${currentBuildNumber ? ` (build #: ${currentBuildNumber})` : ''}`
    }
    
  } catch (error) {
    console.error(`❌ Error executing triggered project ${projectId}:`, error)
    
    // Broadcast error to UI
    if (globalThis.broadcastToProject) {
      globalThis.broadcastToProject(projectId, {
        type: 'job_error',
        projectId: projectId,
        error: `Execution error: ${error.message}`,
        timestamp: new Date().toISOString(),
        source: 'trigger_executor'
      })
    }
    
    // Update build record with error if build was started
    if (currentBuildId) {
      try {
        const buildStatsManager = await getBuildStatsManager()
        await buildStatsManager.finishBuild(currentBuildId, {
          status: 'failure',
          message: `Execution error: ${error.message}`,
          nodesExecuted: 0
        })
        console.log(`📊 BUILD STATS: Build ${currentBuildId} marked as failed due to execution error`)
      } catch (buildError) {
        console.warn('Failed to update build record on execution error:', buildError)
      }
    }
    
    throw error
  }
}