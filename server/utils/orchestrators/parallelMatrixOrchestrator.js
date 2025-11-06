/**
 * Enhanced Parallel Matrix Orchestrator (Jenkins-Style)
 *
 * This orchestrator implements Jenkins-style parallel execution patterns using socket-based value passing:
 * - Named executions with templates (e.g., "Build-${ITEM}")
 * - Socket-based value injection (item values and additional parameters flow through sockets)
 * - Minimal environment variables (BUILD_NUMBER and MATRIX_INDEX only)
 * - Enhanced logging and visibility
 *
 * Key features:
 * 1. generateExecutionName() - Creates descriptive names for each parallel execution
 * 2. resolveScriptPlaceholders() - Injects item/param values via socket mappings before execution
 * 3. Enhanced sub-job metadata with execution names
 * 4. Values flow through input/output sockets (not environment variables) for consistency with FlowForge patterns
 */

import { getAgentManager } from '../agentManager.js'
import { jobManager } from '../jobManager.js'
import { executionStateManager } from '../executionStateManager.js'
import { v4 as uuidv4 } from 'uuid'
import logger from '../logger.js'

/**
 * Generate a descriptive name for a matrix execution
 *
 * @param {string} template - Name template with placeholders
 * @param {number} index - Matrix iteration index
 * @param {any} item - The matrix item value
 * @returns {string} - Generated execution name
 *
 * @example
 * generateExecutionName("Build-${ITEM}", 0, "production")
 * // Returns: "Build-production"
 *
 * @example
 * generateExecutionName("Deploy-${ITEM_ENV}-${ITEM_REGION}", 1, {env: "prod", region: "us-east"})
 * // Returns: "Deploy-prod-us-east"
 */
function generateExecutionName(template, index, item) {
  if (!template) {
    return `Matrix-${index}`
  }

  let name = template

  // Replace ${INDEX}
  name = name.replace(/\$\{INDEX\}/g, String(index))

  // Replace ${ITEM} and ${ITEM_KEY}
  if (typeof item === 'object' && item !== null) {
    // For objects, ${ITEM} becomes JSON string
    name = name.replace(/\$\{ITEM\}/g, JSON.stringify(item))

    // Replace ${ITEM_KEY} for each object property
    for (const [key, value] of Object.entries(item)) {
      const placeholder = `\\$\\{ITEM_${key.toUpperCase()}\\}`
      const regex = new RegExp(placeholder, 'g')
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
      name = name.replace(regex, stringValue)
    }
  } else {
    // For primitives, ${ITEM} becomes string value
    name = name.replace(/\$\{ITEM\}/g, String(item))
  }

  return name
}

/**
 * Get nested property from object using dot notation
 * Supports: object.property, object[0], object.property[0].nested
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
 * Resolve script placeholders using socket mappings
 *
 * Supports:
 * - Simple values: $Input_1, ${Input_1}
 * - Object properties: $Input_1.property, ${Input_1.property.nested}
 * - Array access: $Input_1[0], ${Input_1[0].property}
 *
 * @param {string} script - The script with placeholders
 * @param {Object} socketMappings - Maps matrix outputs to target input sockets
 * @param {any} item - The current matrix item value
 * @param {Object|string} additionalParams - Additional parameters
 * @param {Object} iterationTarget - The target node being executed
 * @returns {string} - Script with placeholders resolved
 */
