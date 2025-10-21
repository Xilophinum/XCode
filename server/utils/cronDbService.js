/**
 * Cron Database Service - Handles persistence of cron job configurations
 * Now uses the main database with Drizzle ORM
 */

import { getDB, cronJobs } from './database.js'
import { eq, and } from 'drizzle-orm'

class CronDatabaseService {
  constructor() {
    this.db = null
  }

  async ensureInitialized() {
    if (!this.db) {
      this.db = await getDB()
      console.log('📊 Cron database service initialized (using main database)')
    }
  }

  /**
   * Save a cron job configuration to database
   */
  async saveCronJob(jobConfig) {
    await this.ensureInitialized()

    const now = new Date().toISOString()

    const cronJob = {
      id: jobConfig.jobId,
      projectId: jobConfig.projectId,
      cronNodeId: jobConfig.cronNodeId,
      cronNodeLabel: jobConfig.cronNodeLabel,
      cronExpression: jobConfig.cronExpression,
      enabled: jobConfig.enabled ? 'true' : 'false',
      nodes: JSON.stringify(jobConfig.nodes),
      edges: JSON.stringify(jobConfig.edges),
      lastRun: null,
      createdAt: now,
      updatedAt: now
    }

    // Use upsert pattern: try to update first, if no rows affected then insert
    const existing = await this.db
      .select()
      .from(cronJobs)
      .where(eq(cronJobs.id, jobConfig.jobId))
      .limit(1)

    if (existing.length > 0) {
      // Update existing
      await this.db
        .update(cronJobs)
        .set({
          cronNodeLabel: jobConfig.cronNodeLabel,
          cronExpression: jobConfig.cronExpression,
          enabled: jobConfig.enabled ? 'true' : 'false',
          nodes: JSON.stringify(jobConfig.nodes),
          edges: JSON.stringify(jobConfig.edges),
          updatedAt: now
        })
        .where(eq(cronJobs.id, jobConfig.jobId))
    } else {
      // Insert new
      await this.db.insert(cronJobs).values(cronJob)
    }

    console.log(`💾 Cron job saved to database: ${jobConfig.jobId}`)
    return cronJob
  }

  /**
   * Get all enabled cron jobs from database
   */
  async getEnabledCronJobs() {
    await this.ensureInitialized()

    try {
      const results = await this.db
        .select()
        .from(cronJobs)
        .where(eq(cronJobs.enabled, 'true'))

      console.log(`📋 Found ${results.length} enabled cron jobs in database`)

      return results.map(row => ({
        jobId: row.id,
        projectId: row.projectId,
        cronNodeId: row.cronNodeId,
        cronNodeLabel: row.cronNodeLabel,
        cronExpression: row.cronExpression,
        enabled: row.enabled === 'true',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastRun: row.lastRun,
        nodes: JSON.parse(row.nodes),
        edges: JSON.parse(row.edges)
      }))
    } catch (error) {
      console.error('❌ Error getting enabled cron jobs:', error)
      return [] // Return empty array on error
    }
  }

  /**
   * Get cron jobs for a specific project
   */
  async getCronJobsForProject(projectId) {
    await this.ensureInitialized()

    const results = await this.db
      .select()
      .from(cronJobs)
      .where(eq(cronJobs.projectId, projectId))

    return results.map(row => ({
      jobId: row.id,
      projectId: row.projectId,
      cronNodeId: row.cronNodeId,
      cronNodeLabel: row.cronNodeLabel,
      cronExpression: row.cronExpression,
      enabled: row.enabled === 'true',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastRun: row.lastRun,
      nodes: JSON.parse(row.nodes),
      edges: JSON.parse(row.edges)
    }))
  }

  /**
   * Delete cron jobs for a project
   */
  async deleteCronJobsForProject(projectId) {
    await this.ensureInitialized()

    const result = await this.db
      .delete(cronJobs)
      .where(eq(cronJobs.projectId, projectId))

    return result
  }

  /**
   * Update last run time for a cron job
   */
  async updateLastRun(jobId, lastRun = new Date()) {
    await this.ensureInitialized()

    await this.db
      .update(cronJobs)
      .set({
        lastRun: lastRun.toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(cronJobs.id, jobId))

    return true
  }

  /**
   * Disable a cron job
   */
  async disableCronJob(jobId) {
    await this.ensureInitialized()

    await this.db
      .update(cronJobs)
      .set({
        enabled: 'false',
        updatedAt: new Date().toISOString()
      })
      .where(eq(cronJobs.id, jobId))

    return true
  }

  /**
   * Enable a cron job
   */
  async enableCronJob(jobId) {
    await this.ensureInitialized()

    await this.db
      .update(cronJobs)
      .set({
        enabled: 'true',
        updatedAt: new Date().toISOString()
      })
      .where(eq(cronJobs.id, jobId))

    return true
  }

  /**
   * Delete all cron jobs for a specific project
   */
  async deleteProjectCronJobs(projectId) {
    try {
      await this.ensureInitialized()

      const result = await this.db
        .delete(cronJobs)
        .where(eq(cronJobs.projectId, projectId))

      console.log(`🗑️ Deleted cron jobs for project ${projectId}`)
      return result
    } catch (error) {
      console.error('❌ Error deleting project cron jobs:', error)
      throw error
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      await this.ensureInitialized()

      const allJobs = await this.db.select().from(cronJobs)
      const total = allJobs.length
      const enabled = allJobs.filter(job => job.enabled === 'true').length

      return { total, enabled, disabled: total - enabled }
    } catch (error) {
      console.error('❌ Error getting database stats:', error)
      return { total: 0, enabled: 0, disabled: 0 }
    }
  }
}

// Create singleton instance
const cronDbService = new CronDatabaseService()

export { cronDbService }
