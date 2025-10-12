/**
 * Cron Database Service - Handles persistence of cron job configurations
 */

import Database from 'better-sqlite3'
import { resolve } from 'path'

class CronDatabaseService {
  constructor() {
    const dbPath = resolve(process.cwd(), 'data', 'cron.db')
    this.db = new Database(dbPath)
    this.initTables()
  }

  initTables() {
    // Create cron_jobs table to store scheduled cron configurations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cron_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT UNIQUE NOT NULL,
        project_id TEXT NOT NULL,
        cron_node_id TEXT NOT NULL,
        cron_node_label TEXT NOT NULL,
        cron_expression TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_run DATETIME,
        nodes_json TEXT NOT NULL,
        edges_json TEXT NOT NULL
      )
    `)

    // Create index for faster lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cron_jobs_project_id ON cron_jobs(project_id);
      CREATE INDEX IF NOT EXISTS idx_cron_jobs_enabled ON cron_jobs(enabled);
    `)

    console.log('📊 Cron database tables initialized')
  }

  /**
   * Save a cron job configuration to database
   */
  saveCronJob(jobConfig) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO cron_jobs 
      (job_id, project_id, cron_node_id, cron_node_label, cron_expression, enabled, nodes_json, edges_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `)

    return stmt.run(
      jobConfig.jobId,
      jobConfig.projectId,
      jobConfig.cronNodeId,
      jobConfig.cronNodeLabel,
      jobConfig.cronExpression,
      jobConfig.enabled ? 1 : 0,
      JSON.stringify(jobConfig.nodes),
      JSON.stringify(jobConfig.edges)
    )
  }

  /**
   * Get all enabled cron jobs from database
   */
  getEnabledCronJobs() {
    const stmt = this.db.prepare(`
      SELECT * FROM cron_jobs WHERE enabled = 1 ORDER BY created_at
    `)

    const rows = stmt.all()
    return rows.map(row => ({
      jobId: row.job_id,
      projectId: row.project_id,
      cronNodeId: row.cron_node_id,
      cronNodeLabel: row.cron_node_label,
      cronExpression: row.cron_expression,
      enabled: Boolean(row.enabled),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastRun: row.last_run,
      nodes: JSON.parse(row.nodes_json),
      edges: JSON.parse(row.edges_json)
    }))
  }

  /**
   * Get cron jobs for a specific project
   */
  getCronJobsForProject(projectId) {
    const stmt = this.db.prepare(`
      SELECT * FROM cron_jobs WHERE project_id = ? ORDER BY created_at
    `)

    const rows = stmt.all(projectId)
    return rows.map(row => ({
      jobId: row.job_id,
      projectId: row.project_id,
      cronNodeId: row.cron_node_id,
      cronNodeLabel: row.cron_node_label,
      cronExpression: row.cron_expression,
      enabled: Boolean(row.enabled),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastRun: row.last_run,
      nodes: JSON.parse(row.nodes_json),
      edges: JSON.parse(row.edges_json)
    }))
  }

  /**
   * Delete cron jobs for a project
   */
  deleteCronJobsForProject(projectId) {
    const stmt = this.db.prepare(`
      DELETE FROM cron_jobs WHERE project_id = ?
    `)
    return stmt.run(projectId)
  }

  /**
   * Update last run time for a cron job
   */
  updateLastRun(jobId, lastRun = new Date()) {
    const stmt = this.db.prepare(`
      UPDATE cron_jobs SET last_run = ? WHERE job_id = ?
    `)
    return stmt.run(lastRun.toISOString(), jobId)
  }

  /**
   * Disable a cron job
   */
  disableCronJob(jobId) {
    const stmt = this.db.prepare(`
      UPDATE cron_jobs SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE job_id = ?
    `)
    return stmt.run(jobId)
  }

  /**
   * Enable a cron job
   */
  enableCronJob(jobId) {
    const stmt = this.db.prepare(`
      UPDATE cron_jobs SET enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE job_id = ?
    `)
    return stmt.run(jobId)
  }

  /**
   * Delete all cron jobs for a specific project
   */
  deleteProjectCronJobs(projectId) {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM cron_jobs 
        WHERE project_id = ?
      `)
      const result = stmt.run(projectId)
      console.log(`🗑️ Deleted ${result.changes} cron jobs for project ${projectId}`)
      return result.changes
    } catch (error) {
      console.error('❌ Error deleting project cron jobs:', error)
      throw error
    }
  }

  /**
   * Get database statistics
   */
  getStats() {
    try {
      const totalStmt = this.db.prepare(`SELECT COUNT(*) as total FROM cron_jobs`)
      const enabledStmt = this.db.prepare(`SELECT COUNT(*) as enabled FROM cron_jobs WHERE enabled = 1`)
      
      const total = totalStmt.get().total
      const enabled = enabledStmt.get().enabled
      
      return { total, enabled, disabled: total - enabled }
    } catch (error) {
      console.error('❌ Error getting database stats:', error)
      return { total: 0, enabled: 0, disabled: 0 }
    }
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close()
  }
}

// Create singleton instance
const cronDbService = new CronDatabaseService()

export { cronDbService }