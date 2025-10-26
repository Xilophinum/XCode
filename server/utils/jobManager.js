/**
 * Job Manager - Handles job storage, lifecycle, and output buffering
 * 
 * This manages all active and completed jobs with database persistence,
 * stores real-time output, and provides APIs for job status tracking.
 */

import { getDB, builds } from './database.js'
import { v4 as uuidv4 } from 'uuid'
import { eq, and } from 'drizzle-orm'
import logger from './logger.js'

class JobManager {
  constructor() {
    // In-memory cache for active jobs (performance)
    this.jobs = new Map()
    this.jobsByProject = new Map() // projectId -> Set of jobIds
    this.outputSequence = new Map() // jobId -> next sequence number
    this.db = null

    logger.info('Job Manager initialized with database persistence')
  }

  async initialize() {
    this.db = await getDB()
    
    // Load active jobs from database on startup
    await this.loadActiveJobsFromDatabase()

    logger.info(`Loaded ${this.jobs.size} active jobs from database`)
  }

  async loadActiveJobsFromDatabase() {
    // Jobs table was migrated to builds table - no active jobs to load on startup
    logger.info('Jobs are now stored in builds table - starting with empty job cache')
  }

  /**
   * Create a new job
   */
  async createJob(jobData) {
    const { jobId, projectId } = jobData
    const now = new Date().toISOString()
    
    const jobRecord = {
      id: jobId,
      projectId: projectId,
      projectName: jobData.projectName || null,
      buildNumber: jobData.buildNumber || null,
      parentJobId: jobData.parentJobId || null,
      status: jobData.status || 'queued',
      agentId: jobData.agentId || null,
      agentName: jobData.agentName || null,
      currentCommandIndex: jobData.currentCommandIndex || null,
      executionCommands: jobData.executionCommands ? JSON.stringify(jobData.executionCommands) : null,
      nodes: jobData.nodes ? JSON.stringify(jobData.nodes) : null,
      edges: jobData.edges ? JSON.stringify(jobData.edges) : null,
      currentNodeId: jobData.currentNodeId || null,
      currentNodeLabel: jobData.currentNodeLabel || null,
      exitCode: null,
      error: null,
      message: null,
      finalOutput: null,
      canRetryOnReconnect: 'false',
      parallelBranchesResult: null,
      parallelMatrixResult: null,
      startTime: jobData.startTime || now,
      completedAt: null,
      failedAt: null,
      retriedAt: null,
      createdAt: now,
      updatedAt: now,
      output: jobData.output || []
    }
    
    this.jobs.set(jobId, jobRecord)
    
    // Track by project
    if (!this.jobsByProject.has(projectId)) {
      this.jobsByProject.set(projectId, new Set())
    }
    this.jobsByProject.get(projectId).add(jobId)
    
    // Initialize output sequence
    this.outputSequence.set(jobId, 0)

    logger.info(`Created job ${jobId} for project "${jobData.projectName || projectId}" (persisted to database)`)

    // Broadcast job creation to subscribed clients
    if (globalThis.broadcastToProject) {
      globalThis.broadcastToProject(projectId, {
        type: 'job_created',
        jobId: jobId,
        buildNumber: jobData.buildNumber || null,
        projectId: projectId,
        agentId: jobData.agentId,
        agentName: jobData.agentName,
        status: jobData.status || 'created',
        timestamp: new Date().toISOString()
      })
    }
    
    return jobData
  }

  /**
   * Get a specific job
   */
  async getJob(jobId) {
    return this.jobs.get(jobId) || null
  }

