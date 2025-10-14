import { getDB } from './database.js'
import { builds, buildLogs, items } from './schema.js'
import { eq, desc, and, gte, lte, count, avg, min, max } from 'drizzle-orm'

export class BuildStatsManager {
  constructor() {
    this.db = null
  }

  async initialize() {
    this.db = await getDB()
  }

  /**
   * Start a new build record
   * @param {Object} buildData - Build information
   * @returns {Promise<string>} - Build ID
   */
  async startBuild(buildData) {
    if (!this.db) await this.initialize()

    const buildId = `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    // Get the next build number for this project
    const [lastBuild] = await this.db
      .select({ maxBuildNumber: max(builds.buildNumber) })
      .from(builds)
      .where(eq(builds.projectId, buildData.projectId))
    
    const buildNumber = (lastBuild?.maxBuildNumber || 0) + 1

    const build = {
      id: buildId,
      projectId: buildData.projectId,
      buildNumber: buildNumber,
      agentId: buildData.agentId || null,
      agentName: buildData.agentName || buildData.agentId || 'Local',
      jobId: buildData.jobId || null,
      trigger: buildData.trigger || 'manual',
      status: 'running',
      message: buildData.message || 'Build started',
      startedAt: now,
      nodeCount: buildData.nodeCount || 0,
      nodesExecuted: 0,
      gitBranch: buildData.branch || null,
      gitCommit: buildData.commit || null,
      metadata: buildData.metadata ? JSON.stringify(buildData.metadata) : null,
      createdAt: now,
      updatedAt: now
    }

    await this.db.insert(builds).values(build)

    // Log the start
    await this.addBuildLog(buildId, {
      level: 'info',
      message: 'Build started',
      source: 'system',
      sequence: 1
    })

    console.log(`📊 Started build #${buildNumber} (${buildId}) for project ${buildData.projectId}`)
    return buildId
  }

  /**
   * Update a build record with new information
   * @param {string} buildId - Build ID
   * @param {Object} updates - Fields to update
   */
  async updateBuild(buildId, updates) {
    if (!this.db) await this.initialize()

    const now = new Date().toISOString()
    
    // Prepare update object with timestamp
    const updateData = {
      ...updates,
      updatedAt: now
    }

    // Update the build record
    await this.db.update(builds)
      .set(updateData)
      .where(eq(builds.id, buildId))
  }

  /**
   * Finish a build and update statistics
   * @param {string} buildId - Build ID
   * @param {Object} result - Build result
   */
  async finishBuild(buildId, result) {
    if (!this.db) await this.initialize()

    const now = new Date().toISOString()

    // Get the build to calculate duration
    const [build] = await this.db.select().from(builds).where(eq(builds.id, buildId))
    if (!build) {
      throw new Error(`Build ${buildId} not found`)
    }

    const duration = new Date(now) - new Date(build.startedAt)

    // Update the build record
    await this.db.update(builds)
      .set({
        status: result.status,
        message: result.message || 'Build completed',
        finishedAt: now,
        duration: duration,
        nodesExecuted: result.nodesExecuted || build.nodesExecuted,
        updatedAt: now
      })
      .where(eq(builds.id, buildId))

    // Log the completion
    await this.addBuildLog(buildId, {
      level: result.status === 'success' ? 'success' : 'error',
      message: `Build ${result.status}: ${result.message || 'No message'}`,
      source: 'system'
    })

    // Update project statistics
    await this.updateProjectStats(build.projectId)

    // Clean up old builds if needed
    await this.cleanupOldBuilds(build.projectId)

    console.log(`📊 Finished build ${buildId} with status: ${result.status}`)
  }

  /**
   * Add a log entry to a build
   * @param {string} buildId - Build ID
   * @param {Object} logData - Log data
   */
  async addBuildLog(buildId, logData) {
    if (!this.db) await this.initialize()

    // Get the next sequence number
    const [result] = await this.db.select({ maxSeq: max(buildLogs.sequence) })
      .from(buildLogs)
      .where(eq(buildLogs.buildId, buildId))

    const sequence = (result?.maxSeq || 0) + 1
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    const log = {
      id: logId,
      buildId: buildId,
      nodeId: logData.nodeId || null,
      level: logData.level,
      message: logData.message,
      command: logData.command || null,
      output: logData.output || null,
      timestamp: logData.timestamp || now,
      sequence: sequence,
      source: logData.source || 'system',
      metadata: logData.metadata ? JSON.stringify(logData.metadata) : null,
      createdAt: now
    }

    await this.db.insert(buildLogs).values(log)
  }

