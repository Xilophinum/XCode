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
import { executionStateManager } from '../executionStateManager.js'
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

  // Mark all branch target nodes as executing
  if (parentJob.buildNumber && parentJob.projectId) {
    for (const target of branchTargets) {
      if (target.targetNode?.id) {
        executionStateManager.markNodeExecuting(
          parentJob.projectId,
          parentJob.buildNumber,
          target.targetNode.id,
          target.targetNode.data.label
        )
        logger.info(`Marked branch target node "${target.targetNode.data.label}" as executing`)
      }
    }
  }

  // Dispatch all branches sequentially to avoid race conditions with currentJobs tracking
  // Then wait for all completions in parallel
  const dispatchedBranches = []

  for (const target of branchTargets) {
    const branchStartTime = new Date().toISOString()

    try {
      logger.info(`Branch "${target.branchName}": Starting execution of target node: ${target.targetNode.data.label}`)

      // Generate sub-job ID for this branch
      const subJobId = `${parentJob.jobId}_branch_${target.branchId}_${uuidv4().split('-')[0]}`

      // Create sub-job record with parent's buildNumber
      // NOTE: We do NOT set currentNodeId/currentNodeLabel because:
      // - Branch sub-jobs should not mark individual nodes
      // - Only the parent parallel branches orchestrator node gets marked
      // - This prevents all sub-jobs from trying to mark the same target node
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
        output: []
        // currentNodeId: NOT SET - prevents execution state marking
        // currentNodeLabel: NOT SET - prevents execution state marking
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

      // Dispatch job to agent with queue support (respects maxConcurrentJobs)
      // IMPORTANT: Sequential dispatch to avoid race conditions
      const dispatchResult = await agentManager.dispatchJobWithQueue(selectedAgent.agentId, {
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

      if (!dispatchResult.dispatched && !dispatchResult.queued) {
        throw new Error(`Failed to dispatch or queue branch "${target.branchName}" to agent ${selectedAgent.agentId}`)
      }

      if (dispatchResult.queued) {
        logger.info(`Branch "${target.branchName}" queued at position ${dispatchResult.queuePosition} (agent at capacity)`)
      }

      // Update sub-job status based on dispatch result
      await jobManager.updateJob(subJobId, {
        status: dispatchResult.dispatched ? 'dispatched' : 'queued',
        agentId: selectedAgent.agentId,
        agentName: selectedAgent.name || selectedAgent.hostname
      })

      // Store branch info for parallel waiting phase
      dispatchedBranches.push({
        subJobId,
        branchId: target.branchId,
        branchName: target.branchName
      })

    } catch (error) {
      logger.error(`Branch "${target.branchName}": Dispatch error:`, error.message)

      dispatchedBranches.push({
        subJobId: null,
        branchId: target.branchId,
        branchName: target.branchName,
        dispatchError: error.message
      })
    }
  }

  logger.info(`✅ All ${dispatchedBranches.length} branches dispatched/queued - now waiting for completions in parallel`)

  // Now wait for all branches to complete in parallel
  const branchPromises = dispatchedBranches.map(async (branchInfo) => {
    if (branchInfo.dispatchError) {
      return {
        branchId: branchInfo.branchId,
        branchName: branchInfo.branchName,
        subJobId: null,
        success: false,
        exitCode: 1,
        error: branchInfo.dispatchError,
        output: null
      }
    }

    try {
      logger.info(`Branch "${branchInfo.branchName}": Waiting for completion...`)

      // Wait for job completion (event-driven, not polling)
      const result = await agentManager.waitForJobCompletion(branchInfo.subJobId)

      logger.info(`Branch "${branchInfo.branchName}": ${result.success ? 'Completed successfully' : 'Failed'}`)

      return {
        branchId: branchInfo.branchId,
        branchName: branchInfo.branchName,
        subJobId: branchInfo.subJobId,
        success: result.success,
        exitCode: result.exitCode,
        error: result.error,
        output: result.output
      }

    } catch (error) {
      logger.error(`Branch "${branchInfo.branchName}": Execution error:`, error.message)

      return {
        branchId: branchInfo.branchId,
        branchName: branchInfo.branchName,
        subJobId: branchInfo.subJobId,
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

  // Log individual branch results and mark nodes as completed/failed
  for (const branch of branchResults) {
    const icon = branch.success ? '✅' : '❌'
    logger.info(`  ${icon} Branch "${branch.branchName}": ${branch.success ? 'Success' : `Failed - ${branch.error}`}`)

    // Find the corresponding branch target to get the node ID
    const branchTarget = branchTargets.find(t => t.branchId === branch.branchId)
    if (branchTarget && branchTarget.targetNode?.id && parentJob.buildNumber && parentJob.projectId) {
      if (branch.success) {
        executionStateManager.markNodeCompleted(
          parentJob.projectId,
          parentJob.buildNumber,
          branchTarget.targetNode.id
        )
        logger.info(`Marked branch target node "${branchTarget.targetNode.data.label}" as completed`)
      } else {
        executionStateManager.markNodeFailed(
          parentJob.projectId,
          parentJob.buildNumber,
          branchTarget.targetNode.id
        )
        logger.info(`Marked branch target node "${branchTarget.targetNode.data.label}" as failed`)
      }
    }
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
