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

export default defineEventHandler(async (event) => {
  let currentBuildNumber = null
  let projectId = null
  
  try {
    const body = await readBody(event)
    const { projectId: bodyProjectId, nodes, edges, startTime } = body
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

    console.log(`🔍 Execute API: Looking for available agent...`)
    
    // Find an available agent for this job
    const availableAgent = await agentManager.findAvailableAgent()
    
    if (!availableAgent) {
      console.log(`❌ No agents available - connectedAgents size: ${agentManager.connectedAgents.size}, agentData size: ${agentManager.agentData.size}`)
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
      executionCommands = convertGraphToCommands(nodes, edges, null, body.executionOutputs)
      console.log(`🔧 Generated ${executionCommands.length} commands`)
    } catch (error) {
      console.error('❌ Error converting graph to commands:', error.message)
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    // Filter to get only executable commands (including orchestrator commands)
    const executableCommands = executionCommands.filter(cmd =>
      ['bash', 'powershell', 'cmd', 'python', 'node', 'parallel_branches_orchestrator', 'parallel_matrix_orchestrator'].includes(cmd.type)
    )

    if (executableCommands.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No executable commands found in graph. Please add at least one executable node (bash, powershell, cmd, python, or node).'
      })
    }

    // Validate that all executable commands have agent selection
    const missingAgentCommands = executableCommands.filter(cmd =>
      !['parallel_branches_orchestrator', 'parallel_matrix_orchestrator'].includes(cmd.type) &&
      (!cmd.requiredAgentId || cmd.requiredAgentId === '')
    )

    if (missingAgentCommands.length > 0) {
      const errorMsg = `Execution blocked: The following nodes require agent selection: ${missingAgentCommands.map(cmd => `"${cmd.nodeLabel}"`).join(', ')}. Agent selection is mandatory for all executable nodes.`
      console.error(`🚨 ${errorMsg}`)
      throw createError({
        statusCode: 400,
        statusMessage: errorMsg
      })
    }

    // Start build recording AFTER validation
    let currentProjectName = project.name
    
    const buildStatsManager = await getBuildStatsManager()
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
    console.log(`✅ Build #${currentBuildNumber} started for manual execution of "${project.name}"`)

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
      currentNodeLabel: null
    }

    // Store job in job manager
    await jobManager.createJob(job)

    // Resolve credentials and inject as environment variables
    const credentialResolver = await getCredentialResolver()
    const baseEnv = process.env
    const resolvedEnv = await credentialResolver.resolveCredentials(nodes, baseEnv)
    
    console.log(`🔐 Resolved ${Object.keys(resolvedEnv).length - Object.keys(baseEnv).length} credential environment variables`)
    
    // Store credential resolver in job for log masking
    job.credentialResolver = credentialResolver

    console.log(`🎯 Executing ${executableCommands.length} commands sequentially:`, executableCommands.map(cmd => ({
      type: cmd.type,
      label: cmd.nodeLabel,
      requiredAgent: cmd.requiredAgentId || 'any',
      scriptLength: cmd.script?.length || 0
    })))

    // Store all commands in the job for sequential execution
    job.executionCommands = executableCommands
    job.currentCommandIndex = 0

    // Build recording already done above (currentBuildId already set)

    // Start with the first command
    const firstCommand = executableCommands[0]
    console.log(`🚀 Starting sequential execution with command 1/${executableCommands.length}: ${firstCommand.nodeLabel}`)
    
    // Check if first command is an orchestrator
    if (firstCommand.type === 'parallel_branches_orchestrator') {
      console.log(`🔀 First command is parallel branches orchestrator - executing directly`)
      
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
      console.log(`🔀 First command is parallel matrix orchestrator - executing directly`)
      
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
    
    // Find agent for regular execution commands
    const requiresSpecificAgent = firstCommand.requiredAgentId && firstCommand.requiredAgentId !== 'any'
    const agentRequirements = requiresSpecificAgent ? { agentId: firstCommand.requiredAgentId } : {}
    const selectedAgent = await agentManager.findAvailableAgent(agentRequirements)
    
    if (!selectedAgent) {
      const errorMsg = requiresSpecificAgent
        ? `🚨 CRITICAL: Required agent "${firstCommand.requiredAgentId}" not available for command: ${firstCommand.nodeLabel}. Execution BLOCKED to prevent running on wrong environment.`
        : 'No agents available for job execution'
      
      console.error(errorMsg)
      throw createError({
        statusCode: 503,
        statusMessage: errorMsg
      })
    }
    
    if (requiresSpecificAgent) {
      console.log(`🔒 ENFORCING agent selection: ${selectedAgent.agentId} for command: ${firstCommand.nodeLabel}`)
    } else {
      console.log(`🎯 Selected agent ${selectedAgent.agentId} for first command: ${firstCommand.nodeLabel} (user chose "any available")`)
    }

    // Build recording already done above

    const dispatchSuccess = await agentManager.dispatchJobToAgent(selectedAgent.agentId, {
      jobId,
      projectId,
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

    if (!dispatchSuccess) {
      // Failed to dispatch, clean up job
      await jobManager.deleteJob(jobId)

      // Update build record with failure if build was started
      if (currentBuildNumber) {
        try {
          const buildStatsManager = await getBuildStatsManager()
          await buildStatsManager.finishBuild(projectId, currentBuildNumber, {
            status: 'failure',
            message: 'Failed to dispatch job to agent',
            nodesExecuted: 0
          })
        } catch (buildError) {
          console.warn('Failed to update build record on dispatch failure:', buildError)
        }
      }

      throw createError({
        statusCode: 503,
        statusMessage: 'Failed to dispatch job to agent'
      })
    }

    // Update job status to dispatched and store execution commands with buildNumber
    await jobManager.updateJob(jobId, {
      status: 'dispatched',
      agentId: selectedAgent.agentId,
      agentName: selectedAgent.name || selectedAgent.hostname,
      executionCommands: executableCommands,
      currentCommandIndex: 0,
      buildNumber: currentBuildNumber
    })

    console.log(`✅ Job ${jobId} dispatched to agent ${selectedAgent.agentId}${currentBuildNumber ? ` (build #${currentBuildNumber})` : ''}`)

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
    console.error('❌ Error dispatching job:', error)
    
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
        console.warn('Failed to update build record on error:', buildError)
      }
    }
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to execute project'
    })
  }
})

