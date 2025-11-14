/**
 * Execution State Manager
 *
 * Manages node execution states for active builds in memory
 * and persists to database on build completion.
 *
 * State format:
 * {
 *   "node-id": {
 *     status: 'pending' | 'executing' | 'completed' | 'failed',
 *     startTime: ISO timestamp,
 *     endTime: ISO timestamp | null,
 *     label: string
 *   }
 * }
 */

import { getDB, builds } from './database.js'
import { eq, and } from 'drizzle-orm'
import logger from './logger.js'

class ExecutionStateManager {
  constructor() {
    // Map of projectId -> buildNumber -> nodeStates
    this.activeStates = new Map()
    logger.info('Execution State Manager initialized')
  }

  /**
   * Get the state key for a build
   */
  _getStateKey(projectId, buildNumber) {
    return `${projectId}:${buildNumber}`
  }

  /**
   * Initialize state for a new build
   */
  initializeBuildState(projectId, buildNumber, nodes = []) {
    const stateKey = this._getStateKey(projectId, buildNumber)

    // Create initial state with all nodes as pending
    const nodeStates = {}
    nodes.forEach(node => {
      nodeStates[node.id] = {
        status: 'pending',
        startTime: null,
        endTime: null,
        label: node.data?.label || node.id
      }
    })

    this.activeStates.set(stateKey, nodeStates)
    logger.info(`Initialized execution state for build ${buildNumber} with ${nodes.length} nodes`)

    return nodeStates
  }

  /**
   * Update a node's execution state
   */
  updateNodeState(projectId, buildNumber, nodeId, updates) {
    const stateKey = this._getStateKey(projectId, buildNumber)
    const buildState = this.activeStates.get(stateKey)

    if (!buildState) {
      logger.warn(`No active state found for build ${buildNumber}, creating new state`)
      this.activeStates.set(stateKey, {})
    }

    const currentState = this.activeStates.get(stateKey)[nodeId] || {}

    // Apply updates
    this.activeStates.get(stateKey)[nodeId] = {
      ...currentState,
      ...updates
    }

    logger.debug(`Updated node ${nodeId} state:`, updates)

    return this.activeStates.get(stateKey)[nodeId]
  }

  /**
   * Mark a node as executing
   */
  markNodeExecuting(projectId, buildNumber, nodeId, nodeLabel) {
    const stateKey = this._getStateKey(projectId, buildNumber)
    const currentState = this.activeStates.get(stateKey)?.[nodeId]

    // Only update and broadcast if state is actually changing
    if (currentState?.status === 'executing') {
      logger.debug(`[ExecutionState] Build #${buildNumber}: Node ${nodeId} already executing, skipping`)
      return currentState
    }

    logger.info(`[ExecutionState] Build #${buildNumber}: Node ${nodeId} -> executing`)
    const state = this.updateNodeState(projectId, buildNumber, nodeId, {
      status: 'executing',
      startTime: new Date().toISOString(),
      label: nodeLabel || nodeId
    })

    // Broadcast state change to connected clients
    this.broadcastStateChange(projectId, buildNumber, nodeId, 'executing', state)
    return state
  }

  /**
   * Mark a node as completed
   */
  markNodeCompleted(projectId, buildNumber, nodeId) {
    const stateKey = this._getStateKey(projectId, buildNumber)
    const currentState = this.activeStates.get(stateKey)?.[nodeId]

    // Only update and broadcast if state is actually changing
    if (currentState?.status === 'completed') {
      logger.debug(`[ExecutionState] Build #${buildNumber}: Node ${nodeId} already completed, skipping`)
      return currentState
    }

    logger.info(`[ExecutionState] Build #${buildNumber}: Node ${nodeId} -> completed`)
    const state = this.updateNodeState(projectId, buildNumber, nodeId, {
      status: 'completed',
      endTime: new Date().toISOString()
    })

    // Broadcast state change to connected clients
    this.broadcastStateChange(projectId, buildNumber, nodeId, 'completed', state)
    return state
  }

  /**
   * Mark a node as failed
   */
  markNodeFailed(projectId, buildNumber, nodeId) {
    const stateKey = this._getStateKey(projectId, buildNumber)
    const currentState = this.activeStates.get(stateKey)?.[nodeId]

    // Only update and broadcast if state is actually changing
    if (currentState?.status === 'failed') {
      logger.debug(`[ExecutionState] Build #${buildNumber}: Node ${nodeId} already failed, skipping duplicate`)
      return currentState
    }

    logger.info(`[ExecutionState] Build #${buildNumber}: Node ${nodeId} -> failed`)
    const state = this.updateNodeState(projectId, buildNumber, nodeId, {
      status: 'failed',
      endTime: new Date().toISOString()
    })

    // Broadcast state change to connected clients
    this.broadcastStateChange(projectId, buildNumber, nodeId, 'failed', state)
    return state
  }