function resolveScriptPlaceholders(script, socketMappings, item, additionalParams, iterationTarget) {
  let resolvedScript = script
  // Get the target node's input sockets
  const inputSockets = iterationTarget.data.inputSockets || []
  // Build a map of socketId -> value
  const socketValues = {}
  // If item value socket is mapped, set its value
  if (socketMappings.itemValueSocket) {
    socketValues[socketMappings.itemValueSocket] = item
    const itemStr = typeof item === 'object' ? JSON.stringify(item) : String(item)
  }

  // If additional params socket is mapped, set its value
  if (socketMappings.additionalParamsSocket && additionalParams) {
    socketValues[socketMappings.additionalParamsSocket] = additionalParams
    const paramsStr = typeof additionalParams === 'string' ? additionalParams : JSON.stringify(additionalParams)
  }
  // Replace placeholders in the script
  // Handles both object and simple values with property access support
  for (const socket of inputSockets) {
    const socketValue = socketValues[socket.id]
    if (socketValue !== undefined) {
      // Handle socket label that may or may not start with $
      const cleanLabel = socket.label.startsWith('$') ? socket.label.substring(1) : socket.label
      
      // Escape special regex characters in the socket label for use in regex
      const escapedLabel = cleanLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Check if the value is an object
      const isObjectValue = typeof socketValue === 'object' && socketValue !== null

      if (isObjectValue) {
        // Handle property access patterns for objects with $ prefix
        // Pattern: $Input_1.property.path or $Input_1[0].property (without braces)
        const propertyAccessRegex = new RegExp(`\\$${escapedLabel}([.\\[][^\\s"']*?)(?=\\s|"|'|$)`, 'g')
        resolvedScript = resolvedScript.replace(propertyAccessRegex, (match, propertyPath) => {
          try {
            // Clean the path: remove leading dot if followed by bracket, or just remove leading dot
            let cleanPath = propertyPath
            if (cleanPath.startsWith('.[')) {
              cleanPath = cleanPath.substring(1) // Remove the dot before bracket
            } else if (cleanPath.startsWith('.')) {
              cleanPath = cleanPath.substring(1) // Remove leading dot
            }
            const value = getNestedProperty(socketValue, cleanPath)
            return value !== undefined ? String(value) : match
          } catch (error) {
            logger.warn(`Failed to access property ${propertyPath} on ${cleanLabel}:`, error)
            return match
          }
        })

        // Handle simple reference: $Input_1 (whole object as JSON)
        const simpleRegex = new RegExp(`\\$${escapedLabel}\\b`, 'g')
        resolvedScript = resolvedScript.replace(simpleRegex, JSON.stringify(socketValue))
      } else {
        // For simple values: $Input_1
        const simpleRegex = new RegExp(`\\$${escapedLabel}\\b`, 'g')
        resolvedScript = resolvedScript.replace(simpleRegex, String(socketValue))
      }
    }
  }
  return resolvedScript
}

/**
 * Execute parallel matrix orchestrator (Enhanced Jenkins-style version)
 *
 * @param {Object} orchestratorCommand - The orchestrator command configuration
 * @param {Object} parentJob - The parent job that spawned this orchestrator
 * @returns {Promise<Object>} - Result with success status and matrix results
 */
