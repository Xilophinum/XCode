/**
 * Job Queue Manager
 *
 * Manages job queues for build agents to prevent overloading.
 * When an agent reaches maxConcurrentJobs, new jobs are queued
 * and automatically dispatched when capacity becomes available.
 *
 * Features:
 * - Per-agent job queues (FIFO by default)
 * - Priority support (high priority jobs jump the queue)
 * - Automatic dequeuing when agent capacity available
 * - Queue metrics and monitoring
 */

import logger from './logger.js'
import { getDB, agents } from './database.js'
import { eq } from 'drizzle-orm'

class JobQueueManager {
  constructor() {
    // Map of agentId -> array of queued jobs
    this.queues = new Map()

    // Track queue metrics
    this.metrics = {
      totalEnqueued: 0,
      totalDequeued: 0,
      totalDropped: 0
    }
  }

  /**
   * Enqueue a job for an agent
   * @param {string} agentId - Agent ID
   * @param {object} jobData - Job data to queue
   * @param {string} priority - 'high' or 'normal' (default: 'normal')
   * @returns {number} Position in queue (0-indexed)
   */
  enqueueJob(agentId, jobData, priority = 'normal') {
    if (!agentId) {
      throw new Error('Agent ID is required for enqueuing')
    }

    if (!jobData || !jobData.jobId) {
      throw new Error('Job data with jobId is required')
    }

    // Initialize queue for agent if doesn't exist
    if (!this.queues.has(agentId)) {
      this.queues.set(agentId, [])
    }

    const queue = this.queues.get(agentId)

    // Create queue entry
    const queueEntry = {
      jobId: jobData.jobId,
      projectId: jobData.projectId,
      projectName: jobData.projectName,
      buildNumber: jobData.buildNumber,
      priority: priority,
      enqueuedAt: new Date().toISOString(),
      jobData: jobData
    }

    // Add to queue based on priority
    if (priority === 'high') {
      // Find first normal priority job and insert before it
      const firstNormalIndex = queue.findIndex(j => j.priority !== 'high')
      if (firstNormalIndex === -1) {
        // All jobs are high priority or queue is empty
        queue.push(queueEntry)
      } else {
        queue.splice(firstNormalIndex, 0, queueEntry)
      }
    } else {
      // Normal priority - add to end
      queue.push(queueEntry)
    }

    this.metrics.totalEnqueued++

    const position = queue.indexOf(queueEntry)

    logger.info(`📥 Job ${jobData.jobId} enqueued for agent ${agentId} at position ${position} (priority: ${priority})`)
    logger.info(`   Project: "${jobData.projectName}" Build #${jobData.buildNumber}`)
    logger.info(`   Queue length: ${queue.length}`)

    return position
  }

  /**
   * Dequeue the next job for an agent
   * @param {string} agentId - Agent ID
   * @returns {object|null} Job data or null if queue empty
   */
  dequeueNextJob(agentId) {
    if (!this.queues.has(agentId)) {
      return null
    }

    const queue = this.queues.get(agentId)

    if (queue.length === 0) {
      return null
    }

    const queueEntry = queue.shift()
    this.metrics.totalDequeued++

    const waitTime = Date.now() - new Date(queueEntry.enqueuedAt).getTime()

    logger.info(`📤 Job ${queueEntry.jobId} dequeued from agent ${agentId}`)
    logger.info(`   Wait time: ${(waitTime / 1000).toFixed(1)}s`)
    logger.info(`   Remaining in queue: ${queue.length}`)

    return queueEntry.jobData
  }

  /**
   * Get queue length for an agent
   * @param {string} agentId - Agent ID
   * @returns {number} Number of jobs in queue
   */
  getQueueLength(agentId) {
    if (!this.queues.has(agentId)) {
      return 0
    }
    return this.queues.get(agentId).length
  }

