/**
 * Parallel Branches Orchestrator
 *
 * Executes multiple branches in parallel, each branch executing its target node on an agent.
 * Supports:
 * - Max concurrency limiting
 * - Fail-fast behavior (stop all on first failure)
 * - Sub-job tracking
 */

import { getAgentManager } from '../agentManager.js'
import { jobManager } from '../jobManager.js'
import { v4 as uuidv4 } from 'uuid'
import logger from '../logger.js'

/**
 * Execute parallel branches orchestrator
 *
 * @param {Object} orchestratorCommand - The orchestrator command configuration
 * @param {Object} parentJob - The parent job that spawned this orchestrator
 * @returns {Promise<Object>} - Result with success status and branch results
 */
export async function executeParallelBranches(orchestratorCommand, parentJob) {
  const {
    branches,
    branchTargets,
    maxConcurrency,
    failFast,
    nodeId,
    nodeLabel
  } = orchestratorCommand

  logger.info(`Starting parallel branches orchestrator: ${nodeLabel}`)
  logger.info(`Branches: ${branches?.length || 0}, Targets: ${branchTargets?.length || 0}, Max Concurrency: ${maxConcurrency || 'unlimited'}, Fail Fast: ${failFast}`)
  logger.info(`Branch details:`, branches)
  logger.info(`Branch targets:`, branchTargets)

  if (branchTargets.length === 0) {
    logger.warn(`No branch targets found for orchestrator ${nodeLabel}`)
    return {
      success: true,
      results: [],
      successCount: 0,
      failureCount: 0,
      message: 'No branches to execute'
    }
  }

  const agentManager = await getAgentManager()

  // Create execution promises for each branch
  const branchPromises = branchTargets.map(async (target) => {
    const branchStartTime = new Date().toISOString()

    try {
      logger.info(`Branch "${target.branchName}": Starting execution of target node: ${target.targetNode.data.label}`)

      // Generate sub-job ID for this branch
      const subJobId = `${parentJob.jobId}_branch_${target.branchId}_${uuidv4().split('-')[0]}`

      // Create sub-job record with parent's buildNumber
      await jobManager.createJob({
        jobId: subJobId,
        projectId: parentJob.projectId,
        projectName: parentJob.projectName,
        parentJobId: parentJob.jobId,
        buildNumber: parentJob.buildNumber,
        status: 'queued',
        branchId: target.branchId,
        branchName: target.branchName,
        nodes: [target.targetNode],
        edges: [],
        startTime: branchStartTime,
        createdAt: branchStartTime,
        output: [],
        currentNodeId: target.targetNode.id,
        currentNodeLabel: target.targetNode.data.label
      })

      // Convert target node to command
      const nodeType = target.targetNode.data.nodeType
      let command = null

      // Check if this is a parallel_execution node or regular execution node
      if (nodeType === 'parallel_execution') {
        command = {
          type: target.targetNode.data.executionType, // bash, powershell, cmd, python, node
          script: target.targetNode.data.script,
          workingDirectory: target.targetNode.data.workingDirectory || '.',
          timeout: target.targetNode.data.timeout ? target.targetNode.data.timeout * 1000 : 300000,
          nodeId: target.targetNode.id,
          nodeLabel: target.targetNode.data.label,
          requiredAgentId: target.targetNode.data.agentId,
          retryEnabled: target.targetNode.data.retryEnabled || false,
          maxRetries: target.targetNode.data.maxRetries || 3,
          retryDelay: target.targetNode.data.retryDelay || 5
        }
      } else if (['bash', 'powershell', 'cmd', 'python', 'node'].includes(nodeType)) {
        command = {
          type: nodeType,
          script: target.targetNode.data.script,
          workingDirectory: target.targetNode.data.workingDirectory || '.',
          timeout: target.targetNode.data.timeout ? target.targetNode.data.timeout * 1000 : 300000,
          nodeId: target.targetNode.id,
          nodeLabel: target.targetNode.data.label,
          requiredAgentId: target.targetNode.data.agentId,
          retryEnabled: target.targetNode.data.retryEnabled || false,
          maxRetries: target.targetNode.data.maxRetries || 3,
          retryDelay: target.targetNode.data.retryDelay || 5
        }
      } else {
        throw new Error(`Unsupported node type for parallel execution: ${nodeType}`)
      }

      if (!command.script) {
        throw new Error(`Branch "${target.branchName}" has no script to execute`)
      }

      // Find appropriate agent for this branch
      const requiresSpecificAgent = command.requiredAgentId && command.requiredAgentId !== 'any'
      const agentRequirements = requiresSpecificAgent ? { agentId: command.requiredAgentId } : {}
      const selectedAgent = await agentManager.findAvailableAgent(agentRequirements)

      if (!selectedAgent) {
        const errorMsg = requiresSpecificAgent
          ? `Required agent "${command.requiredAgentId}" not available for branch "${target.branchName}"`
          : `No agents available for branch "${target.branchName}"`
        throw new Error(errorMsg)
      }

      logger.info(`Branch "${target.branchName}": Dispatching to agent ${selectedAgent.agentId}`)

      // Dispatch job to agent
      const dispatchSuccess = await agentManager.dispatchJobToAgent(selectedAgent.agentId, {
        jobId: subJobId,
        projectId: parentJob.projectId,
        commands: command.script,
        environment: {},
        workingDirectory: command.workingDirectory,
        timeout: command.timeout,
        jobType: command.type,
        retryEnabled: command.retryEnabled,
        maxRetries: command.maxRetries,
        retryDelay: command.retryDelay,
        isParallelBranch: true,
        branchId: target.branchId,
        branchName: target.branchName,
        parentJobId: parentJob.jobId
      })

      if (!dispatchSuccess) {
        throw new Error(`Failed to dispatch branch "${target.branchName}" to agent ${selectedAgent.agentId}`)
      }

      // Update sub-job status
      await jobManager.updateJob(subJobId, {
        status: 'dispatched',
        agentId: selectedAgent.agentId,
        agentName: selectedAgent.name || selectedAgent.hostname
      })

      logger.info(`Branch "${target.branchName}": Dispatched successfully, waiting for completion...`)

      // Wait for job completion (event-driven, not polling)
      const result = await agentManager.waitForJobCompletion(subJobId)

      logger.info(`Branch "${target.branchName}": ${result.success ? 'Completed successfully' : 'Failed'}`)

      return {
        branchId: target.branchId,
        branchName: target.branchName,
        subJobId: subJobId,
        success: result.success,
        exitCode: result.exitCode,
        error: result.error,
        output: result.output
      }

    } catch (error) {
      logger.error(`Branch "${target.branchName}": Execution error:`, error.message)

      return {
        branchId: target.branchId,
        branchName: target.branchName,
        subJobId: null,
        success: false,
        exitCode: 1,
        error: error.message,
        output: null
      }
    }
  })

  // Execute branches with concurrency control
  let results

  if (maxConcurrency && maxConcurrency > 0) {
    // Use concurrency limiting
    logger.info(`Executing branches with max concurrency: ${maxConcurrency}`)

    // Simple concurrency control: execute in batches
    results = []
    for (let i = 0; i < branchPromises.length; i += maxConcurrency) {
      const batch = branchPromises.slice(i, i + maxConcurrency)
      logger.info(`📦 Executing batch ${Math.floor(i / maxConcurrency) + 1} (${batch.length} branches)`)
      const batchResults = await Promise.allSettled(batch)
      results.push(...batchResults)
    }
  } else {
    // Unlimited parallelism
    logger.info(`Executing all ${branchPromises.length} branches in parallel (unlimited concurrency)`)

    if (failFast) {
      // Use Promise.race logic - abort on first failure
      results = await Promise.allSettled(branchPromises)

      // Check for failures
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value && !result.value.success) {
          logger.info(`🚨 Fail-fast triggered: Branch "${result.value.branchName}" failed`)
          break // Stop checking after first failure
        }
        if (result.status === 'rejected') {
          logger.info(`🚨 Fail-fast triggered: Branch execution threw error`)
          break
        }
      }
    } else {
      // Wait for all branches regardless of failures
      results = await Promise.allSettled(branchPromises)
    }
  }

  // Analyze results
  let successCount = 0
  let failureCount = 0
  const branchResults = []

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      branchResults.push(result.value)
      if (result.value.success) {
        successCount++
      } else {
        failureCount++
      }
    } else if (result.status === 'rejected') {
      failureCount++
      branchResults.push({
        branchId: 'unknown',
        branchName: 'unknown',
        subJobId: null,
        success: false,
        exitCode: 1,
        error: result.reason?.message || 'Branch execution rejected',
        output: null
      })
    }
  }

  const allSucceeded = failureCount === 0

  logger.info(`${allSucceeded ? '✅' : '⚠️'} Parallel branches complete: ${successCount} succeeded, ${failureCount} failed`)

  // Log individual branch results
  for (const branch of branchResults) {
    const icon = branch.success ? '✅' : '❌'
    logger.info(`  ${icon} Branch "${branch.branchName}": ${branch.success ? 'Success' : `Failed - ${branch.error}`}`)
  }

  return {
    success: allSucceeded,
    results: branchResults,
    successCount: successCount,
    failureCount: failureCount,
    message: allSucceeded
      ? `All ${successCount} branches completed successfully`
      : `${failureCount} of ${branchResults.length} branches failed`
  }
}