  /**
   * Update job data
   */
  async updateJob(jobId, updates) {
    const job = this.jobs.get(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    const now = new Date().toISOString()
    
    // Update memory cache
    Object.assign(job, updates, {
      updatedAt: now
    })

    // Prepare database updates
    const dbUpdates = {
      updatedAt: now
    }
    
    // Map memory fields to database fields
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.agentId !== undefined) dbUpdates.agentId = updates.agentId
    if (updates.agentName !== undefined) dbUpdates.agentName = updates.agentName
    if (updates.currentCommandIndex !== undefined) dbUpdates.currentCommandIndex = updates.currentCommandIndex
    if (updates.executionCommands !== undefined) dbUpdates.executionCommands = JSON.stringify(updates.executionCommands)
    if (updates.currentNodeId !== undefined) dbUpdates.currentNodeId = updates.currentNodeId
    if (updates.currentNodeLabel !== undefined) dbUpdates.currentNodeLabel = updates.currentNodeLabel
    if (updates.exitCode !== undefined) dbUpdates.exitCode = updates.exitCode
    if (updates.error !== undefined) dbUpdates.error = updates.error
    if (updates.message !== undefined) dbUpdates.message = updates.message
    if (updates.finalOutput !== undefined) dbUpdates.finalOutput = updates.finalOutput
    if (updates.canRetryOnReconnect !== undefined) dbUpdates.canRetryOnReconnect = updates.canRetryOnReconnect ? 'true' : 'false'
    if (updates.parallelBranchesResult !== undefined) dbUpdates.parallelBranchesResult = JSON.stringify(updates.parallelBranchesResult)
    if (updates.parallelMatrixResult !== undefined) dbUpdates.parallelMatrixResult = JSON.stringify(updates.parallelMatrixResult)
    if (updates.completedAt !== undefined) dbUpdates.completedAt = updates.completedAt
    if (updates.failedAt !== undefined) dbUpdates.failedAt = updates.failedAt
    if (updates.retriedAt !== undefined) dbUpdates.retriedAt = updates.retriedAt

    // Jobs are now stored in builds table - skip database update for jobs

    logger.info(`Updated job ${jobId}:`, Object.keys(updates), '(persisted to database)')

    // Broadcast job status updates to subscribed clients
    if (globalThis.broadcastToProject && job.projectId) {
      globalThis.broadcastToProject(job.projectId, {
        type: 'job_status_updated',
        jobId: jobId,
        projectId: job.projectId,
        status: job.status,
        message: job.message || updates.message || job.error || updates.error,
        currentNodeId: job.currentNodeId,
        currentNodeLabel: job.currentNodeLabel,
        agentId: job.agentId,
        agentName: job.agentName,
        buildNumber: job.buildNumber,
        updates: updates,
        timestamp: now
      })
    }
    
    return job
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId) {
    const job = this.jobs.get(jobId)
    if (!job) return false

    // Remove from project tracking
    const projectJobs = this.jobsByProject.get(job.projectId)
    if (projectJobs) {
      projectJobs.delete(jobId)
      if (projectJobs.size === 0) {
        this.jobsByProject.delete(job.projectId)
      }
    }

    // Remove job
    this.jobs.delete(jobId)
    logger.info(`Deleted job ${jobId}`)
    return true
  }