/**
 * Determine platform requirements for a command
 */
function getCommandPlatformRequirements(command) {
  const platform = {
    windows: false,
    linux: false,
    macos: false
  }

  switch (command.type) {
    case 'powershell':
      // PowerShell is primarily Windows, but can run on Linux/macOS with PowerShell Core
      platform.windows = true
      platform.linux = true  // PowerShell Core support
      platform.macos = true  // PowerShell Core support
      break
    
    case 'cmd':
      // CMD is Windows-only
      platform.windows = true
      break
    
    case 'bash':
      // Bash is primarily Linux/macOS, but available on Windows via WSL/Git Bash
      platform.linux = true
      platform.macos = true
      platform.windows = true  // WSL/Git Bash support
      break
    
    case 'python':
    case 'node':
      // Python and Node.js are cross-platform
      platform.windows = true
      platform.linux = true
      platform.macos = true
      break
    
    default:
      // Unknown command type - assume cross-platform
      platform.windows = true
      platform.linux = true
      platform.macos = true
  }

  return platform
}

/**
 * Convert Vue Flow graph to executable commands for the agent
 * This function analyzes the graph and compiles it into a sequence of executable commands,
 * resolving parameter values and skipping non-executable nodes.
 */
export function convertGraphToCommands(nodes, edges, triggerContext = null, executionOutputs = null) {
  console.log(`🔧 Converting graph to commands...`)
  console.log(`📊 Graph has ${nodes.length} nodes and ${edges.length} edges`)

  // Step 1: Build parameter value map from parameter nodes + trigger context + execution outputs
  const parameterValues = buildParameterValueMap(nodes, edges, triggerContext, executionOutputs)
  console.log(`📋 Built parameter value map:`, parameterValues)

  // Step 2: Find executable starting points (trigger nodes or nodes without execution inputs)
  const startingNodes = findExecutionStartingNodes(nodes, edges)
  console.log(`🎯 Found ${startingNodes.length} starting nodes:`, startingNodes.map(n => n.data.label))

  if (startingNodes.length === 0) {
    throw new Error('No executable nodes found in graph. Please add at least one executable node (bash, powershell, cmd, python, or node) to create a workflow.')
  }

  // Step 3: Build execution flow from starting nodes
  const commands = []
  const visited = new Set()

  for (const startNode of startingNodes) {
    const nodeCommands = buildExecutionFlow(startNode, nodes, edges, parameterValues, visited)
    commands.push(...nodeCommands)
  }

  console.log(`✅ Generated ${commands.length} executable commands`)
  return commands
}