export async function executeParallelMatrix(orchestratorCommand, parentJob) {
  const {
    items,
    iterationTarget,
    socketMappings,
    maxConcurrency,
    failFast,
    continueOnError,
    nodeId,
    nodeLabel,
    nameTemplate,        // Template for execution names
    additionalParams     // Additional static parameters
  } = orchestratorCommand

  if (!iterationTarget) {
    logger.error(`❌ No iteration target found for matrix orchestrator ${nodeLabel}`)
    return {
      success: false,
      results: [],
      successCount: 0,
      failureCount: 0,
      message: 'No iteration target configured'
    }
  }

  if (items.length === 0) {
    logger.error(`❌  No items to iterate for matrix orchestrator ${nodeLabel}`)
    return {
      success: true,
      results: [],
      successCount: 0,
      failureCount: 0,
      message: 'No items to process'
    }
  }

  const agentManager = await getAgentManager()

  // Mark the iteration target node as executing (will show as running during all sub-jobs)
  if (parentJob.buildNumber && parentJob.projectId && iterationTarget.id) {
    executionStateManager.markNodeExecuting(
      parentJob.projectId,
      parentJob.buildNumber,
      iterationTarget.id,
      iterationTarget.data.label
    )
    logger.info(`Marked iteration target node "${iterationTarget.data.label}" as executing`)
  }

  // Create execution promises for each matrix item
  const matrixPromises = items.map(async (item, index) => {
    const itemStartTime = new Date().toISOString()

    try {
      // Generate descriptive execution name (Jenkins-style)
      const executionName = generateExecutionName(nameTemplate, index, item)
      // Convert item to string for logging
      const itemString = typeof item === 'object' ? JSON.stringify(item) : String(item)
      // Generate sub-job ID for this matrix iteration
      const subJobId = `${parentJob.jobId}_matrix_${index}_${uuidv4().split('-')[0]}`

      // Create sub-job record with execution name
      // NOTE: We do NOT set currentNodeId/currentNodeLabel because:
      // - Matrix sub-jobs should not mark individual nodes
      // - Only the parent matrix orchestrator node gets marked
      // - This prevents all sub-jobs from trying to mark the same iteration target node
      await jobManager.createJob({
        jobId: subJobId,
        projectId: parentJob.projectId,
        projectName: parentJob.projectName,
        parentJobId: parentJob.jobId,
        buildNumber: parentJob.buildNumber,
        status: 'queued',
        matrixIndex: index,
        matrixItem: item,
        executionName: executionName, // NEW: Store execution name
        nodes: [iterationTarget],
        edges: [],
        startTime: itemStartTime,
        createdAt: itemStartTime,
        output: []
        // currentNodeId: NOT SET - prevents execution state marking
        // currentNodeLabel: NOT SET - prevents execution state marking
      })

      // Convert target node to command
      const nodeType = iterationTarget.data.nodeType
      let command = null

      // Check if this is a parallel_execution node or regular execution node
      if (nodeType === 'parallel_execution') {
        command = {
          type: iterationTarget.data.executionType, // bash, powershell, cmd, python, node
          script: iterationTarget.data.script,
          workingDirectory: iterationTarget.data.workingDirectory || '.',
          timeout: iterationTarget.data.timeout ? iterationTarget.data.timeout * 1000 : 300000,
          nodeId: iterationTarget.id,
          nodeLabel: iterationTarget.data.label,
          requiredAgentId: iterationTarget.data.agentId,
          retryEnabled: iterationTarget.data.retryEnabled || false,
          maxRetries: iterationTarget.data.maxRetries || 3,
          retryDelay: iterationTarget.data.retryDelay || 5
        }
      } else if (['bash', 'powershell', 'cmd', 'python', 'node'].includes(nodeType)) {
        command = {
          type: nodeType,
          script: iterationTarget.data.script,
          workingDirectory: iterationTarget.data.workingDirectory || '.',
          timeout: iterationTarget.data.timeout ? iterationTarget.data.timeout * 1000 : 300000,
          nodeId: iterationTarget.id,
          nodeLabel: iterationTarget.data.label,
          requiredAgentId: iterationTarget.data.agentId,
          retryEnabled: iterationTarget.data.retryEnabled || false,
          maxRetries: iterationTarget.data.maxRetries || 3,
          retryDelay: iterationTarget.data.retryDelay || 5
        }
      } else {
        throw new Error(`Unsupported node type for matrix execution: ${nodeType}`)
      }

      if (!command.script) {
        throw new Error(`Matrix iteration target has no script to execute`)
      }

      // Resolve script placeholders using socket mappings
      const resolvedScript = resolveScriptPlaceholders(
        command.script,
        socketMappings,
        item,
        additionalParams,
        iterationTarget
      )
      command.script = resolvedScript

      // Prepare minimal environment variables (BUILD_NUMBER and MATRIX_INDEX only)
      const environment = {
        BUILD_NUMBER: String(parentJob.buildNumber),
        MATRIX_INDEX: String(index)
      }
      // Find appropriate agent for this matrix iteration
      const requiresSpecificAgent = command.requiredAgentId && command.requiredAgentId !== 'any'
      const agentRequirements = requiresSpecificAgent ? { agentId: command.requiredAgentId } : {}
      const selectedAgent = await agentManager.findAvailableAgent(agentRequirements)

      if (!selectedAgent) {
        const errorMsg = requiresSpecificAgent
          ? `Required agent "${command.requiredAgentId}" not available`
          : `No agents available`
        throw new Error(errorMsg)
      }
      // Dispatch job to agent
      const dispatchSuccess = await agentManager.dispatchJobToAgent(selectedAgent.agentId, {
        jobId: subJobId,
        projectId: parentJob.projectId,
        buildNumber: parentJob.buildNumber,
        commands: command.script,
        environment: environment,
        workingDirectory: command.workingDirectory,
        timeout: command.timeout,
        jobType: command.type,
        retryEnabled: command.retryEnabled,
        maxRetries: command.maxRetries,
        retryDelay: command.retryDelay,
        isMatrixIteration: true,
        matrixIndex: index,
        matrixItem: item,
        executionName: executionName, // NEW: Pass execution name
        parentJobId: parentJob.jobId
      })

      if (!dispatchSuccess) {
        throw new Error(`Failed to dispatch to agent ${selectedAgent.agentId}`)
      }

      // Update sub-job status
      await jobManager.updateJob(subJobId, {
        status: 'dispatched',
        agentId: selectedAgent.agentId,
        agentName: selectedAgent.name || selectedAgent.hostname
      })

      // Wait for job completion (event-driven, not polling)
      const result = await agentManager.waitForJobCompletion(subJobId)

      const statusIcon = result.success ? '✅' : '❌'
      const statusText = result.success ? 'Completed successfully' : `Failed (exit ${result.exitCode})`

      return {
        matrixIndex: index,
        matrixItem: item,
        executionName: executionName, // NEW: Include in result
        subJobId: subJobId,
        success: result.success,
        exitCode: result.exitCode,
        error: result.error,
        output: result.output
      }

    } catch (error) {
      const executionName = generateExecutionName(nameTemplate, index, item)
      logger.error(`❌ [${executionName}] Execution error: ${error.message}`)

      return {
        matrixIndex: index,
        matrixItem: item,
        executionName: executionName, // NEW: Include even on error
        subJobId: null,
        success: false,
        exitCode: 1,
        error: error.message,
        output: null
      }
    }
  })

  // Execute matrix iterations with concurrency control
  let results

  if (maxConcurrency && maxConcurrency > 0) {
    // Use concurrency limiting
    logger.info(`🔄 Executing matrix with max concurrency: ${maxConcurrency}`)

    // Simple concurrency control: execute in batches
    results = []
    const totalBatches = Math.ceil(matrixPromises.length / maxConcurrency)

    for (let i = 0; i < matrixPromises.length; i += maxConcurrency) {
      const batch = matrixPromises.slice(i, i + maxConcurrency)
      const batchNum = Math.floor(i / maxConcurrency) + 1
      const batchResults = await Promise.allSettled(batch)
      results.push(...batchResults)

      // Log batch summary
      const batchSuccesses = batchResults.filter(r =>
        r.status === 'fulfilled' && r.value && r.value.success
      ).length
      const batchFailures = batchResults.length - batchSuccesses
      logger.info(`📊 Batch ${batchNum} complete: ${batchSuccesses} succeeded, ${batchFailures} failed`)

      // Check for fail-fast
      if (failFast && !continueOnError) {
        const hasFailure = batchResults.some(r =>
          (r.status === 'fulfilled' && r.value && !r.value.success) ||
          r.status === 'rejected'
        )
        if (hasFailure) {
          logger.info(`🚨 Fail-fast triggered in batch ${batchNum} - stopping remaining batches`)
          break
        }
      }
    }
  } else {
    // Unlimited parallelism
    if (failFast && !continueOnError) {
      // Use Promise.race logic - abort on first failure
      results = await Promise.allSettled(matrixPromises)

      // Check for failures
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value && !result.value.success) {
          logger.info(`🚨 Fail-fast triggered: [${result.value.executionName}] failed`)
          break // Stop checking after first failure
        }
        if (result.status === 'rejected') {
          logger.info(`🚨 Fail-fast triggered: Matrix iteration threw error`)
          break
        }
      }
    } else {
      // Wait for all iterations regardless of failures (continueOnError = true)
      results = await Promise.allSettled(matrixPromises)
    }
  }

  // Analyze results
  let successCount = 0
  let failureCount = 0
  const matrixResults = []

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      matrixResults.push(result.value)
      if (result.value.success) {
        successCount++
      } else {
        failureCount++
      }
    } else if (result.status === 'rejected') {
      failureCount++
      matrixResults.push({
        matrixIndex: -1,
        matrixItem: null,
        executionName: 'Unknown',
        subJobId: null,
        success: false,
        exitCode: 1,
        error: result.reason?.message || 'Matrix iteration rejected',
        output: null
      })
    }
  }

  const allSucceeded = failureCount === 0
  const resultIcon = allSucceeded ? '✅' : '⚠️'

  logger.info(`${resultIcon} Parallel matrix complete: ${successCount} succeeded, ${failureCount} failed`)

  // Mark the iteration target node as completed or failed
  if (parentJob.buildNumber && parentJob.projectId && iterationTarget.id) {
    if (allSucceeded) {
      executionStateManager.markNodeCompleted(
        parentJob.projectId,
        parentJob.buildNumber,
        iterationTarget.id
      )
      logger.info(`Marked iteration target node "${iterationTarget.data.label}" as completed`)
    } else {
      executionStateManager.markNodeFailed(
        parentJob.projectId,
        parentJob.buildNumber,
        iterationTarget.id
      )
      logger.info(`Marked iteration target node "${iterationTarget.data.label}" as failed`)
    }
  }

  return {
    success: allSucceeded,
    results: matrixResults,
    successCount: successCount,
    failureCount: failureCount,
    message: allSucceeded
      ? `All ${successCount} matrix iterations completed successfully`
      : `${failureCount} of ${matrixResults.length} matrix iterations failed`
  }
}