  /**
   * Update project build statistics
   * @param {string} projectId - Project ID
   */
  async updateProjectStats(projectId) {
    // This method is now deprecated since we calculate stats in real-time
    // Keeping it for backwards compatibility but it's essentially a no-op
    console.log(`📊 updateProjectStats called for project ${projectId} (now using real-time calculation)`)
    return true
  }

  /**
   * Get project build statistics
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} - Build statistics
   */
  async getProjectStats(projectId) {
    if (!this.db) await this.initialize()

    // Get project retention settings
    const [project] = await this.db
      .select({
        maxBuildsToKeep: items.maxBuildsToKeep,
        maxLogDays: items.maxLogDays
      })
      .from(items)
      .where(eq(items.id, projectId))
      .limit(1)

    // Calculate stats directly from builds table for real-time accuracy
    const buildCounts = await this.db
      .select({
        status: builds.status,
        count: count()
      })
      .from(builds)
      .where(eq(builds.projectId, projectId))
      .groupBy(builds.status)

    // Get performance metrics
    const [performanceMetrics] = await this.db
      .select({
        avgDuration: avg(builds.duration),
        fastestBuild: min(builds.duration),
        slowestBuild: max(builds.duration)
      })
      .from(builds)
      .where(and(
        eq(builds.projectId, projectId),
        eq(builds.status, 'success')
      ))

    // Get the most recent build
    const [lastBuild] = await this.db
      .select()
      .from(builds)
      .where(eq(builds.projectId, projectId))
      .orderBy(desc(builds.startedAt))
      .limit(1)

    // Calculate totals
    const stats = {
      totalBuilds: 0,
      successfulBuilds: 0,
      failedBuilds: 0,
      cancelledBuilds: 0
    }

    for (const { status, count: statusCount } of buildCounts) {
      stats.totalBuilds += statusCount
      if (status === 'success') stats.successfulBuilds = statusCount
      else if (status === 'failure') stats.failedBuilds = statusCount
      else if (status === 'cancelled') stats.cancelledBuilds = statusCount
    }

    const successRate = stats.totalBuilds > 0 
      ? stats.successfulBuilds / stats.totalBuilds 
      : 1

    return {
      totalBuilds: stats.totalBuilds,
      successfulBuilds: stats.successfulBuilds,
      failedBuilds: stats.failedBuilds,
      cancelledBuilds: stats.cancelledBuilds,
      successRate,
      lastBuildStatus: lastBuild?.status || null,
      lastBuildAt: lastBuild?.startedAt || null,
      averageDuration: Math.round(performanceMetrics?.avgDuration || 0),
      fastestBuild: performanceMetrics?.fastestBuild || null,
      slowestBuild: performanceMetrics?.slowestBuild || null,
      // Include retention settings with fallback defaults
      maxBuildsToKeep: project?.maxBuildsToKeep || 50,
      maxLogDays: project?.maxLogDays || 30
    }
  }

  /**
   * Get builds for a project with pagination
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Builds with metadata
   */
  async getProjectBuilds(projectId, options = {}) {
    if (!this.db) await this.initialize()

    const {
      page = 1,
      pageSize = 20,
      status = null,
      startDate = null,
      endDate = null
    } = options

    const pOffset = (page - 1) * pageSize
    let whereConditions = [eq(builds.projectId, projectId)]

    if (status) {
      whereConditions.push(eq(builds.status, status))
    }

    if (startDate) {
      whereConditions.push(gte(builds.startedAt, startDate))
    }

    if (endDate) {
      whereConditions.push(lte(builds.startedAt, endDate))
    }

    const whereClause = whereConditions.length > 1 
      ? and(...whereConditions) 
      : whereConditions[0]

    // Get builds
    const buildsResult = await this.db
      .select()
      .from(builds)
      .where(whereClause)
      .orderBy(desc(builds.startedAt))
      .limit(pageSize)
      .offset(pOffset)

    // Get total count
    const [{ totalCount }] = await this.db
      .select({ totalCount: count() })
      .from(builds)
      .where(whereClause)

    return {
      builds: buildsResult,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    }
  }

