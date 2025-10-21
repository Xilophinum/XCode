/**
 * Parallel Matrix Orchestrator
 *
 * Executes the same job multiple times in parallel with different parameter values.
 * The JavaScript script generates an array of items, and each item is passed to the
 * iteration target node as an environment variable.
 *
 * Supports:
 * - Max concurrency limiting
 * - Fail-fast behavior (stop all on first failure)
 * - Continue on error (collect all results even if some fail)
 * - Sub-job tracking
 */

import { getAgentManager } from '../agentManager.js'
import { jobManager } from '../jobManager.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * Execute parallel matrix orchestrator
 *
 * @param {Object} orchestratorCommand - The orchestrator command configuration
 * @param {Object} parentJob - The parent job that spawned this orchestrator
 * @returns {Promise<Object>} - Result with success status and matrix results
 */
export async function executeParallelMatrix(orchestratorCommand, parentJob) {
  const {
    items,
    itemVariableName,
    iterationTarget,
    maxConcurrency,
    failFast,
    continueOnError,
    nodeId,
    nodeLabel
  } = orchestratorCommand

  console.log(`🔀 Starting parallel matrix orchestrator: ${nodeLabel}`)
  console.log(`📊 Matrix items: ${items.length}, Variable: ${itemVariableName}, Max Concurrency: ${maxConcurrency || 'unlimited'}, Fail Fast: ${failFast}, Continue on Error: ${continueOnError}`)

  if (!iterationTarget) {
    console.error(`❌ No iteration target found for matrix orchestrator ${nodeLabel}`)
    return {
      success: false,
      results: [],
      successCount: 0,
      failureCount: 0,
      message: 'No iteration target configured'
    }
  }

  if (items.length === 0) {
    console.log(`⚠️  No items to iterate for matrix orchestrator ${nodeLabel}`)
    return {
      success: true,
      results: [],
      successCount: 0,
      failureCount: 0,
      message: 'No items to process'
    }
  }

  const agentManager = await getAgentManager()

  // Create execution promises for each matrix item
  const matrixPromises = items.map(async (item, index) => {
    const itemStartTime = new Date().toISOString()

    try {
      // Convert item to string for logging
      const itemString = typeof item === 'object' ? JSON.stringify(item) : String(item)
      console.log(`🔢 Matrix[${index}]: Starting execution with ${itemVariableName}=${itemString}`)

      // Generate sub-job ID for this matrix iteration
      const subJobId = `${parentJob.jobId}_matrix_${index}_${uuidv4().split('-')[0]}`

      // Create sub-job record
      await jobManager.createJob({
        jobId: subJobId,
        projectId: parentJob.projectId,
        projectName: parentJob.projectName,
        parentJobId: parentJob.jobId,
        buildNumber: parentJob.buildNumber,
        status: 'queued',
        matrixIndex: index,
        matrixItem: item,
        nodes: [iterationTarget],
        edges: [],
        startTime: itemStartTime,
        createdAt: itemStartTime,
        output: [],
        currentNodeId: iterationTarget.id,
        currentNodeLabel: iterationTarget.data.label
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

      // Prepare environment with matrix item variable
      const environment = {}

      if (typeof item === 'object') {
        // If item is an object, pass it as JSON string
        environment[itemVariableName] = JSON.stringify(item)

        // Also pass individual properties as separate variables (flatten one level)
        for (const [key, value] of Object.entries(item)) {
          const envVarName = `${itemVariableName}_${key.toUpperCase()}`
          environment[envVarName] = typeof value === 'object' ? JSON.stringify(value) : String(value)
        }
      } else {
        // Simple value - pass as string
        environment[itemVariableName] = String(item)
      }

      // Find appropriate agent for this matrix iteration
      const requiresSpecificAgent = command.requiredAgentId && command.requiredAgentId !== 'any'
      const agentRequirements = requiresSpecificAgent ? { agentId: command.requiredAgentId } : {}
      const selectedAgent = await agentManager.findAvailableAgent(agentRequirements)

      if (!selectedAgent) {
        const errorMsg = requiresSpecificAgent
          ? `Required agent "${command.requiredAgentId}" not available for matrix[${index}]`
          : `No agents available for matrix[${index}]`
        throw new Error(errorMsg)
      }

      console.log(`🎯 Matrix[${index}]: Dispatching to agent ${selectedAgent.agentId}`)

      // Dispatch job to agent
      const dispatchSuccess = await agentManager.dispatchJobToAgent(selectedAgent.agentId, {
        jobId: subJobId,
        projectId: parentJob.projectId,
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
        parentJobId: parentJob.jobId
      })

      if (!dispatchSuccess) {
        throw new Error(`Failed to dispatch matrix[${index}] to agent ${selectedAgent.agentId}`)
      }

      // Update sub-job status
      await jobManager.updateJob(subJobId, {
        status: 'dispatched',
        agentId: selectedAgent.agentId,
        agentName: selectedAgent.name || selectedAgent.hostname
      })

      console.log(`✅ Matrix[${index}]: Dispatched successfully, waiting for completion...`)

      // Wait for job completion (event-driven, not polling)
      const result = await agentManager.waitForJobCompletion(subJobId)

      console.log(`${result.success ? '✅' : '❌'} Matrix[${index}]: ${result.success ? 'Completed successfully' : 'Failed'}`)

      return {
        matrixIndex: index,
        matrixItem: item,
        subJobId: subJobId,
        success: result.success,
        exitCode: result.exitCode,
        error: result.error,
        output: result.output
      }

    } catch (error) {
      console.error(`❌ Matrix[${index}]: Execution error:`, error.message)

      return {
        matrixIndex: index,
        matrixItem: item,
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
    console.log(`🔄 Executing matrix with max concurrency: ${maxConcurrency}`)

    // Simple concurrency control: execute in batches
    results = []
    for (let i = 0; i < matrixPromises.length; i += maxConcurrency) {
      const batch = matrixPromises.slice(i, i + maxConcurrency)
      console.log(`📦 Executing batch ${Math.floor(i / maxConcurrency) + 1} (${batch.length} iterations)`)
      const batchResults = await Promise.allSettled(batch)
      results.push(...batchResults)

      // Check for fail-fast
      if (failFast && !continueOnError) {
        const hasFailure = batchResults.some(r =>
          (r.status === 'fulfilled' && r.value && !r.value.success) ||
          r.status === 'rejected'
        )
        if (hasFailure) {
          console.log(`🚨 Fail-fast triggered in batch ${Math.floor(i / maxConcurrency) + 1}`)
          break
        }
      }
    }
  } else {
    // Unlimited parallelism
    console.log(`🚀 Executing all ${matrixPromises.length} matrix iterations in parallel (unlimited concurrency)`)

    if (failFast && !continueOnError) {
      // Use Promise.race logic - abort on first failure
      results = await Promise.allSettled(matrixPromises)

      // Check for failures
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value && !result.value.success) {
          console.log(`🚨 Fail-fast triggered: Matrix[${result.value.matrixIndex}] failed`)
          break // Stop checking after first failure
        }
        if (result.status === 'rejected') {
          console.log(`🚨 Fail-fast triggered: Matrix iteration threw error`)
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
        subJobId: null,
        success: false,
        exitCode: 1,
        error: result.reason?.message || 'Matrix iteration rejected',
        output: null
      })
    }
  }

  const allSucceeded = failureCount === 0

  console.log(`${allSucceeded ? '✅' : '⚠️'} Parallel matrix complete: ${successCount} succeeded, ${failureCount} failed`)

  // Log individual matrix results (first 10 for brevity)
  const resultsToLog = matrixResults.slice(0, 10)
  for (const result of resultsToLog) {
    const icon = result.success ? '✅' : '❌'
    const itemStr = typeof result.matrixItem === 'object' ? JSON.stringify(result.matrixItem) : String(result.matrixItem)
    console.log(`  ${icon} Matrix[${result.matrixIndex}] (${itemStr}): ${result.success ? 'Success' : `Failed - ${result.error}`}`)
  }
  if (matrixResults.length > 10) {
    console.log(`  ... and ${matrixResults.length - 10} more results`)
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
