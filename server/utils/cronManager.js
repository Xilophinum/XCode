/**
 * Cron Manager - Handles scheduling and execution of cron-triggered jobs
 */

import { Cron } from 'croner'
import { jobManager } from './jobManager.js'
import { getAgentManager } from './agentManager.js'
import { cronDbService } from './cronDbService.js'
import { getDataService } from './dataService.js'
import { executeProjectFromTrigger } from './triggerExecutor.js'
import logger from './logger.js'

class CronManager {
  constructor() {
    this.scheduledJobs = new Map() // jobId -> cron.schedule result
    this.cronConfigs = new Map()   // jobId -> { projectId, nodes, edges, cronExpression, enabled }
  }

  /**
   * Get the configured timezone for cron jobs
   */
  async getCronTimezone() {
    try {
      const dataService = await getDataService()
      const setting = await dataService.getSystemSettingByKey('cron_timezone')
      return setting?.value || 'America/New_York' // Default fallback
    } catch (error) {
      logger.warn('Failed to get cron timezone setting, using default:', error)
      return 'America/New_York'
    }
  }

  /**
   * Update timezone for all existing cron jobs
   * Called when timezone setting is changed in admin panel
   */
  async updateTimezoneForAllJobs() {
    logger.info('Updating timezone for all existing cron jobs...')

    const newTimezone = await this.getCronTimezone()
    logger.info(`New timezone: ${newTimezone}`)

    if (this.scheduledJobs.size === 0) {
      logger.info('No active cron jobs to update')
      return
    }

    // Store current job configurations
    const jobsToRecreate = []
    for (const [jobId, config] of this.cronConfigs) {
      jobsToRecreate.push({
        jobId,
        ...config
      })
    }

    // Cancel all existing jobs
    for (const jobId of this.scheduledJobs.keys()) {
      const scheduledJob = this.scheduledJobs.get(jobId)
      if (scheduledJob && typeof scheduledJob.stop === 'function') {
        scheduledJob.stop()
      }
      this.scheduledJobs.delete(jobId)
    }

    // Recreate all jobs with new timezone
    for (const jobConfig of jobsToRecreate) {
      const { jobId, projectId, nodes, edges, cronExpression, cronNodeId, cronNodeLabel } = jobConfig

      logger.info(`Recreating cron job with new timezone: ${cronNodeLabel} (${cronExpression})`)

      // Create the cron trigger node object
      const cronTriggerNode = {
        id: cronNodeId,
        data: {
          label: cronNodeLabel,
          cronExpression: cronExpression
        }
      }

      // Schedule the cron job using croner with new timezone
      const scheduledJob = new Cron(cronExpression, {
        timezone: newTimezone,
        name: `${cronNodeLabel}_${projectId}`,
        context: {
          projectId,
          nodes,
          edges,
          cronNode: cronTriggerNode
        }
      }, async (self) => {
        logger.info(`Executing cron job: ${cronNodeLabel} (${cronExpression})`)

        // Update last run in database
        cronDbService.updateLastRun(jobId)
        
        await this.executeCronTriggeredJob(projectId, nodes, edges, cronTriggerNode)
      })

      // Store the scheduled job and config in memory
      this.scheduledJobs.set(jobId, scheduledJob)
      this.cronConfigs.set(jobId, jobConfig)
    }

    logger.info(`Updated timezone for ${jobsToRecreate.length} cron jobs`)
  }

  /**
   * Schedule a cron job from project data
   */
  async scheduleCronJob(projectId, nodes, edges) {
    logger.info(`Scheduling cron jobs for project ${projectId}`)
    
    // Find all cron trigger nodes
    const cronTriggerNodes = nodes.filter(node => 
      node.data.nodeType === 'cron' && node.data.cronExpression
    )

    if (cronTriggerNodes.length === 0) {
      logger.info(`No cron triggers found in project ${projectId}`)
      return
    }

    for (const cronNode of cronTriggerNodes) {
      const cronExpression = cronNode.data.cronExpression.trim()
      
      if (!this.isValidCronExpression(cronExpression)) {
        logger.error(`Invalid cron expression: ${cronExpression} for node ${cronNode.data.label}`)
        continue
      }

      const jobId = `cron_${projectId}_${cronNode.id}`
      
      // Cancel existing job if it exists
      this.cancelCronJob(jobId)
      
      logger.info(`⏰ Scheduling cron job: ${cronNode.data.label} (${cronExpression})`)
      
      // Schedule the cron job using croner
      const scheduledJob = new Cron(cronExpression, {
        timezone: await this.getCronTimezone(),
        name: `${cronNode.data.label}_${projectId}`,
        context: {
          projectId,
          nodes,
          edges,
          cronNode
        }
      }, async (self) => {
        logger.info(`Executing cron job: ${cronNode.data.label} (${cronExpression})`)
        await this.executeCronTriggeredJob(projectId, nodes, edges, cronNode)
      })

      // Store the scheduled job and config
      this.scheduledJobs.set(jobId, scheduledJob)
      this.cronConfigs.set(jobId, {
        projectId,
        nodes,
        edges,
        cronExpression,
        cronNodeId: cronNode.id,
        cronNodeLabel: cronNode.data.label,
        enabled: true,
        createdAt: new Date(),
        lastRun: null
      })

      // Save to database for persistence
      cronDbService.saveCronJob({
        jobId,
        projectId,
        cronNodeId: cronNode.id,
        cronNodeLabel: cronNode.data.label,
        cronExpression,
        enabled: true,
        nodes,
        edges
      })

      logger.info(`Cron job scheduled and saved: ${jobId}`)
    }
  }