  /**
   * Add output to a job (real-time streaming with single-row JSON persistence)
   */
  async addJobOutput(jobId, outputLine) {
    const job = this.jobs.get(jobId)
    if (!job) {
      logger.warn(`Attempted to add output to non-existent job ${jobId}`)
      return false
    }

    const now = new Date().toISOString()
    
    // Add timestamp if not provided
    if (!outputLine.timestamp) {
      outputLine.timestamp = now
    }

    // Mask sensitive values in output if credential resolver is available
    let maskedMessage = outputLine.message || String(outputLine)
    if (job.credentialResolver && typeof job.credentialResolver.maskLog === 'function') {
      const originalMessage = maskedMessage
      maskedMessage = job.credentialResolver.maskLog(maskedMessage)
      if (originalMessage !== maskedMessage) {
        logger.debug(`Masked secret values in output for job ${jobId}`)
      }
    } else {
      logger.debug(`No credentialResolver available for job ${jobId} - output not masked`)
    }

    // Get next sequence number
    const sequence = this.outputSequence.get(jobId) || 0
    this.outputSequence.set(jobId, sequence + 1)

    // Prepare output entry with masked content
    const outputEntry = {
      sequence: sequence,
      type: outputLine.type || 'info',
      level: outputLine.level || 'info',
      message: maskedMessage,
      command: outputLine.command || null,
      output: outputLine.output || null,
      source: outputLine.source || 'agent',
      nodeId: outputLine.nodeId || null,
      timestamp: outputLine.timestamp
    }

    // Update database with single-row JSON approach
    if (!this.db) await this.initialize()

    // Store job output in builds table
    try {
      const db = await getDB()

      if (job.buildNumber) {
        const buildResults = await db.select({ outputLog: builds.outputLog }).from(builds).where(and(
          eq(builds.projectId, job.projectId),
          eq(builds.buildNumber, job.buildNumber)
        ))
        const build = buildResults[0]

        let currentLog = []
        if (build && build.outputLog) {
          try {
            currentLog = JSON.parse(build.outputLog)
          } catch (e) {
            currentLog = []
          }
        }

        // Add new entry
        currentLog.push(outputEntry)

        await db.update(builds).set({
          outputLog: JSON.stringify(currentLog),
          updatedAt: now
        }).where(and(
          eq(builds.projectId, job.projectId),
          eq(builds.buildNumber, job.buildNumber)
        ))
      }

    } catch (dbError) {
      logger.warn(`Failed to persist job output to database:`, dbError.message)
    }

    // Add to memory cache (keep only last 100 lines for performance) - use masked version
    const maskedOutputLine = { ...outputLine, message: maskedMessage }
    job.output.push(maskedOutputLine)
    if (job.output.length > 100) {
      job.output = job.output.slice(-100)
    }

    // Broadcast output in real-time to subscribed clients - use masked version
    if (globalThis.broadcastToProject && job.projectId) {
      globalThis.broadcastToProject(job.projectId, {
        type: 'job_output_line',
        jobId: jobId,
        projectId: job.projectId,
        output: maskedOutputLine,
        timestamp: outputLine.timestamp
      })
    }

    return true
  }

  /**
   * Get job output from memory cache
   */
  async getJobOutput(jobId, limit = 1000) {
    const job = this.jobs.get(jobId)
    if (!job || !job.output) {
      return []
    }
    
    // Apply limit if specified
    if (limit && job.output.length > limit) {
      return job.output.slice(-limit)
    }
    
    return job.output
  }

  /**
   * Get all jobs for a project
   */
  async getJobsForProject(projectId) {
    const jobIds = this.jobsByProject.get(projectId) || new Set()
    const jobs = []
    
    for (const jobId of jobIds) {
      const job = this.jobs.get(jobId)
      if (job) {
        jobs.push(job)
      }
    }
    
    return jobs
  }

  /**
   * Get running job for a project (if any)
   */
  async getRunningJobForProject(projectId) {
    const jobs = await this.getJobsForProject(projectId)
    
    return jobs.find(job => 
      job.status === 'running' || 
      job.status === 'started' || 
      job.status === 'dispatched' ||
      job.status === 'cancelling'
    ) || null
  }

  /**
   * Get all active jobs across all projects (from memory cache)
   */
  async getActiveJobs() {
    // Since jobs table was migrated to builds table, return active jobs from memory
    const activeJobs = []
    for (const job of this.jobs.values()) {
      if (['queued', 'dispatched', 'running', 'cancelling'].includes(job.status)) {
        activeJobs.push(job)
      }
    }
    return activeJobs
  }

  /**
   * Handle job status update from agent
   */
  async handleAgentJobUpdate(jobId, statusData) {
    const job = this.jobs.get(jobId)
    if (!job) {
      logger.warn(`Received status update for unknown job ${jobId}`)
      return false
    }

    const { status, currentNodeId, currentNodeLabel, output, outputLines, error, exitCode } = statusData

    // Update job status
    const updates = {
      status,
      lastUpdated: new Date().toISOString()
    }

    if (currentNodeId) updates.currentNodeId = currentNodeId
    if (currentNodeLabel) updates.currentNodeLabel = currentNodeLabel
    if (error) updates.error = error
    if (exitCode !== undefined) updates.exitCode = exitCode

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updates.completedAt = new Date().toISOString()
    }

    await this.updateJob(jobId, updates)

    // Add any new output lines
    if (outputLines && Array.isArray(outputLines)) {
      for (const outputLine of outputLines) {
        await this.addJobOutput(jobId, outputLine)
      }
    }

