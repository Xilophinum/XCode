/**
 * Trigger Execution Utility
 * Handles execution of projects triggered by cron or other automated triggers
 */

import { v4 as uuidv4 } from 'uuid'
import { jobManager } from './jobManager.js'
import { getAgentManager } from './agentManager.js'

/**
 * Execute project from trigger (for cron or other triggers)
 */
export async function executeProjectFromTrigger(projectId, nodes, edges, triggerNodeId) {
  console.log(`🎯 Executing project ${projectId} from trigger ${triggerNodeId}`)
  
  try {
    // Check project status before execution
    const { getDataService } = await import('./dataService.js')
    const dataService = await getDataService()
    const project = await dataService.getItemById(projectId)
    
    if (!project) {
      console.log(`❌ Project ${projectId} not found`)
      return { success: false, message: 'Project not found' }
    }
    
    if (project.status === 'disabled') {
      console.log(`🚫 Project ${projectId} is disabled - skipping trigger execution`)
      return { success: false, message: 'Project is disabled' }
    }
    
    // Get agent manager instance
    const agentManager = await getAgentManager()

    console.log(`🔍 Trigger Execute: Looking for available agent...`)
    console.log(`🔍 Connected agents: ${agentManager.connectedAgents.size}`)
    console.log(`🔍 Agent data entries: ${agentManager.agentData.size}`)

    // Import the graph conversion functions from the execute API
    const executeModule = await import('../api/projects/execute.post.js')
    const { convertGraphToCommands } = executeModule

    // Convert graph to execution commands for the agent
    const executionCommands = convertGraphToCommands(nodes, edges)

    console.log(`🔧 Generated ${executionCommands.length} commands:`, executionCommands)

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

    // Create job record
    const job = {
      jobId,
      projectId,
      status: 'queued',
      nodes,
      edges,
      startTime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      output: [],
      currentNodeId: null,
      currentNodeLabel: null,
      triggeredBy: triggerNodeId
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
      return { success: false, message: errorMsg }
    }
    
    if (requiresSpecificAgent) {
      console.log(`🔒 ENFORCING agent selection for triggered job: ${selectedAgent.agentId} for command: ${firstCommand.nodeLabel}`)
    } else {
      console.log(`🎯 Selected agent ${selectedAgent.agentId} for triggered command: ${firstCommand.nodeLabel}`)
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
      return { success: false, message: errorMsg }
    }

    // Update job status to dispatched and store execution commands
    await jobManager.updateJob(jobId, { 
      status: 'dispatched',
      agentId: selectedAgent.agentId,
      agentName: selectedAgent.name || selectedAgent.hostname,
      executionCommands: executableCommands,
      currentCommandIndex: 0
    })

    console.log(`✅ Triggered job ${jobId} dispatched to agent ${selectedAgent.agentId}`)

    return {
      success: true,
      jobId,
      agentId: selectedAgent.agentId,
      agentName: selectedAgent.name || selectedAgent.hostname,
      startTime: job.startTime,
      message: `Triggered job dispatched to agent ${selectedAgent.name || selectedAgent.hostname}`
    }
    
  } catch (error) {
    console.error(`❌ Error executing triggered project ${projectId}:`, error)
    throw error
  }
}