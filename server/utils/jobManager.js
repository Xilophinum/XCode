/**
 * Job Manager - Handles job storage, lifecycle, and output buffering
 * 
 * This manages all active and completed jobs, stores real-time output,
 * and provides APIs for job status tracking.
 */

class JobManager {
  constructor() {
    // In-memory storage for jobs (in production, use a database)
    this.jobs = new Map()
    this.jobsByProject = new Map() // projectId -> Set of jobIds
    
    console.log('📋 Job Manager initialized')
  }

  /**
   * Create a new job
   */
  async createJob(jobData) {
    const { jobId, projectId } = jobData
    
    // Store job
    this.jobs.set(jobId, {
      ...jobData,
      output: [],
      createdAt: new Date().toISOString()
    })
    
    // Track by project
    if (!this.jobsByProject.has(projectId)) {
      this.jobsByProject.set(projectId, new Set())
    }
    this.jobsByProject.get(projectId).add(jobId)
    
    console.log(`📋 Created job ${jobId} for project ${projectId}`)
    
    // Broadcast job creation to subscribed clients
    if (globalThis.broadcastToProject) {
      globalThis.broadcastToProject(projectId, {
        type: 'job_created',
        jobId: jobId,
        projectId: projectId,
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

    // Update job data
    Object.assign(job, updates, {
      updatedAt: new Date().toISOString()
    })

    console.log(`📋 Updated job ${jobId}:`, Object.keys(updates))
    
    // Broadcast job status updates to subscribed clients
    if (globalThis.broadcastToProject && job.projectId) {
      globalThis.broadcastToProject(job.projectId, {
        type: 'job_status_updated',
        jobId: jobId,
        projectId: job.projectId,
        status: job.status,
        message: job.message || updates.message || job.error || updates.error, // Include completion/error details
        currentNodeId: job.currentNodeId,
        currentNodeLabel: job.currentNodeLabel,
        agentId: job.agentId,
        agentName: job.agentName,
        buildId: job.buildId,
        updates: updates,
        timestamp: new Date().toISOString()
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
    console.log(`📋 Deleted job ${jobId}`)
    return true
  }

  /**
   * Add output to a job (real-time streaming)
   */
  async addJobOutput(jobId, outputLine) {
    const job = this.jobs.get(jobId)
    if (!job) {
      console.warn(`⚠️ Attempted to add output to non-existent job ${jobId}`)
      return false
    }

    // Add timestamp if not provided
    if (!outputLine.timestamp) {
      outputLine.timestamp = new Date().toISOString()
    }

    job.output.push(outputLine)

    // Keep only last 1000 lines to prevent memory issues
    if (job.output.length > 1000) {
      job.output = job.output.slice(-1000)
    }

    // Broadcast output in real-time to subscribed clients
    if (globalThis.broadcastToProject && job.projectId) {
      globalThis.broadcastToProject(job.projectId, {
        type: 'job_output_line',
        jobId: jobId,
        projectId: job.projectId,
        output: outputLine,
        timestamp: outputLine.timestamp
      })
    }

    return true
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
   * Get all active jobs across all projects
   */
  async getActiveJobs() {
    const activeJobs = []
    
    for (const job of this.jobs.values()) {
      if (job.status === 'running' || 
          job.status === 'started' || 
          job.status === 'dispatched' ||
          job.status === 'cancelling') {
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
      console.warn(`⚠️ Received status update for unknown job ${jobId}`)
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

    console.log(`📋 Job ${jobId} status updated: ${status}`)
    return true
  }

  /**
   * Handle real-time output from agent
   */
  async handleAgentJobOutput(jobId, outputData) {
    const job = this.jobs.get(jobId)
    if (!job) {
      console.warn(`⚠️ Received output for unknown job ${jobId}`)
      return false
    }

    await this.addJobOutput(jobId, outputData.output)
    return true
  }

  /**
   * Clean up old completed jobs (call this periodically)
   */
  async cleanupOldJobs(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const cutoff = Date.now() - maxAge
    const toDelete = []

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && new Date(job.completedAt).getTime() < cutoff) {
        toDelete.push(jobId)
      }
    }

    for (const jobId of toDelete) {
      await this.deleteJob(jobId)
    }

    if (toDelete.length > 0) {
      console.log(`📋 Cleaned up ${toDelete.length} old jobs`)
    }

    return toDelete.length
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

// Export singleton instance
export const jobManager = new JobManager()

// Cleanup old jobs every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    jobManager.cleanupOldJobs().catch(console.error)
  }, 60 * 60 * 1000) // 1 hour
}