    // Add single output if provided
    if (output && typeof output === 'string') {
      await this.addJobOutput(jobId, {
        type: 'info',
        message: output,
        timestamp: new Date().toISOString(),
        source: 'agent'
      })
    }

    logger.info(`Job ${jobId} status updated: ${status}`)
    return true
  }

  /**
   * Handle real-time output from agent
   */
  async handleAgentJobOutput(jobId, outputData) {
    const job = this.jobs.get(jobId)
    if (!job) {
      logger.warn(`Received output for unknown job ${jobId}`)
      return false
    }

    await this.addJobOutput(jobId, outputData.output)
    return true
  }

  /**
   * Clean up old completed jobs from memory cache
   */
  async cleanupOldJobs(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const cutoff = Date.now() - maxAge
    const jobsToDelete = []
    
    // Find old completed jobs in memory
    for (const [jobId, job] of this.jobs.entries()) {
      if (['completed', 'failed', 'cancelled'].includes(job.status)) {
        const completedTime = job.completedAt ? new Date(job.completedAt).getTime() : job.createdAt ? new Date(job.createdAt).getTime() : Date.now()
        if (completedTime < cutoff) {
          jobsToDelete.push(jobId)
        }
      }
    }
    
    // Clean up memory cache
    for (const jobId of jobsToDelete) {
      const job = this.jobs.get(jobId)
      if (job) {
        // Remove from project tracking
        const projectJobs = this.jobsByProject.get(job.projectId)
        if (projectJobs) {
          projectJobs.delete(jobId)
          if (projectJobs.size === 0) {
            this.jobsByProject.delete(job.projectId)
          }
        }
        
        this.jobs.delete(jobId)
        this.outputSequence.delete(jobId)
      }
    }

    if (jobsToDelete.length > 0) {
      logger.info(`Cleaned up ${jobsToDelete.length} old jobs from memory`)
    }
    return jobsToDelete.length
  }

  /**
   * Get job statistics
   */
  getStats() {
    const stats = {
      total: this.jobs.size,
      byStatus: {},
      activeProjects: this.jobsByProject.size
    }

    for (const job of this.jobs.values()) {
      stats.byStatus[job.status] = (stats.byStatus[job.status] || 0) + 1
    }

    return stats
  }
}

// Create singleton instance
let jobManagerInstance = null

export async function getJobManager() {
  if (!jobManagerInstance) {
    jobManagerInstance = new JobManager()
    await jobManagerInstance.initialize()
  }
  return jobManagerInstance
}

// Legacy export for backward compatibility
export const jobManager = {
  async createJob(jobData) {
    const manager = await getJobManager()
    return manager.createJob(jobData)
  },
  async getJob(jobId) {
    const manager = await getJobManager()
    return manager.getJob(jobId)
  },
  async updateJob(jobId, updates) {
    const manager = await getJobManager()
    return manager.updateJob(jobId, updates)
  },
  async deleteJob(jobId) {
    const manager = await getJobManager()
    return manager.deleteJob(jobId)
  },
  async addJobOutput(jobId, outputLine) {
    const manager = await getJobManager()
    return manager.addJobOutput(jobId, outputLine)
  },
  async getJobOutput(jobId, limit) {
    const manager = await getJobManager()
    return manager.getJobOutput(jobId, limit)
  },
  async getJobsForProject(projectId) {
    const manager = await getJobManager()
    return manager.getJobsForProject(projectId)
  },
  async getRunningJobForProject(projectId) {
    const manager = await getJobManager()
    return manager.getRunningJobForProject(projectId)
  },
  async getActiveJobs() {
    const manager = await getJobManager()
    return manager.getActiveJobs()
  },
  async cleanupOldJobs(maxAge) {
    const manager = await getJobManager()
    return manager.cleanupOldJobs(maxAge)
  },
  get jobs() {
    // For backward compatibility - return empty Map if not initialized
    return jobManagerInstance?.jobs || new Map()
  }
}

// Cleanup old jobs every hour
if (typeof setInterval !== 'undefined') {
  setInterval(async () => {
    try {
      const manager = await getJobManager()
      await manager.cleanupOldJobs()
    } catch (error) {
      logger.error('Error during job cleanup:', error)
    }
  }, 60 * 60 * 1000) // 1 hour
}