  /**
   * Get build logs for a specific build
   * @param {string} buildId - Build ID
   * @returns {Promise<Array>} - Build logs
   */
  async getBuildLogs(buildId) {
    if (!this.db) await this.initialize()

    return await this.db
      .select()
      .from(buildLogs)
      .where(eq(buildLogs.buildId, buildId))
      .orderBy(buildLogs.sequence)
  }

  /**
   * Clean up old builds according to retention policy
   * @param {string} projectId - Project ID
   */
  async cleanupOldBuilds(projectId) {
    if (!this.db) await this.initialize()

    // Get retention settings
    const stats = await this.getProjectStats(projectId)
    const maxBuilds = stats.maxBuildsToKeep || 50
    const maxLogDays = stats.maxLogDays || 30

    // Get builds to delete (keep only the most recent N builds)
    const buildsToKeep = await this.db
      .select({ id: builds.id })
      .from(builds)
      .where(eq(builds.projectId, projectId))
      .orderBy(desc(builds.startedAt))
      .limit(maxBuilds)

    const keepIds = buildsToKeep.map(b => b.id)

    // Get all builds for this project
    const allBuilds = await this.db
      .select({ id: builds.id })
      .from(builds)
      .where(eq(builds.projectId, projectId))

    // Find builds to delete (those not in the keep list)
    const buildsToDelete = allBuilds.filter(build => !keepIds.includes(build.id))

    if (buildsToDelete.length > 0) {
      const buildIds = buildsToDelete.map(b => b.id)
      
      // Delete build logs first
      for (const buildId of buildIds) {
        await this.db.delete(buildLogs).where(eq(buildLogs.buildId, buildId))
      }
      
      // Delete builds
      for (const buildId of buildIds) {
        await this.db.delete(builds).where(eq(builds.id, buildId))
      }

      console.log(`🧹 Cleaned up ${buildIds.length} old builds for project ${projectId}`)
    }

    // Clean up old logs (older than maxLogDays)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - maxLogDays)
    const cutoffIso = cutoffDate.toISOString()

    const oldLogs = await this.db
      .select({ id: buildLogs.id })
      .from(buildLogs)
      .where(lte(buildLogs.timestamp, cutoffIso))

    if (oldLogs.length > 0) {
      for (const log of oldLogs) {
        await this.db.delete(buildLogs).where(eq(buildLogs.id, log.id))
      }
      console.log(`🧹 Cleaned up ${oldLogs.length} old log entries`)
    }
  }

  /**
   * Update project retention settings
   * @param {string} projectId - Project ID
   * @param {Object} settings - Retention settings
   */
  async updateRetentionSettings(projectId, settings) {
    if (!this.db) await this.initialize()

    const updateData = {}
    if (settings.maxBuildsToKeep !== undefined) {
      updateData.maxBuildsToKeep = Math.max(1, parseInt(settings.maxBuildsToKeep)) // Minimum 1 build
    }
    if (settings.maxLogDays !== undefined) {
      updateData.maxLogDays = Math.max(1, parseInt(settings.maxLogDays)) // Minimum 1 day
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date().toISOString()
      
      await this.db
        .update(items)
        .set(updateData)
        .where(eq(items.id, projectId))

      console.log(`📊 Updated retention settings for project ${projectId}:`, updateData)
      
      // Trigger cleanup with new settings
      await this.cleanupOldBuilds(projectId)
    }

    return true
  }
}

// Singleton instance
let buildStatsManager = null

export async function getBuildStatsManager() {
  if (!buildStatsManager) {
    buildStatsManager = new BuildStatsManager()
    await buildStatsManager.initialize()
  }
  return buildStatsManager
}