  /**
   * Restore cron jobs from database on server startup
   */
  async restoreCronJobsFromDatabase() {
    logger.info(`Restoring cron jobs from database...`)

    try {
      const savedCronJobs = await cronDbService.getEnabledCronJobs()

      if (savedCronJobs.length === 0) {
        logger.info(`No saved cron jobs found`)
        return
      }

      logger.info(`Found ${savedCronJobs.length} saved cron jobs to restore`)

      for (const savedJob of savedCronJobs) {
        try {
          await this.restoreSingleCronJob(savedJob)
        } catch (error) {
          logger.error(`Failed to restore cron job ${savedJob.jobId}:`, error)
          // Disable the problematic job in database
          await cronDbService.disableCronJob(savedJob.jobId)
        }
      }

      logger.info(`Cron jobs restoration complete`)
    } catch (error) {
      logger.error(`Error restoring cron jobs from database:`, error)
    }
  }

  /**
   * Restore a single cron job from saved configuration
   */
  async restoreSingleCronJob(savedJob) {
    const { jobId, projectId, cronNodeId, cronNodeLabel, cronExpression, nodes, edges } = savedJob

    if (!this.isValidCronExpression(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`)
    }

    logger.info(`⏰ Restoring cron job: ${cronNodeLabel} (${cronExpression})`)

    // Create the cron trigger node object
    const cronTriggerNode = {
      id: cronNodeId,
      data: {
        label: cronNodeLabel,
        cronExpression: cronExpression
      }
    }

    // Schedule the cron job using croner
    const scheduledJob = new Cron(cronExpression, {
      timezone: await this.getCronTimezone(),
      name: `${cronNodeLabel}_${projectId}`,
      context: {
        projectId,
        nodes,
        edges,
        cronNode: cronTriggerNode
      }
    }, async (self) => {
      logger.info(`Executing restored cron job: ${cronNodeLabel} (${cronExpression})`)
      
      // Update last run in database
      cronDbService.updateLastRun(jobId)
      
      await this.executeCronTriggeredJob(projectId, nodes, edges, cronTriggerNode)
    })

    // Store the scheduled job and config in memory
    this.scheduledJobs.set(jobId, scheduledJob)
    this.cronConfigs.set(jobId, {
      projectId,
      nodes,
      edges,
      cronExpression,
      cronNodeId,
      cronNodeLabel,
      enabled: true,
      createdAt: new Date(savedJob.createdAt),
      lastRun: savedJob.lastRun ? new Date(savedJob.lastRun) : null
    })

    logger.info(`Restored cron job: ${jobId}`)
  }

  /**
   * Execute a cron-triggered job
   */
  async executeCronTriggeredJob(projectId, nodes, edges, cronTriggerNode) {
    try {
      logger.info(`Cron trigger fired: ${cronTriggerNode.data.label}`)
      
      // Broadcast cron trigger execution to subscribed clients
      if (globalThis.broadcastToProject) {
        globalThis.broadcastToProject(projectId, {
          type: 'cron_trigger_fired',
          projectId: projectId,
          cronNodeId: cronTriggerNode.id,
          cronNodeLabel: cronTriggerNode.data.label,
          cronExpression: cronTriggerNode.data.cronExpression,
          timestamp: new Date().toISOString()
        })
      }
      
      // Update last run time in memory and database
      const jobId = `cron_${projectId}_${cronTriggerNode.id}`
      const config = this.cronConfigs.get(jobId)
      if (config) {
        config.lastRun = new Date()
        cronDbService.updateLastRun(jobId)
      }

      // Find connected execution nodes from the cron trigger
      const connectedNodes = this.findConnectedExecutionNodes(cronTriggerNode.id, nodes, edges)
      
      if (connectedNodes.length === 0) {
        logger.info(`No execution nodes connected to cron trigger: ${cronTriggerNode.data.label}`)
        
        // Broadcast warning about no connected nodes
        if (globalThis.broadcastToProject) {
          globalThis.broadcastToProject(projectId, {
            type: 'cron_trigger_warning',
            projectId: projectId,
            cronNodeId: cronTriggerNode.id,
            cronNodeLabel: cronTriggerNode.data.label,
            message: 'No execution nodes connected to cron trigger',
            timestamp: new Date().toISOString()
          })
        }
        return
      }

      // Broadcast job execution start
      if (globalThis.broadcastToProject) {
        globalThis.broadcastToProject(projectId, {
          type: 'cron_job_starting',
          projectId: projectId,
          cronNodeId: cronTriggerNode.id,
          cronNodeLabel: cronTriggerNode.data.label,
          connectedNodesCount: connectedNodes.length,
          timestamp: new Date().toISOString()
        })
      }

      // Execute the connected workflow
      const result = await executeProjectFromTrigger(projectId, nodes, edges, cronTriggerNode.id, null) // No trigger context for cron jobs
      
      // Broadcast job started with build information
      if (result.success && globalThis.broadcastToProject) {
        globalThis.broadcastToProject(projectId, {
          type: 'cron_job_started',
          projectId: projectId,
          jobId: result.jobId,
          buildNumber: result.buildNumber,
          agentId: result.agentId,
          agentName: result.agentName,
          cronNodeId: cronTriggerNode.id,
          cronNodeLabel: cronTriggerNode.data.label,
          timestamp: new Date().toISOString()
        })
      }
      
    } catch (error) {
      logger.error(`Error executing cron job for ${cronTriggerNode.data.label}:`, error)
      
      // Broadcast error to subscribed clients
      if (globalThis.broadcastToProject) {
        globalThis.broadcastToProject(projectId, {
          type: 'cron_trigger_error',
          projectId: projectId,
          cronNodeId: cronTriggerNode.id,
          cronNodeLabel: cronTriggerNode.data.label,
          error: error.message,
          timestamp: new Date().toISOString()
        })
      }
    }
  }

  /**
   * Find execution nodes connected to a trigger node
   */
  findConnectedExecutionNodes(triggerNodeId, nodes, edges) {
    const connectedNodeIds = new Set()
    const visitNode = (nodeId) => {
      const outgoingEdges = edges.filter(edge => edge.source === nodeId)
      for (const edge of outgoingEdges) {
        if (!connectedNodeIds.has(edge.target)) {
          connectedNodeIds.add(edge.target)
          visitNode(edge.target) // Recursively find connected nodes
        }
      }
    }
    
    visitNode(triggerNodeId)
    
    return nodes.filter(node => 
      connectedNodeIds.has(node.id) && 
      ['bash', 'powershell', 'cmd', 'python', 'node'].includes(node.data.nodeType)
    )
  }

  /**
   * Cancel a specific cron job
   */
  cancelCronJob(jobId) {
    const scheduledJob = this.scheduledJobs.get(jobId)
    if (scheduledJob) {
      scheduledJob.stop()
      this.scheduledJobs.delete(jobId)
      this.cronConfigs.delete(jobId)
      
      // Remove from database
      cronDbService.disableCronJob(jobId)
      
      logger.info(`🛑 Cancelled cron job and removed from database: ${jobId}`)
    }
  }

  /**
   * Cancel all cron jobs for a project
   */
  cancelProjectCronJobs(projectId) {
    const jobsToCancel = []
    for (const [jobId, config] of this.cronConfigs) {
      if (config.projectId === projectId) {
        jobsToCancel.push(jobId)
      }
    }
    
    for (const jobId of jobsToCancel) {
      this.cancelCronJob(jobId)
    }
    
    // Also clean up any orphaned database entries for this project
    cronDbService.deleteProjectCronJobs(projectId)
    
    logger.info(`🗑️ Cancelled ${jobsToCancel.length} cron jobs for project ${projectId}`)
  }

  /**
   * Get all scheduled cron jobs
   */
  getScheduledJobs() {
    const jobs = []
    for (const [jobId, config] of this.cronConfigs) {
      jobs.push({
        jobId,
        ...config,
        isRunning: this.scheduledJobs.has(jobId)
      })
    }
    return jobs
  }

  /**
   * Validate cron expression
   */
  isValidCronExpression(expression) {
    try {
      // Test if the cron expression is valid by creating a temporary cron job
      const testCron = new Cron(expression, { paused: true })
      testCron.stop()
      return true
    } catch (error) {
      logger.info(`Invalid cron expression: ${expression} - ${error.message}`)
      return false
    }
  }

  /**
   * Update cron jobs when project is saved
   */
  async updateProjectCronJobs(projectId, nodes, edges) {
    // Cancel existing jobs for this project
    this.cancelProjectCronJobs(projectId)
    
    // Schedule new jobs
    await this.scheduleCronJob(projectId, nodes, edges)
  }
}

// Create singleton instance
const cronManager = new CronManager()

export { cronManager }