  /**
   * Broadcast execution state change to WebSocket clients
   */
  broadcastStateChange(projectId, buildNumber, nodeId, status, nodeState) {
    if (globalThis.broadcastToProject) {
      globalThis.broadcastToProject(projectId, {
        type: 'node_execution_state_changed',
        projectId: projectId,  // Include projectId in message payload
        buildNumber: buildNumber,
        nodeId: nodeId,
        status: status,
        nodeState: nodeState,
        timestamp: new Date().toISOString()
      })
      logger.info(`Broadcasted node state change: Build #${buildNumber}, Node ${nodeId} -> ${status}`)
    } else {
      logger.warn(`Cannot broadcast node state change - broadcastToProject not available`)
    }
  }

  /**
   * Get the current state for a build
   */
  getBuildState(projectId, buildNumber) {
    const stateKey = this._getStateKey(projectId, buildNumber)
    return this.activeStates.get(stateKey) || null
  }

  /**
   * Persist build state to database
   */
  async persistBuildState(projectId, buildNumber) {
    const stateKey = this._getStateKey(projectId, buildNumber)
    const buildState = this.activeStates.get(stateKey)

    if (!buildState) {
      logger.warn(`No state to persist for build ${buildNumber}`)
      return false
    }

    try {
      const db = await getDB()

      await db.update(builds).set({
        nodeExecutionStates: JSON.stringify(buildState),
        updatedAt: new Date().toISOString()
      }).where(and(
        eq(builds.projectId, projectId),
        eq(builds.buildNumber, buildNumber)
      ))

      logger.info(`Persisted execution state for build ${buildNumber} to database`)
      return true
    } catch (error) {
      logger.error(`Failed to persist build state for build ${buildNumber}:`, error)
      return false
    }
  }

  /**
   * Load build state from database
   */
  async loadBuildState(projectId, buildNumber) {
    try {
      const db = await getDB()

      const result = await db.select({
        nodeExecutionStates: builds.nodeExecutionStates
      }).from(builds).where(and(
        eq(builds.projectId, projectId),
        eq(builds.buildNumber, buildNumber)
      ))

      if (result[0]?.nodeExecutionStates) {
        const nodeStates = JSON.parse(result[0].nodeExecutionStates)
        return nodeStates
      }

      return null
    } catch (error) {
      logger.error(`Failed to load build state for build ${buildNumber}:`, error)
      return null
    }
  }

  /**
   * Reset execution state from a specific node onwards for retry functionality
   */
  resetFromNode(projectId, buildNumber, startNodeId, nodes, edges) {
    const stateKey = this._getStateKey(projectId, buildNumber)
    const buildState = this.activeStates.get(stateKey)

    if (!buildState) {
      logger.warn(`No active state found for build ${buildNumber} to reset`)
      return
    }

    // Find all nodes that should be reset (startNode and all downstream nodes)
    const nodesToReset = this._findDownstreamNodes(startNodeId, nodes, edges)
    nodesToReset.add(startNodeId) // Include the start node itself

    logger.info(`Resetting ${nodesToReset.size} nodes from retry point: ${startNodeId}`)

    // Reset state for all affected nodes
    for (const nodeId of nodesToReset) {
      if (buildState[nodeId]) {
        buildState[nodeId] = {
          ...buildState[nodeId],
          status: 'pending',
          startTime: null,
          endTime: null
        }
        
        // Broadcast state change
        this.broadcastStateChange(projectId, buildNumber, nodeId, 'pending', buildState[nodeId])
      }
    }

    logger.info(`Reset execution state for ${nodesToReset.size} nodes from retry point`)
  }

  /**
   * Find all downstream nodes from a given starting node
   */
  _findDownstreamNodes(startNodeId, nodes, edges, visited = new Set()) {
    if (visited.has(startNodeId)) {
      return new Set()
    }
    visited.add(startNodeId)

    const downstreamNodes = new Set()
    
    // Find all edges that start from this node
    const outgoingEdges = edges.filter(edge => edge.source === startNodeId)
    
    for (const edge of outgoingEdges) {
      const targetNodeId = edge.target
      downstreamNodes.add(targetNodeId)
      
      // Recursively find downstream nodes
      const nestedDownstream = this._findDownstreamNodes(targetNodeId, nodes, edges, visited)
      for (const nodeId of nestedDownstream) {
        downstreamNodes.add(nodeId)
      }
    }
    
    return downstreamNodes
  }

  /**
   * Clean up state for a completed build (remove from memory)
   */
  async cleanupBuildState(projectId, buildNumber) {
    const stateKey = this._getStateKey(projectId, buildNumber)

    // First persist to database
    await this.persistBuildState(projectId, buildNumber)

    // Then remove from memory
    this.activeStates.delete(stateKey)
    logger.info(`Cleaned up execution state for build ${buildNumber} from memory`)
  }

  /**
   * Get all active build states (for debugging)
   */
  getActiveBuilds() {
    return Array.from(this.activeStates.keys())
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeBuilds: this.activeStates.size,
      builds: Array.from(this.activeStates.keys())
    }
  }
}

// Create singleton instance
let executionStateManagerInstance = null

export function getExecutionStateManager() {
  if (!executionStateManagerInstance) {
    executionStateManagerInstance = new ExecutionStateManager()
  }
  return executionStateManagerInstance
}

export const executionStateManager = getExecutionStateManager()
