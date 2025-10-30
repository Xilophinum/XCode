/**
 * POST /api/projects/execute
 * Dispatches a project execution to an available agent
 */

import { v4 as uuidv4 } from 'uuid'
import { jobManager } from '../../utils/jobManager.js'
import { getAgentManager } from '../../utils/agentManager.js'
import { getDataService } from '../../utils/dataService.js'
import { getCredentialResolver } from '../../utils/credentialResolver.js'
import { getBuildStatsManager } from '../../utils/buildStatsManager.js'
import { notificationService } from '../../utils/notificationService.js'
import logger from '../../utils/logger.js'

export default defineEventHandler(async (event) => {
  let currentBuildNumber = null
  let projectId = null
  
  try {
    const body = await readBody(event)
    const { projectId: bodyProjectId, nodes, edges, startTime, failedNodeLabel } = body
    projectId = bodyProjectId

    if (!projectId || !nodes || !edges) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: projectId, nodes, edges'
      })
    }

    // Check project status before execution
    const dataService = await getDataService()
    const project = await dataService.getItemById(projectId)
    
    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      })
    }
    
    if (project.status === 'disabled') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Project is disabled - execution blocked'
      })
    }

    // Get agent manager instance
    const agentManager = await getAgentManager()

    logger.info(`Execute API: Looking for available agent...`)

    // Find an available agent for this job
    const availableAgent = await agentManager.findAvailableAgent()

    if (!availableAgent) {
      logger.error(`No agents available - connectedAgents size: ${agentManager.connectedAgents.size}, agentData size: ${agentManager.agentData.size}`)
      throw createError({
        statusCode: 503,
        statusMessage: 'No agents available for job execution'
      })
    }

    // Generate unique job ID
    const jobId = `job_${uuidv4()}`

    // Convert graph to execution commands FIRST to validate
    let executionCommands
    try {
      executionCommands = convertGraphToCommands(nodes, edges, null, body.executionOutputs, body.startNodeId)
      logger.info(`Generated ${executionCommands.length} commands`)
    } catch (error) {
      logger.error('Error converting graph to commands:', error.message)
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    // Filter to get only executable commands (including orchestrator commands and notifications)
    const executableCommands = executionCommands.filter(cmd =>
      ['bash', 'sh', 'powershell', 'cmd', 'python', 'node', 'parallel_branches_orchestrator', 'parallel_matrix_orchestrator', 'notification'].includes(cmd.type)
    )

    if (executableCommands.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No executable commands found in graph. Please add at least one executable node (bash, sh, powershell, cmd, python, or node).'
      })
    }

    // Validate that all executable commands have agent selection (except orchestrators and notifications which run on the server)
    const missingAgentCommands = executableCommands.filter(cmd =>
      !['parallel_branches_orchestrator', 'parallel_matrix_orchestrator', 'notification'].includes(cmd.type) &&
      (!cmd.requiredAgentId || cmd.requiredAgentId === '')
    )

    if (missingAgentCommands.length > 0) {
      const errorMsg = `Execution blocked: The following nodes require agent selection: ${missingAgentCommands.map(cmd => `"${cmd.nodeLabel}"`).join(', ')}. Agent selection is mandatory for all executable nodes.`
      logger.error(errorMsg)
      throw createError({
        statusCode: 400,
        statusMessage: errorMsg
      })
    }

    // Start build recording AFTER validation (or reuse existing build if provided)
    let currentProjectName = body.projectName || project.name

    const buildStatsManager = await getBuildStatsManager()

    // Check if this is a continuation of an existing build (from triggerNextNodes)
    if (body.buildNumber) {
      currentBuildNumber = body.buildNumber
      logger.info(`Continuing existing build #${currentBuildNumber} for "${currentProjectName}" (triggered by node completion)`)
    } else {
      // Create new build for initial execution
      const buildResult = await buildStatsManager.startBuild({
        projectId,
        projectName: project.name,
        agentId: availableAgent.agentId,
        agentName: availableAgent.name || availableAgent.hostname,
        jobId,
        trigger: 'manual',
        message: 'Manual execution',
        nodeCount: nodes.length,
        branch: null,
        commit: null,
        metadata: null
      })

      currentBuildNumber = buildResult.buildNumber
      logger.info(`Build #${currentBuildNumber} started for manual execution of "${project.name}"`)
    }

    // Create job record WITH buildNumber
    const job = {
      jobId,
      projectId,
      projectName: currentProjectName,
      agentId: availableAgent.agentId,
      agentName: availableAgent.name || availableAgent.hostname,
      status: 'queued',
      nodes,
      edges,
      buildNumber: currentBuildNumber,
      startTime: startTime || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      output: [],
      currentNodeId: null,
      currentNodeLabel: null,
      triggeredByFailure: body.triggeredByFailure || false // Track if this was a failure handler
    }

    // Store job in job manager
    await jobManager.createJob(job)

    // Get environment variables from system settings
    const systemEnvVars = await agentManager.getEnvironmentVariables()

    // Resolve credentials and inject as environment variables
    const credentialResolver = await getCredentialResolver()
    const resolvedEnv = await credentialResolver.resolveCredentials(nodes, systemEnvVars)

    logger.info(`Resolved ${Object.keys(resolvedEnv).length - Object.keys(systemEnvVars).length} credential environment variables`)

    // Log environment keys only (not values) to avoid exposing secrets
    logger.debug('Environment variable keys for job:', Object.keys(resolvedEnv))

    // Store credential resolver in job for log masking
    // We need to update the job in the jobManager because it stores a separate reference
    const jobFromManager = jobManager.jobs.get(jobId)
    if (jobFromManager) {
      jobFromManager.credentialResolver = credentialResolver
      logger.debug(`Attached credentialResolver to job ${jobId} with ${credentialResolver.logMasker.getSensitiveCount()} secret values registered`)
    } else {
      logger.warn(`Could not find job ${jobId} in jobManager to attach credentialResolver`)
    }

    // Store all commands in the job for sequential execution
    job.executionCommands = executableCommands
    job.currentCommandIndex = 0

    // Start with the first command
    const firstCommand = executableCommands[0]
    logger.info(`Starting sequential execution with command 1/${executableCommands.length}: ${firstCommand.nodeLabel}`)

    // Check if first command is an orchestrator
    if (firstCommand.type === 'parallel_branches_orchestrator') {
      // Update job with orchestrator execution
      await jobManager.updateJob(jobId, {
        status: 'running',
        executionCommands: executableCommands,
        currentCommandIndex: 0,
        buildNumber: currentBuildNumber
      })
      
      // Execute orchestrator directly
      await agentManager.executeParallelBranches(jobId, firstCommand, job)
      
      // Broadcast orchestrator started event to WebSocket clients
      if (globalThis.broadcastToProject) {
        globalThis.broadcastToProject(projectId, {
          type: 'job_started',
          jobId,
          buildNumber: currentBuildNumber,
          agentId: 'orchestrator',
          agentName: 'Parallel Branches Orchestrator',
          status: 'running',
          startTime: job.startTime,
          message: 'Parallel branches orchestrator started',
          timestamp: new Date().toISOString()
        })
      }

      return {
        success: true,
        jobId,
        buildNumber: currentBuildNumber,
        agentId: 'orchestrator',
        agentName: 'Parallel Branches Orchestrator',
        startTime: job.startTime,
        message: `Parallel branches orchestrator started${currentBuildNumber ? ` (build #${currentBuildNumber})` : ''}`
      }
    }
    
    if (firstCommand.type === 'parallel_matrix_orchestrator') {
      // Update job with orchestrator execution
      await jobManager.updateJob(jobId, {
        status: 'running',
        executionCommands: executableCommands,
        currentCommandIndex: 0,
        buildNumber: currentBuildNumber
      })
      
      // Execute orchestrator directly
      await agentManager.executeParallelMatrix(jobId, firstCommand, job)
      
      // Broadcast orchestrator started event to WebSocket clients
      if (globalThis.broadcastToProject) {
        globalThis.broadcastToProject(projectId, {
          type: 'job_started',
          jobId,
          buildNumber: currentBuildNumber,
          agentId: 'orchestrator',
          agentName: 'Parallel Matrix Orchestrator',
          status: 'running',
          startTime: job.startTime,
          message: 'Parallel matrix orchestrator started',
          timestamp: new Date().toISOString()
        })
      }

      return {
        success: true,
        jobId,
        buildNumber: currentBuildNumber,
        agentId: 'orchestrator',
        agentName: 'Parallel Matrix Orchestrator',
        startTime: job.startTime,
        message: `Parallel matrix orchestrator started${currentBuildNumber ? ` (build #${currentBuildNumber})` : ''}`
      }
    }

    // Check if first command is a notification
    if (firstCommand.type === 'notification') {
      logger.info(`First command is notification - executing directly on backend`)

      // Update job with notification execution
      await jobManager.updateJob(jobId, {
        status: 'running',
        executionCommands: executableCommands,
        currentCommandIndex: 0,
        buildNumber: currentBuildNumber
      })

      const context = {
        jobId,
        projectId,
        projectName: project.name,
        buildNumber: currentBuildNumber,
        failedNodeLabel: failedNodeLabel || null
      }

      const result = await notificationService.sendNotification(firstCommand, context)

      if (result.success) {
        logger.info(`Notification sent successfully`)

        // Mark job as completed
        await jobManager.updateJob(jobId, {
          status: 'completed',
          exitCode: 0,
          completedAt: new Date().toISOString(),
          message: 'Notification sent successfully'
        })

        // Broadcast notification sent event
        if (globalThis.broadcastToProject) {
          globalThis.broadcastToProject(projectId, {
            type: 'job_completed',
            jobId,
            buildNumber: currentBuildNumber,
            status: 'completed',
            message: 'Notification sent successfully',
            timestamp: new Date().toISOString()
          })
        }

        // Mark build as complete if this was the only command
        if (executableCommands.length === 1 && currentBuildNumber) {
          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(projectId, currentBuildNumber, {
            status: 'success',
            message: 'Notification sent successfully',
            nodesExecuted: 1
          })
        }
      } else {
        logger.error(`Notification failed:`, result.error)

        // Mark job as failed
        await jobManager.updateJob(jobId, {
          status: 'failed',
          error: result.error,
          exitCode: 1,
          failedAt: new Date().toISOString()
        })

        // Broadcast notification failed event
        if (globalThis.broadcastToProject) {
          globalThis.broadcastToProject(projectId, {
            type: 'job_failed',
            jobId,
            buildNumber: currentBuildNumber,
            status: 'failed',
            error: result.error,
            timestamp: new Date().toISOString()
          })
        }

        // Mark build as failed if this was the only command
        if (executableCommands.length === 1 && currentBuildNumber) {
          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(projectId, currentBuildNumber, {
            status: 'failure',
            message: `Notification failed: ${result.error}`,
            nodesExecuted: 1
          })
        }
      }

      return {
        success: result.success,
        jobId,
        buildNumber: currentBuildNumber,
        agentId: 'backend',
        agentName: 'Notification Service',
        startTime: job.startTime,
        message: result.success
          ? `Notification sent successfully${currentBuildNumber ? ` (build #${currentBuildNumber})` : ''}`
          : `Notification failed: ${result.error}`
      }
    }

    // Find agent for regular execution commands
    const requiresSpecificAgent = firstCommand.requiredAgentId && firstCommand.requiredAgentId !== 'any'
    const agentRequirements = requiresSpecificAgent ? { agentId: firstCommand.requiredAgentId } : {}
    const selectedAgent = await agentManager.findAvailableAgent(agentRequirements)
    
    if (!selectedAgent) {
      const errorMsg = requiresSpecificAgent
        ? `CRITICAL: Required agent "${firstCommand.requiredAgentId}" not available for command: ${firstCommand.nodeLabel}. Execution BLOCKED to prevent running on wrong environment.`
        : 'No agents available for job execution'

      logger.error(errorMsg)
      throw createError({
        statusCode: 503,
        statusMessage: errorMsg
      })
    }

    if (requiresSpecificAgent) {
      logger.info(`ENFORCING agent selection: ${selectedAgent.agentId} for command: ${firstCommand.nodeLabel}`)
    } else {
      logger.info(`Selected agent ${selectedAgent.agentId} for first command: ${firstCommand.nodeLabel} (user chose "any available")`)
    }

    // Build recording already done above

    // Update job with current node info BEFORE dispatching so output has nodeId
    await jobManager.updateJob(jobId, {
      executionCommands: executableCommands,
      currentCommandIndex: 0,
      currentNodeId: firstCommand.nodeId,
      currentNodeLabel: firstCommand.nodeLabel,
      buildNumber: currentBuildNumber
    })

    const dispatchResult = await agentManager.dispatchJobWithQueue(selectedAgent.agentId, {
      jobId,
      projectId,
      projectName: project.name,
      buildNumber: currentBuildNumber,
      commands: firstCommand.script,
      environment: resolvedEnv,
      workingDirectory: firstCommand.workingDirectory || '.',
      timeout: firstCommand.timeout,
      jobType: firstCommand.type,
      retryEnabled: firstCommand.retryEnabled,
      maxRetries: firstCommand.maxRetries,
      retryDelay: firstCommand.retryDelay,
      isSequential: true,
      commandIndex: 0,
      totalCommands: executableCommands.length
    })

    if (!dispatchResult.dispatched && !dispatchResult.queued) {
      // Failed to dispatch OR queue, clean up job
      await jobManager.deleteJob(jobId)

      // Update build record with failure if build was started
      if (currentBuildNumber) {
        try {
          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(projectId, currentBuildNumber, {
            status: 'failure',
            message: dispatchResult.error || 'Failed to dispatch or queue job to agent',
            nodesExecuted: 0
          })
        } catch (buildError) {
          logger.warn('Failed to update build record on dispatch failure:', buildError)
        }
      }

      throw createError({
        statusCode: 503,
        statusMessage: dispatchResult.error || 'Failed to dispatch or queue job to agent'
      })
    }

    // Update job status based on dispatch result
    if (dispatchResult.dispatched) {
      // Job was dispatched immediately
      await jobManager.updateJob(jobId, {
        status: 'dispatched',
        agentId: selectedAgent.agentId,
        agentName: selectedAgent.name || selectedAgent.hostname
      })
      logger.info(`✅ Job ${jobId} dispatched immediately to agent ${selectedAgent.agentId}${currentBuildNumber ? ` (build #${currentBuildNumber})` : ''}`)
    } else if (dispatchResult.queued) {
      // Job was queued
      await jobManager.updateJob(jobId, {
        status: 'queued',
        agentId: selectedAgent.agentId,
        agentName: selectedAgent.name || selectedAgent.hostname
      })
      logger.info(`📥 Job ${jobId} queued for agent ${selectedAgent.agentId} at position ${dispatchResult.queuePosition}${currentBuildNumber ? ` (build #${currentBuildNumber})` : ''}`)
      logger.info(`   Queue length: ${dispatchResult.queueLength}`)
    }

    // Broadcast job started event to WebSocket clients
    if (globalThis.broadcastToProject) {
      globalThis.broadcastToProject(projectId, {
        type: 'job_started',
        jobId,
        buildNumber: currentBuildNumber,
        agentId: selectedAgent.agentId,
        agentName: selectedAgent.name || selectedAgent.hostname,
        status: 'dispatched',
        startTime: job.startTime,
        message: `Job dispatched to agent ${selectedAgent.name || selectedAgent.hostname}`,
        timestamp: new Date().toISOString()
      })
    }

    return {
      success: true,
      jobId,
      buildNumber: currentBuildNumber,
      agentId: selectedAgent.agentId,
      agentName: selectedAgent.name || selectedAgent.hostname,
      startTime: job.startTime,
      message: `Job dispatched to agent ${selectedAgent.name || selectedAgent.hostname}${currentBuildNumber ? ` (build #${currentBuildNumber})` : ''}`
    }

  } catch (error) {
    logger.error('Error dispatching job:', error)

    // Clean up build record if it was created
    if (currentBuildNumber) {
      try {
        const buildStatsManager = await getBuildStatsManager()
        await buildStatsManager.finishBuild(projectId, currentBuildNumber, {
          status: 'failure',
          message: error.statusMessage || error.message || 'Failed to execute project',
          nodesExecuted: 0
        })
      } catch (buildError) {
        logger.warn('Failed to update build record on error:', buildError)
      }
    }
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to execute project'
    })
  }
})

/**
 * Convert Vue Flow graph to executable commands for the agent
 * This function analyzes the graph and compiles it into a sequence of executable commands,
 * resolving parameter values and skipping non-executable nodes.
 */
export function convertGraphToCommands(nodes, edges, triggerContext = null, executionOutputs = null, startNodeId = null) {
  logger.info(`Converting graph to commands...`)
  logger.info(`Graph has ${nodes.length} nodes and ${edges.length} edges`)

  // Step 1: Build parameter value map from parameter nodes + trigger context + execution outputs
  const parameterValues = buildParameterValueMap(nodes, edges, triggerContext, executionOutputs)

  // Step 2: Find executable starting points
  let startingNodes
  if (startNodeId) {
    // Use specific starting node if provided
    const specificNode = nodes.find(node => node.id === startNodeId)
    if (!specificNode) {
      throw new Error(`Start node with ID ${startNodeId} not found in graph`)
    }
    startingNodes = [specificNode]
    logger.info(`Using specific starting node: ${specificNode.data.label}`)
  } else {
    // Find executable starting points (trigger nodes or nodes without execution inputs)
    startingNodes = findExecutionStartingNodes(nodes, edges)
    logger.info(`Found ${startingNodes.length} starting nodes:`, startingNodes.map(n => n.data.label))
  }

  if (startingNodes.length === 0) {
    throw new Error('No executable nodes found in graph. Please add at least one executable node (bash, sh, powershell, cmd, python, or node) to create a workflow.')
  }

  // Step 3: Build execution flow from starting nodes
  const commands = []
  const visited = new Set()

  for (const startNode of startingNodes) {
    const nodeCommands = buildExecutionFlow(startNode, nodes, edges, parameterValues, visited)
    commands.push(...nodeCommands)
  }

  logger.info(`Generated ${commands.length} executable commands`)
  return commands
}

/**
 * Build a map of parameter values from parameter nodes + webhook/trigger context
 */
function buildParameterValueMap(nodes, edges, triggerContext = null, executionOutputs = null) {
  const parameterValues = new Map()

  // Add execution outputs if provided
  if (executionOutputs) {
    if (executionOutputs instanceof Map) {
      // Handle Map (legacy)
      for (const [key, value] of executionOutputs) {
        parameterValues.set(key, value)
        logger.debug(`Added execution output: ${key} = ${value.value}`)
      }
    } else if (typeof executionOutputs === 'object') {
      // Handle plain object (serialized from Map)
      for (const [key, value] of Object.entries(executionOutputs)) {
        parameterValues.set(key, value)
        logger.debug(`Added execution output: ${key} = ${value.value}`)
      }
    }
  }

  // Find all parameter nodes and extract their values
  const parameterNodes = nodes.filter(node => 
    node.data.nodeType?.includes('-param')
  )

  for (const paramNode of parameterNodes) {
    const value = getParameterNodeValue(paramNode)
    parameterValues.set(paramNode.id, {
      label: paramNode.data.label,
      value: value,
      nodeType: paramNode.data.nodeType
    })
  }

  // Add webhook trigger node data if available
  if (triggerContext) {
    const webhookNodes = nodes.filter(node => node.data.nodeType === 'webhook')
    
    for (const webhookNode of webhookNodes) {
      if (webhookNode.data.outputSockets && webhookNode.data.outputSockets.length > 0) {
        // Create a simple webhook data object with just the raw data
        const webhookData = {
          body: triggerContext.body || {},
          headers: triggerContext.headers || {},
          query: triggerContext.query || {},
          endpoint: triggerContext.endpoint || '',
          timestamp: triggerContext.timestamp || ''
        }
        
        // Add the webhook data for the single output socket
        const socket = webhookNode.data.outputSockets[0] // Should only be one socket
        parameterValues.set(`${webhookNode.id}_${socket.id}`, {
          label: socket.label,
          value: webhookData,
          nodeType: 'webhook-output',
          socketId: socket.id,
          parentNodeId: webhookNode.id
        })
      }
    }
  }

  return parameterValues
}

/**
 * Get the configured value from a parameter node
 */
function getParameterNodeValue(paramNode) {
  const nodeType = paramNode.data.nodeType
  const data = paramNode.data

  switch (nodeType) {
    case 'string-param':
    case 'text-param':
      return data.defaultValue || ''
    case 'choice-param':
      return data.defaultValue || (data.choices?.[0] || '')
    case 'boolean-param':
      return data.defaultValue || false
    default:
      return ''
  }
}

/**
 * Find nodes that can start execution (trigger nodes or nodes without execution inputs)
 */
function findExecutionStartingNodes(nodes, edges) {
  const startingNodes = nodes.filter(node => {
    // Skip parameter nodes - they don't execute, they provide values
    if (node.data.nodeType?.includes('-param')) {
      return false
    }

    // Skip conditional nodes - they need input data to evaluate conditions
    if (node.data.nodeType === 'conditional') {
      return false
    }

    // Skip notification nodes - they should be triggered by other nodes, not start execution
    if (node.data.nodeType === 'notification') {
      return false
    }

    // Check if this node has incoming execution connections
    const hasIncomingExecutionConnections = edges.some(edge =>
      edge.target === node.id && (edge.targetHandle === 'execution' || !edge.targetHandle)
    )

    // Any other node without incoming execution connections can be a starting node
    // This includes trigger nodes (cron, webhook) and execution nodes (bash, cmd, powershell, python, node)
    // and control nodes (parallel_branches, parallel_matrix, parallel_execution)
    return !hasIncomingExecutionConnections
  })

  // If no starting nodes found (manual execution without triggers), find the first executable node
  if (startingNodes.length === 0) {
    // Special case: if there's only one node in the graph, it's the starting node (triggered individually)
    if (nodes.length === 1 && !nodes[0].data.nodeType?.includes('-param')) {
      logger.info(`Single node execution - using: ${nodes[0].data.label}`)
      return [nodes[0]]
    }

    // Prioritize orchestrator nodes first (parallel_branches, parallel_matrix)
    const orchestratorNodes = nodes.filter(node =>
      ['parallel_branches', 'parallel_matrix'].includes(node.data.nodeType)
    )

    if (orchestratorNodes.length > 0) {
      logger.info(`No trigger nodes found - using orchestrator node for manual execution: ${orchestratorNodes[0].data.label}`)
      return [orchestratorNodes[0]]
    }

    // Fallback to regular execution nodes (including notifications)
    const executableNodes = nodes.filter(node =>
      ['bash', 'sh', 'powershell', 'cmd', 'python', 'node', 'parallel_execution', 'notification'].includes(node.data.nodeType)
    )

    if (executableNodes.length > 0) {
      logger.info(`No trigger nodes found - using first executable node for manual execution: ${executableNodes[0].data.label}`)
      return [executableNodes[0]]
    }
  }

  return startingNodes
}

/**
 * Build the execution flow starting from a given node
 */
function buildExecutionFlow(startNode, allNodes, allEdges, parameterValues, visited) {
  if (visited.has(startNode.id)) {
    return []
  }
  visited.add(startNode.id)

  const commands = []

  // Convert current node to commands (only if it's executable)
  const nodeCommands = convertNodeToExecutableCommands(startNode, allNodes, allEdges, parameterValues)
  if (nodeCommands.length > 0) {
    commands.push(...nodeCommands)
  }

  // Check if this node has success/failure routing (branching point)
  const isExecutionNode = ['bash', 'sh', 'powershell', 'cmd', 'python', 'node', 'parallel_branches'].includes(startNode.data.nodeType)
  const hasSuccessSocket = isExecutionNode && allEdges.some(edge => edge.source === startNode.id && edge.sourceHandle === 'success')
  const hasFailureSocket = isExecutionNode && allEdges.some(edge => edge.source === startNode.id && edge.sourceHandle === 'failure')

  // If this node has success/failure sockets, STOP building the sequential flow here
  // Let runtime routing (triggerNextNodes) handle the branching
  if (hasSuccessSocket || hasFailureSocket) {
    logger.info(`Node "${startNode.data.label}" has success/failure routing - stopping sequential compilation here`)
    return commands
  }

  // Find nodes connected via execution flow
  const connectedNodes = getExecutionConnectedNodes(startNode.id, allNodes, allEdges, parameterValues)

  for (const connectedNode of connectedNodes) {
    const connectedCommands = buildExecutionFlow(connectedNode, allNodes, allEdges, parameterValues, visited)
    commands.push(...connectedCommands)
  }

  return commands
}

/**
 * Convert a single node to executable commands, resolving parameter placeholders
 */
function convertNodeToExecutableCommands(node, allNodes, allEdges, parameterValues) {
  const commands = []
  const nodeType = node.data.nodeType

  switch (nodeType) {
    case 'bash':
    case 'sh':
    case 'powershell':
    case 'cmd':
    case 'python':
    case 'node':
      // These are executable script nodes
      if (node.data.script) {
        // Resolve parameter placeholders in the script
        const resolvedScript = resolveScriptPlaceholders(node, allEdges, parameterValues)
        
        commands.push({
          type: nodeType,
          script: resolvedScript,
          workingDirectory: node.data.workingDirectory || '.',
          timeout: node.data.timeout ? node.data.timeout * 1000 : 300000, // Default 5 minutes
          nodeId: node.id,
          nodeLabel: node.data.label,
          requiredAgentId: node.data.agentId, // Agent ID specified in node properties
          retryEnabled: node.data.retryEnabled || false,
          maxRetries: node.data.maxRetries || 3,
          retryDelay: node.data.retryDelay || 5
        })
      }
      break

    case 'parallel_execution':
      // Parallel execution node - used within parallel branches
      // Uses dynamic execution type (bash, powershell, cmd, python, node)
      if (node.data.script) {
        // Resolve parameter placeholders in the script
        const resolvedScript = resolveScriptPlaceholders(node, allEdges, parameterValues)

        commands.push({
          type: node.data.executionType, // Dynamic type based on dropdown selection
          script: resolvedScript,
          workingDirectory: node.data.workingDirectory || '.',
          timeout: node.data.timeout ? node.data.timeout * 1000 : 300000, // Default 5 minutes
          nodeId: node.id,
          nodeLabel: node.data.label,
          requiredAgentId: node.data.agentId, // MUST have agent selection
          retryEnabled: node.data.retryEnabled || false,
          maxRetries: node.data.maxRetries || 3,
          retryDelay: node.data.retryDelay || 5,
          isParallelExecution: true // Flag to identify parallel execution nodes
        })
      }
      break

    case 'parallel_branches':
      // Parallel branches node - orchestrates parallel execution of multiple branches
      logger.info(`Parallel Branches node: ${node.data.label}`)

      // Create a parallel orchestration command
      commands.push({
        type: 'parallel_branches_orchestrator',
        nodeId: node.id,
        nodeLabel: node.data.label,
        branches: node.data.branches,
        maxConcurrency: node.data.maxConcurrency,
        failFast: node.data.failFast,
        retryEnabled: node.data.retryEnabled,
        maxRetries: node.data.maxRetries,
        retryDelay: node.data.retryDelay,
        // Get nodes connected to each branch socket
        branchTargets: getBranchTargetNodes(node, allNodes, allEdges)
      })
      break

    case 'parallel_matrix':
      // Parallel matrix node - executes same job multiple times with JS-generated parameters
      logger.info(`Parallel Matrix node: ${node.data.label}`)

      // Evaluate JavaScript to generate array
      let items = []
      try {
        const evalFunction = new Function(node.data.script)
        items = evalFunction()

        if (!Array.isArray(items)) {
          throw new Error('Script must return an array')
        }
        logger.info(`Matrix generated ${items.length} items:`, items)
      } catch (error) {
        logger.error(`Failed to evaluate parallel_matrix script:`, error)
        throw error
      }

      // Create a parallel matrix orchestration command
      commands.push({
        type: 'parallel_matrix_orchestrator',
        nodeId: node.id,
        nodeLabel: node.data.label,
        items: items,
        itemVariableName: node.data.itemVariableName || 'ITEM',
        maxConcurrency: node.data.maxConcurrency,
        failFast: node.data.failFast,
        continueOnError: node.data.continueOnError,
        retryEnabled: node.data.retryEnabled,
        maxRetries: node.data.maxRetries,
        retryDelay: node.data.retryDelay,
        // Get node connected to iteration socket
        iterationTarget: getIterationTargetNode(node, allNodes, allEdges)
      })
      break

    case 'cron':
    case 'webhook':
    case 'job-trigger':
      // Trigger nodes don't generate executable commands during manual execution
      // They are only relevant for scheduling/triggering jobs
      logger.debug(`Skipping trigger node during execution: ${node.data.label}`)
      break

    // Parameter nodes are handled separately in parameter resolution
    case 'string-param':
    case 'text-param':
    case 'choice-param':
    case 'boolean-param':
      logger.debug(`Skipping parameter node during execution: ${node.data.label}`)
      break

    case 'conditional':
      // Conditional nodes are handled during execution flow, not as commands
      logger.info(`Conditional node found: ${node.data.label}`)
      break

    case 'parallel':
    case 'retry':
      // Control nodes - for now just log them
      // TODO: Implement proper control flow logic
      commands.push({
        type: 'log',
        message: `Control node: ${node.data.label} (${nodeType})`,
        nodeId: node.id,
        nodeLabel: node.data.label
      })
      break

    case 'notification':
      // Notification node - send email, slack, or webhook
      // Helper function to resolve placeholders in a text field
      const resolvePlaceholders = (text) => {
        if (!text) return text
        // Create a temporary node with the text as script to reuse resolveScriptPlaceholders
        const tempNode = {
          id: node.id, // Need the node ID for connection lookups
          data: {
            script: text,
            inputSockets: node.data.inputSockets
          }
        }
        return resolveScriptPlaceholders(tempNode, allEdges, parameterValues)
      }

      // Helper function to recursively resolve placeholders in a JSON object/array
      const resolveObjectPlaceholders = (obj, node, edges, params) => {
        if (typeof obj === 'string') {
          return resolvePlaceholders(obj)
        } else if (Array.isArray(obj)) {
          return obj.map(item => resolveObjectPlaceholders(item, node, edges, params))
        } else if (obj !== null && typeof obj === 'object') {
          const result = {}
          for (const [key, value] of Object.entries(obj)) {
            result[key] = resolveObjectPlaceholders(value, node, edges, params)
          }
          return result
        }
        return obj
      }

      commands.push({
        type: 'notification',
        notificationType: node.data.notificationType || 'email',

        // Email properties
        emailFrom: node.data.emailFrom,
        emailTo: node.data.emailTo,
        emailSubject: resolvePlaceholders(node.data.emailSubject || ''),
        emailBody: resolvePlaceholders(node.data.emailBody || ''),
        emailHtml: node.data.emailHtml || false,

        // Slack properties
        slackWebhookUrl: node.data.slackWebhookUrl,
        slackChannel: node.data.slackChannel,
        slackUsername: node.data.slackUsername,
        slackMessage: resolvePlaceholders(node.data.slackMessage || ''),
        slackBlocks: node.data.slackBlocks,  // JSON string or object for Block Kit
        slackMode: node.data.slackMode || 'simple',  // 'simple' or 'blocks'

        // Webhook properties
        webhookUrl: node.data.webhookUrl,
        webhookMethod: node.data.webhookMethod || 'POST',
        webhookHeaders: node.data.webhookHeaders || '{}',
        // Webhook body needs special handling for JSON - parse, resolve, re-stringify
        webhookBody: (() => {
          const rawBody = node.data.webhookBody || '{}'
          try {
            // Parse JSON, resolve placeholders in values, re-stringify
            const parsed = JSON.parse(rawBody)
            const resolved = resolveObjectPlaceholders(parsed, node, allEdges, parameterValues)
            return JSON.stringify(resolved)
          } catch (error) {
            // Not JSON, use simple resolution
            logger.warn('Webhook body is not JSON, using simple placeholder resolution')
            return resolvePlaceholders(rawBody)
          }
        })(),

        // General notification properties
        attachBuildLog: node.data.attachBuildLog || false, // Whether to attach build log file

        nodeId: node.id,
        nodeLabel: node.data.label
      })
      break

    default:
      logger.warn(`Unknown node type during execution: ${nodeType} (${node.data.label})`)
  }

  return commands
}

/**
 * Safely access nested properties in an object using dot notation
 * Supports array access like "commits[0].id"
 */
function getNestedProperty(obj, path) {
  // Handle array notation like "commits[0].id" 
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1')
  
  return normalizedPath.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined
    return current[key]
  }, obj)
}

/**
 * Resolve parameter placeholders in script text
 */
function resolveScriptPlaceholders(node, allEdges, parameterValues) {
  let script = node.data.script || ''
  // Find all input connections to this node
  const inputConnections = allEdges.filter(edge => edge.target === node.id)

  // Process each input socket placeholder
  if (node.data.inputSockets && node.data.inputSockets.length > 0) {
    node.data.inputSockets.forEach((socket, index) => {
      
      // Find the edge connected to this socket
      const connection = inputConnections.find(edge => edge.targetHandle === socket.id)
      let parameterData = null

      if (connection) {
        // Check if the source is a parameter node
        parameterData = parameterValues.get(connection.source)

        // If not found, check if it's a webhook output socket connection
        if (!parameterData && connection.sourceHandle) {
          const webhookSocketKey = `${connection.source}_${connection.sourceHandle}`
          parameterData = parameterValues.get(webhookSocketKey)
        }

        // If still not found, check if it's an execution output connection
        if (!parameterData && connection.sourceHandle === 'output') {
          const executionOutputKey = `${connection.target}_${connection.targetHandle}`
          parameterData = parameterValues.get(executionOutputKey)
        }
      }

      // Even if no connection found, try to find parameter data by socket
      // This handles cases where the node is executed separately (like notification after job failure)
      if (!parameterData) {
        const executionOutputKey = `${node.id}_${socket.id}`
        parameterData = parameterValues.get(executionOutputKey)
        if (parameterData) {
          logger.debug(`Found execution output by direct socket lookup: ${executionOutputKey}`)
        }
      }

      if (parameterData) {
          // Handle socket label that may or may not start with $
          const cleanLabel = socket.label.startsWith('$') ? socket.label.substring(1) : socket.label
          
          // Escape special regex characters in the socket label
          const escapedLabel = cleanLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          
          // Check if the parameter value is an object (webhook data)
          const isObjectValue = typeof parameterData.value === 'object' && parameterData.value !== null
          
          if (isObjectValue) {
            
            // Handle property access patterns FIRST, including patterns outside ${} like $INPUT_1.property
            // Pattern 1: ${INPUT_1.property.path} (preferred format)
            const propertyAccessRegex1 = new RegExp(`\\$\\{\\$?${escapedLabel}\\.(.*?)\\}`, 'g')
            script = script.replace(propertyAccessRegex1, (match, propertyPath) => {
              try {
                const value = getNestedProperty(parameterData.value, propertyPath)
                return value !== undefined ? String(value) : match
              } catch (error) {
                logger.warn(`Failed to access property ${propertyPath} on ${cleanLabel}:`, error)
                return match
              }
            })

            // Pattern 2: $INPUT_1.property.path (without braces - fallback)
            const propertyAccessRegex2 = new RegExp(`\\$${escapedLabel}\\.(\\S+?)(?=\\s|"|'|$)`, 'g')
            script = script.replace(propertyAccessRegex2, (match, propertyPath) => {
              try {
                const value = getNestedProperty(parameterData.value, propertyPath)
                return value !== undefined ? String(value) : match
              } catch (error) {
                logger.warn(`Failed to access property ${propertyPath} on ${cleanLabel}:`, error)
                return match
              }
            })
            
            // Then handle simple references like ${INPUT_1} with the whole object as JSON
            const simpleSocketPlaceholder = `\\$\\{\\$?${escapedLabel}\\}`
            script = script.replace(new RegExp(simpleSocketPlaceholder, 'g'), JSON.stringify(parameterData.value))
            
          } else {
            // For simple values, use the existing logic
            // Primary format: ${socketLabel} - this is the main format users should use
            // Also handle ${$socketLabel} in case there's an extra $ inside the braces
            const socketLabelPlaceholder = `\\$\\{\\$?${escapedLabel}\\}`
            script = script.replace(new RegExp(socketLabelPlaceholder, 'g'), String(parameterData.value))
            
            // Fallback format: $socketLabel (without {}) - for error recovery
            // This helps when users forget to wrap the socket label in {}
            // Only apply if the label doesn't contain spaces (to avoid false matches)
            if (!cleanLabel.includes(' ')) {
              const fallbackPlaceholder = `\\$${escapedLabel}\\b` // \b ensures word boundary
              script = script.replace(new RegExp(fallbackPlaceholder, 'g'), String(parameterData.value))
            }
          }

      } else {
        logger.debug(`No connection found for socket "${socket.label}"`)
      }
    })
  }

  logger.debug(`Final script: "${script}"`)
  return script
}

/**
 * Get nodes connected via execution flow from a given node
 */
export function getExecutionConnectedNodes(nodeId, allNodes, allEdges, parameterValues = new Map(), executionResult = null) {
  const sourceNode = allNodes.find(node => node.id === nodeId)
  
  // Handle conditional nodes specially
  if (sourceNode && sourceNode.data.nodeType === 'conditional') {
    return getConditionalConnectedNodes(sourceNode, allNodes, allEdges, parameterValues)
  }
  
  // Handle execution nodes with success/failure routing
  // Note: parallel_execution nodes have no output sockets, so they don't need success/failure routing
  if (sourceNode && ['bash', 'sh', 'powershell', 'cmd', 'python', 'node', 'parallel_branches'].includes(sourceNode.data.nodeType)) {
    return getExecutionResultConnectedNodes(sourceNode, allNodes, allEdges, executionResult)
  }
  
  // Find edges that represent execution flow from this node
  const executionEdges = allEdges.filter(edge => 
    edge.source === nodeId && (edge.sourceHandle === 'execution' || !edge.sourceHandle)
  )

  // Get the target nodes
  const connectedNodes = executionEdges
    .map(edge => allNodes.find(node => node.id === edge.target))
    .filter(node => node !== undefined)

  return connectedNodes
}

/**
 * Handle execution node success/failure routing
 */
function getExecutionResultConnectedNodes(executionNode, allNodes, allEdges, executionResult) {
  const connectedNodes = []

  // Determine which socket to use based on execution result
  const targetSocketId = (executionResult && executionResult.success) ? 'success' : 'failure'

  logger.info(`Routing execution node "${executionNode.data.label}" - Result: ${executionResult?.success ? 'SUCCESS' : 'FAILURE'}, Using socket: ${targetSocketId}`)

  const outputEdge = allEdges.find(edge =>
    edge.source === executionNode.id && edge.sourceHandle === targetSocketId
  )

  if (outputEdge) {
    const targetNode = allNodes.find(node => node.id === outputEdge.target)
    if (targetNode) {
      logger.info(`  → Found ${targetSocketId} socket connection to: ${targetNode.data.label} (${targetNode.data.nodeType})`)
      connectedNodes.push(targetNode)
    }
  }

  // NOTE: Output sockets are for data passing ONLY, not execution flow
  // They connect to input sockets to pass data, but don't trigger node execution
  // Only success/failure sockets control execution flow

  if (connectedNodes.length === 0) {
    logger.info(`  → No ${targetSocketId} socket connections found - execution stops here`)
  } else {
    logger.info(`  → Total nodes to trigger: ${connectedNodes.length}`)
  }

  return connectedNodes
}

/**
 * Handle conditional node execution flow
 */
function getConditionalConnectedNodes(conditionalNode, allNodes, allEdges, parameterValues = new Map()) {
  // Find input connections to get parameter values
  const inputConnections = allEdges.filter(edge => edge.target === conditionalNode.id)
  
  // Build parameter context for condition evaluation
  const parameterContext = {}
  
  if (conditionalNode.data.inputSockets) {
    conditionalNode.data.inputSockets.forEach(socket => {
      const connection = inputConnections.find(edge => edge.targetHandle === socket.id)
      if (connection) {
        // Get parameter value from the parameter map
        const paramData = parameterValues.get(connection.source)
        if (paramData) {
          parameterContext[socket.label] = paramData.value
        } else {
          // Fallback to placeholder if parameter not found
          parameterContext[socket.label] = `[${socket.label}]`
        }
      }
    })
  }
  
  // Evaluate the condition
  const condition = conditionalNode.data.condition || 'true'
  let conditionResult = false
  
  try {
    // Replace parameter placeholders with actual values
    let evaluableCondition = condition
    for (const [label, value] of Object.entries(parameterContext)) {
      // Handle both ${label} and $label formats
      const regexBraces = new RegExp(`\\$\\{${escapeRegex(label)}\\}`, 'g')
      const regexNoBraces = new RegExp(`\\$${escapeRegex(label)}\\b`, 'g')
      
      const jsonValue = JSON.stringify(value)
      evaluableCondition = evaluableCondition.replace(regexBraces, jsonValue)
      evaluableCondition = evaluableCondition.replace(regexNoBraces, jsonValue)
    }
    
    // Evaluate the condition using Function constructor (safer than eval)
    conditionResult = new Function('return ' + evaluableCondition)()
  } catch (error) {
    logger.error(`Conditional evaluation error in "${conditionalNode.data.label}":`, error)
    conditionResult = false
  }

  // Find the appropriate output edge based on condition result
  const targetSocketId = conditionResult ? 'true' : 'false'
  const outputEdge = allEdges.find(edge =>
    edge.source === conditionalNode.id && edge.sourceHandle === targetSocketId
  )

  if (outputEdge) {
    const targetNode = allNodes.find(node => node.id === outputEdge.target)
    return targetNode ? [targetNode] : []
  }

  logger.debug(`No output edge found for conditional "${conditionalNode.data.label}" ${targetSocketId} path`)
  return []
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Get target nodes connected to each branch socket of a parallel_branches node
 */
function getBranchTargetNodes(parallelNode, allNodes, allEdges) {
  const targets = []

  if (!parallelNode.data.branches || parallelNode.data.branches.length === 0) {
    logger.debug(`No branches defined for parallel node "${parallelNode.data.label}"`)
    return targets
  }

  for (const branch of parallelNode.data.branches) {
    logger.debug(`Processing branch: ${branch.name} (${branch.id})`)

    // Find edge connected to this branch socket
    const branchEdge = allEdges.find(edge =>
      edge.source === parallelNode.id && edge.sourceHandle === branch.id
    )

    if (branchEdge) {
      const targetNode = allNodes.find(n => n.id === branchEdge.target)
      logger.debug(`Target node found:`, targetNode?.data.label)

      if (targetNode) {
        targets.push({
          branchId: branch.id,
          branchName: branch.name,
          targetNode: targetNode
        })
      }
    } else {
      logger.debug(`No connection found for branch "${branch.name}" (${branch.id})`)
    }
  }

  logger.debug(`Found ${targets.length} branch targets for parallel node "${parallelNode.data.label}"`)
  return targets
}

/**
 * Get target node connected to iteration socket of a parallel_matrix node
 */
function getIterationTargetNode(matrixNode, allNodes, allEdges) {
  // Find edge connected to 'iteration' socket
  const iterationEdge = allEdges.find(edge =>
    edge.source === matrixNode.id && edge.sourceHandle === 'iteration'
  )

  if (iterationEdge) {
    const targetNode = allNodes.find(n => n.id === iterationEdge.target)
    if (targetNode) {
      logger.debug(`Found iteration target for matrix node "${matrixNode.data.label}": ${targetNode.data.label}`)
      return targetNode
    }
  }

  logger.debug(`No iteration target found for matrix node "${matrixNode.data.label}"`)
  return null
}