  /**
   * Get all queued jobs for an agent
   * @param {string} agentId - Agent ID
   * @returns {array} Array of queue entries (without full jobData)
   */
  getQueuedJobs(agentId) {
    if (!this.queues.has(agentId)) {
      return []
    }

    const queue = this.queues.get(agentId)

    // Return queue info without full jobData (lighter for monitoring)
    return queue.map(entry => ({
      jobId: entry.jobId,
      projectId: entry.projectId,
      projectName: entry.projectName,
      buildNumber: entry.buildNumber,
      priority: entry.priority,
      enqueuedAt: entry.enqueuedAt,
      waitTime: Date.now() - new Date(entry.enqueuedAt).getTime()
    }))
  }

  /**
   * Get all queues across all agents
   * @returns {object} Map of agentId -> queue info
   */
  getAllQueues() {
    const result = {}

    for (const [agentId, queue] of this.queues) {
      result[agentId] = {
        length: queue.length,
        jobs: queue.map(entry => ({
          jobId: entry.jobId,
          projectName: entry.projectName,
          buildNumber: entry.buildNumber,
          priority: entry.priority,
          enqueuedAt: entry.enqueuedAt
        }))
      }
    }

    return result
  }

  /**
   * Remove a specific job from queue (e.g., if build cancelled)
   * @param {string} agentId - Agent ID
   * @param {string} jobId - Job ID to remove
   * @returns {boolean} True if job was removed
   */
  removeJob(agentId, jobId) {
    if (!this.queues.has(agentId)) {
      return false
    }

    const queue = this.queues.get(agentId)
    const index = queue.findIndex(entry => entry.jobId === jobId)

    if (index === -1) {
      return false
    }

    queue.splice(index, 1)
    this.metrics.totalDropped++

    logger.info(`🗑️  Job ${jobId} removed from agent ${agentId} queue`)

    return true
  }

  /**
   * Clear all queued jobs for an agent (e.g., on agent disconnect)
   * @param {string} agentId - Agent ID
   * @returns {number} Number of jobs cleared
   */
  clearQueue(agentId) {
    if (!this.queues.has(agentId)) {
      return 0
    }

    const queue = this.queues.get(agentId)
    const count = queue.length

    this.queues.delete(agentId)
    this.metrics.totalDropped += count

    logger.warn(`🗑️  Cleared ${count} jobs from agent ${agentId} queue`)

    return count
  }

  /**
   * Get queue metrics
   * @returns {object} Metrics object
   */
  getMetrics() {
    const totalQueued = Array.from(this.queues.values())
      .reduce((sum, queue) => sum + queue.length, 0)

    return {
      ...this.metrics,
      currentlyQueued: totalQueued,
      agentsWithQueues: this.queues.size
    }
  }

  /**
   * Check if agent has capacity for more jobs
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>} True if agent can accept more jobs
   */
  async hasCapacity(agentId) {
    const db = getDB()

    const [agent] = await db.select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1)

    if (!agent) {
      logger.error(`Agent ${agentId} not found in database`)
      return false
    }

    const currentJobs = agent.currentJobs || 0
    const maxJobs = agent.maxConcurrentJobs || 1

    logger.debug(`Agent ${agentId} capacity: ${currentJobs}/${maxJobs}`)

    return currentJobs < maxJobs
  }

  /**
   * Get current job count for an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<object>} Object with currentJobs and maxJobs
   */
  async getAgentCapacity(agentId) {
    const db = getDB()

    const [agent] = await db.select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1)

    if (!agent) {
      return { currentJobs: 0, maxJobs: 0, hasCapacity: false }
    }

    const currentJobs = agent.currentJobs || 0
    const maxJobs = agent.maxConcurrentJobs || 1

    return {
      currentJobs,
      maxJobs,
      hasCapacity: currentJobs < maxJobs,
      queueLength: this.getQueueLength(agentId)
    }
  }
}

// Singleton instance
let jobQueueManagerInstance = null

/**
 * Get job queue manager instance (singleton)
 */
export function getJobQueueManager() {
  if (!jobQueueManagerInstance) {
    jobQueueManagerInstance = new JobQueueManager()
    logger.info('✅ Job Queue Manager initialized')
  }
  return jobQueueManagerInstance
}

export default JobQueueManager