/**
 * Build a map of parameter values from parameter nodes + webhook/trigger context
 */
function buildParameterValueMap(nodes, edges, triggerContext = null, executionOutputs = null) {
  const parameterValues = new Map()
  
  // Add execution outputs if provided
  if (executionOutputs && executionOutputs instanceof Map) {
    for (const [key, value] of executionOutputs) {
      parameterValues.set(key, value)
      console.log(`📤 Added execution output: ${key} = ${value.value}`)
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

    // Check if this node has incoming execution connections
    const hasIncomingExecutionConnections = edges.some(edge => 
      edge.target === node.id && (edge.targetHandle === 'execution' || !edge.targetHandle)
    )

    // Trigger nodes and nodes without execution inputs can start execution
    return !hasIncomingExecutionConnections && 
           (node.data.hasExecutionInput === false || !node.data.hasExecutionInput)
  })

  // If no starting nodes found (manual execution without triggers), find the first executable node
  if (startingNodes.length === 0) {
    // Prioritize orchestrator nodes first (parallel_branches, parallel_matrix)
    const orchestratorNodes = nodes.filter(node => 
      ['parallel_branches', 'parallel_matrix'].includes(node.data.nodeType)
    )
    
    if (orchestratorNodes.length > 0) {
      console.log(`🎯 No trigger nodes found - using orchestrator node for manual execution: ${orchestratorNodes[0].data.label}`)
      return [orchestratorNodes[0]]
    }
    
    // Fallback to regular execution nodes
    const executableNodes = nodes.filter(node => 
      ['bash', 'powershell', 'cmd', 'python', 'node', 'parallel_execution'].includes(node.data.nodeType)
    )
    
    if (executableNodes.length > 0) {
      console.log(`🎯 No trigger nodes found - using first executable node for manual execution: ${executableNodes[0].data.label}`)
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
      console.log(`🔀 Parallel Branches node: ${node.data.label}`)

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
      console.log(`🔀 Parallel Matrix node: ${node.data.label}`)

      // Evaluate JavaScript to generate array
      let items = []
      try {
        const evalFunction = new Function(node.data.script)
        items = evalFunction()

        if (!Array.isArray(items)) {
          throw new Error('Script must return an array')
        }
        console.log(`✅ Matrix generated ${items.length} items:`, items)
      } catch (error) {
        console.error(`❌ Failed to evaluate parallel_matrix script:`, error)
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
      console.log(`⏭️ Skipping trigger node during execution: ${node.data.label}`)
      break

    // Parameter nodes are handled separately in parameter resolution
    case 'string-param':
    case 'text-param':
    case 'choice-param':
    case 'boolean-param':
      console.log(`⏭️ Skipping parameter node during execution: ${node.data.label}`)
      break

    case 'conditional':
      // Conditional nodes are handled during execution flow, not as commands
      console.log(`🔀 Conditional node found: ${node.data.label}`)
      break

    case 'parallel':
    case 'retry':
    case 'notification':
      // Control nodes - for now just log them
      // TODO: Implement proper control flow logic
      commands.push({
        type: 'log',
        message: `Control node: ${node.data.label} (${nodeType})`,
        nodeId: node.id,
        nodeLabel: node.data.label
      })
      break

    default:
      console.log(`⚠️ Unknown node type during execution: ${nodeType} (${node.data.label})`)
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
      console.log(`🔧 Processing socket: ${socket.label} (id: ${socket.id})`)
      
      // Find the edge connected to this socket
      const connection = inputConnections.find(edge => edge.targetHandle === socket.id)
      console.log(`🔧 Connection found for socket ${socket.label}:`, connection)
      
      if (connection) {
        // Check if the source is a parameter node
        let parameterData = parameterValues.get(connection.source)
        console.log(`🔧 Parameter data from source ${connection.source}:`, parameterData)
        
        // If not found, check if it's a webhook output socket connection
        if (!parameterData && connection.sourceHandle) {
          const webhookSocketKey = `${connection.source}_${connection.sourceHandle}`
          console.log(`🔧 Trying webhook socket key: ${webhookSocketKey}`)
          parameterData = parameterValues.get(webhookSocketKey)
          console.log(`🔧 Webhook parameter data:`, parameterData)
        }
        
        // If still not found, check if it's an execution output connection
        if (!parameterData && connection.sourceHandle === 'output') {
          const executionOutputKey = `${connection.target}_${connection.targetHandle}`
          parameterData = parameterValues.get(executionOutputKey)
          if (parameterData) {
            console.log(`🔧 Execution output data:`, parameterData)
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
            console.log(`🔧 Processing object value for ${cleanLabel}:`, parameterData.value)
            
            // Handle property access patterns FIRST, including patterns outside ${} like $INPUT_1.property
            // Pattern 1: ${INPUT_1.property.path} (preferred format)
            const propertyAccessRegex1 = new RegExp(`\\$\\{\\$?${escapedLabel}\\.(.*?)\\}`, 'g')
            script = script.replace(propertyAccessRegex1, (match, propertyPath) => {
              try {
                const value = getNestedProperty(parameterData.value, propertyPath)
                console.log(`🔗 Resolved ${match} -> ${value}`)
                return value !== undefined ? String(value) : match
              } catch (error) {
                console.warn(`⚠️ Failed to access property ${propertyPath} on ${cleanLabel}:`, error)
                return match
              }
            })
            
            // Pattern 2: $INPUT_1.property.path (without braces - fallback)
            const propertyAccessRegex2 = new RegExp(`\\$${escapedLabel}\\.(\\S+?)(?=\\s|"|'|$)`, 'g')
            script = script.replace(propertyAccessRegex2, (match, propertyPath) => {
              try {
                const value = getNestedProperty(parameterData.value, propertyPath)
                console.log(`🔗 Resolved ${match} -> ${value} (propertyPath: ${propertyPath})`)
                return value !== undefined ? String(value) : match
              } catch (error) {
                console.warn(`⚠️ Failed to access property ${propertyPath} on ${cleanLabel}:`, error)
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
          
          console.log(`🔗 Resolved parameter "${parameterData.label}" for socket "${socket.label}" (object: ${isObjectValue})`)
        }
      } else {
        console.log(`⚠️ No connection found for socket "${socket.label}"`)
      }
    })
  }

  console.log(`🔧 Final script: "${script}"`)
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
  if (sourceNode && ['bash', 'powershell', 'cmd', 'python', 'node', 'parallel_branches'].includes(sourceNode.data.nodeType)) {
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
  
  console.log(`🔍 Looking for ${targetSocketId} socket from node "${executionNode.data.label}" (${executionNode.data.nodeType})`)
  
  const outputEdge = allEdges.find(edge => 
    edge.source === executionNode.id && edge.sourceHandle === targetSocketId
  )
  
  if (outputEdge) {
    const targetNode = allNodes.find(node => node.id === outputEdge.target)
    console.log(`🔀 Execution "${executionNode.data.label}" routing to ${targetSocketId} path: ${targetNode?.data.label || 'unknown'}`)
    if (targetNode) {
      connectedNodes.push(targetNode)
    }
  }
  
  // Also check for output socket connections (these should receive the execution output)
  if (executionResult && executionResult.output) {
    const outputSocketEdge = allEdges.find(edge => 
      edge.source === executionNode.id && edge.sourceHandle === 'output'
    )
    
    if (outputSocketEdge) {
      const outputTargetNode = allNodes.find(node => node.id === outputSocketEdge.target)
      console.log(`📤 Execution "${executionNode.data.label}" sending output to: ${outputTargetNode?.data.label || 'unknown'}`)
      if (outputTargetNode && !connectedNodes.find(n => n.id === outputTargetNode.id)) {
        connectedNodes.push(outputTargetNode)
      }
    }
  }
  
  if (connectedNodes.length === 0) {
    console.log(`⚠️ No output edges found for execution "${executionNode.data.label}" ${targetSocketId} path`)
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
    console.log(`🔀 Conditional "${conditionalNode.data.label}" evaluated: ${condition} -> ${conditionResult}`)
  } catch (error) {
    console.error(`❌ Conditional evaluation error in "${conditionalNode.data.label}":`, error)
    console.error(`❌ Condition: ${condition}`)
    console.error(`❌ Parameter context:`, parameterContext)
    conditionResult = false
  }
  
  // Find the appropriate output edge based on condition result
  const targetSocketId = conditionResult ? 'true' : 'false'
  const outputEdge = allEdges.find(edge => 
    edge.source === conditionalNode.id && edge.sourceHandle === targetSocketId
  )
  
  if (outputEdge) {
    const targetNode = allNodes.find(node => node.id === outputEdge.target)
    console.log(`🔀 Conditional "${conditionalNode.data.label}" routing to ${targetSocketId} path: ${targetNode?.data.label || 'unknown'}`)
    return targetNode ? [targetNode] : []
  }
  
  console.log(`⚠️ No output edge found for conditional "${conditionalNode.data.label}" ${targetSocketId} path`)
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
  
  console.log(`🔍 getBranchTargetNodes: Processing parallel node "${parallelNode.data.label}"`)
  console.log(`🔍 Available branches:`, parallelNode.data.branches)

  if (!parallelNode.data.branches || parallelNode.data.branches.length === 0) {
    console.log(`⚠️ No branches defined for parallel node "${parallelNode.data.label}"`)
    return targets
  }

  for (const branch of parallelNode.data.branches) {
    console.log(`🔍 Processing branch: ${branch.name} (${branch.id})`)
    
    // Find edge connected to this branch socket
    const branchEdge = allEdges.find(edge =>
      edge.source === parallelNode.id && edge.sourceHandle === branch.id
    )

    if (branchEdge) {
      const targetNode = allNodes.find(n => n.id === branchEdge.target)
      console.log(`🔍 Target node found:`, targetNode?.data.label)
      
      if (targetNode) {
        targets.push({
          branchId: branch.id,
          branchName: branch.name,
          targetNode: targetNode
        })
      }
    } else {
      console.log(`⚠️ No connection found for branch "${branch.name}" (${branch.id})`)
    }
  }

  console.log(`🔀 Found ${targets.length} branch targets for parallel node "${parallelNode.data.label}"`)
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
      console.log(`🔀 Found iteration target for matrix node "${matrixNode.data.label}": ${targetNode.data.label}`)
      return targetNode
    }
  }

  console.log(`⚠️ No iteration target found for matrix node "${matrixNode.data.label}"`)
  return null
}