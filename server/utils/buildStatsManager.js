import { getDB, builds, items } from './database.js'
import { eq, desc, and, gte, lte, count, avg, min, max } from 'drizzle-orm'
import { broadcastBuildCompletion } from '../plugins/websocket.js'
import logger, { createBuildLogger, closeBuildLogger } from './logger.js'
import { executionStateManager } from './executionStateManager.js'

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
   * @returns {Promise<Object>} - { projectId, buildNumber }
   */
  async startBuild(buildData) {
    if (!this.db) await this.initialize()

    const now = new Date().toISOString()

    // Fetch project name for historical record
    let projectName = buildData.projectName
    if (!projectName) {
      const [project] = await this.db
        .select({ name: items.name })
        .from(items)
        .where(eq(items.id, buildData.projectId))
        .limit(1)
      projectName = project?.name || buildData.projectId
    }

    // Get the next build number for this project
    const [lastBuild] = await this.db
      .select({ maxBuildNumber: max(builds.buildNumber) })
      .from(builds)
      .where(eq(builds.projectId, buildData.projectId))

    const buildNumber = (lastBuild?.maxBuildNumber || 0) + 1

    const build = {
      projectId: buildData.projectId,
      projectName: projectName,
      buildNumber: buildNumber,
      agentId: buildData.agentId || null,
      agentName: buildData.agentName || buildData.agentId || 'Local',
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

    logger.info(`Started build #${buildNumber} for project "${projectName}"`)

    // Create a build-specific logger for capturing all build-related logs
    const buildLogger = createBuildLogger(buildData.projectId, buildNumber)
    buildLogger.info(`Build #${buildNumber} started for project "${projectName}"`)
    buildLogger.info(`Agent: ${buildData.agentName || buildData.agentId || 'Local'}`)
    buildLogger.info(`Trigger: ${buildData.trigger || 'manual'}`)

    return {
      projectId: buildData.projectId,
      projectName: projectName,
      buildNumber,
      buildLogger // Return the logger so it can be used during execution
    }
  }

  /**
   * Update a build record with new information
   * @param {string} projectId - Project ID
   * @param {number} buildNumber - Build number
   * @param {Object} updates - Fields to update
   */
  async updateBuild(projectId, buildNumber, updates) {
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
      .where(and(
        eq(builds.projectId, projectId),
        eq(builds.buildNumber, buildNumber)
      ))
  }

  /**
   * Add a log entry to a build
   * @param {string} projectId - Project ID
   * @param {number} buildNumber - Build number
   * @param {Object} logEntry - Log entry data
   */
  async addBuildLog(projectId, buildNumber, logEntry) {
    if (!this.db) await this.initialize()

    const now = new Date().toISOString()

    // Get current build
    const [build] = await this.db.select({ outputLog: builds.outputLog }).from(builds).where(and(
      eq(builds.projectId, projectId),
      eq(builds.buildNumber, buildNumber)
    ))
    if (!build) {
      throw new Error(`Build #${buildNumber} for project ${projectId} not found`)
    }

    // Parse existing logs
    let logs = []
    if (build.outputLog) {
      try {
        logs = JSON.parse(build.outputLog)
      } catch (e) {
        logs = []
      }
    }

    // Add new log entry
    // Note: source is now the nodeLabel for display purposes
    const newLogEntry = {
      timestamp: logEntry.timestamp || now,
      nanotime: logEntry.nanotime || process.hrtime.bigint().toString(),
      level: logEntry.level || 'info',
      message: logEntry.message,
      source: logEntry.source || 'System', // source is the nodeLabel
      command: logEntry.command || null
    }

    logs.push(newLogEntry)

    // Sort logs by nanotime to ensure correct order
    logs.sort((a, b) => {
      const aNano = a.nanotime || '0'
      const bNano = b.nanotime || '0'
      // Use string comparison for BigInt strings to avoid conversion overhead
      if (aNano.length !== bNano.length) {
        return aNano.length - bNano.length
      }
      return aNano < bNano ? -1 : aNano > bNano ? 1 : 0
    })

    // Update build with new logs
    await this.db.update(builds)
      .set({
        outputLog: JSON.stringify(logs),
        updatedAt: now
      })
      .where(and(
        eq(builds.projectId, projectId),
        eq(builds.buildNumber, buildNumber)
      ))

    logger.debug(`Added log entry to build #${buildNumber} (${projectId}): ${logEntry.message}`)
  }

  /**
   * Finish a build and update statistics
   * @param {string} projectId - Project ID
   * @param {number} buildNumber - Build number
   * @param {Object} result - Build result
   */
  async finishBuild(projectId, buildNumber, result) {
    if (!this.db) await this.initialize()

    const now = new Date().toISOString()

    // Get the build to calculate duration
    const [build] = await this.db.select().from(builds).where(and(
      eq(builds.projectId, projectId),
      eq(builds.buildNumber, buildNumber)
    ))
    if (!build) {
      throw new Error(`Build #${buildNumber} for project ${projectId} not found`)
    }

    // Don't allow changing status from "failure" to "success"
    // Once a build fails, it stays failed even if failure handlers succeed
    if (build.status === 'failure' && result.status === 'success') {
      logger.warn(`Prevented changing build #${buildNumber} status from "failure" to "success" - build remains failed`)
      return
    }

    const duration = new Date(now) - new Date(build.startedAt)

    // Persist execution state to database before build completion
    const finalState = executionStateManager.getBuildState(projectId, buildNumber)
    logger.info(`Final execution state for build #${buildNumber}:`, finalState)
    await executionStateManager.persistBuildState(projectId, buildNumber)
    logger.info(`Persisted execution state for build #${buildNumber}`)

    // Update the build record
    await this.db.update(builds)
      .set({
        status: result.status,
        message: 'Build completed',
        finishedAt: now,
        duration: duration,
        nodesExecuted: result.nodesExecuted || build.nodesExecuted,
        updatedAt: now
      })
      .where(and(
        eq(builds.projectId, projectId),
        eq(builds.buildNumber, buildNumber)
      ))

    // Clean up execution state from memory (already persisted to DB)
    await executionStateManager.cleanupBuildState(projectId, buildNumber)

    // Broadcast build completion for job triggers
    await this.broadcastBuildCompletion(projectId, result.status, {
      projectId,
      buildNumber,
      status: result.status,
      message: result.message,
      duration,
      trigger: build.trigger
    })

    // Clean up old builds if needed
    await this.cleanupOldBuilds(projectId)

    logger.info(`Finished build #${buildNumber} for project "${build.projectName}" with status: ${result.status}`)

    // Close and delete the build-specific log file after a short delay
    // This allows notifications to attach the file before it's deleted
    setTimeout(async () => {
      await closeBuildLogger(projectId, buildNumber)
    }, 30000) // 30 second delay
  }


  /**
   * Get a specific build
   * @param {string} projectId - Project ID
   * @param {number} buildNumber - Build number
   * @returns {Promise<Object|null>} - Build object or null if not found
   */
  async getBuild(projectId, buildNumber) {
    if (!this.db) await this.initialize()

    const [build] = await this.db
      .select()
      .from(builds)
      .where(and(
        eq(builds.projectId, projectId),
        eq(builds.buildNumber, buildNumber)
      ))
      .limit(1)

    return build || null
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
   * Clean up old builds according to retention policy
   * @param {string} projectId - Project ID
   */
  async cleanupOldBuilds(projectId) {
    if (!this.db) await this.initialize()

    // Get retention settings
    const stats = await this.getProjectStats(projectId)
    const maxBuilds = stats.maxBuildsToKeep || 50

    // Get builds to delete (keep only the most recent N builds)
    const buildsToKeep = await this.db
      .select({ buildNumber: builds.buildNumber, projectName: builds.projectName })
      .from(builds)
      .where(eq(builds.projectId, projectId))
      .orderBy(desc(builds.startedAt))
      .limit(maxBuilds)

    const keepBuildNumbers = buildsToKeep.map(b => b.buildNumber)
    const projectName = buildsToKeep[0]?.projectName || projectId

    // Get all builds for this project
    const allBuilds = await this.db
      .select({ buildNumber: builds.buildNumber })
      .from(builds)
      .where(eq(builds.projectId, projectId))

    // Find builds to delete (those not in the keep list)
    const buildsToDelete = allBuilds.filter(build => !keepBuildNumbers.includes(build.buildNumber))

    if (buildsToDelete.length > 0) {
      const buildNumbers = buildsToDelete.map(b => b.buildNumber)

      // Delete builds
      for (const buildNumber of buildNumbers) {
        await this.db.delete(builds).where(and(
          eq(builds.projectId, projectId),
          eq(builds.buildNumber, buildNumber)
        ))
      }

      logger.info(`Cleaned up ${buildNumbers.length} old builds for project "${projectName}"`)
    }
  }

  /**
   * Broadcast build completion event for job triggers
   * @param {string} projectId - Project ID that completed
   * @param {string} status - Build status (success, failure, cancelled)
   * @param {Object} buildData - Additional build data
   */
  async broadcastBuildCompletion(projectId, status, buildData) {
    try {
      // Broadcast the build completion event
      await broadcastBuildCompletion({
        type: 'build_completed',
        sourceProjectId: projectId,
        status: status,
        buildData: buildData,
        timestamp: new Date().toISOString()
      })

      logger.info(`Broadcasted build completion for project ${projectId} with status: ${status}`)
    } catch (error) {
      logger.error('Failed to broadcast build completion:', error)
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

      logger.info(`Updated retention settings for project ${projectId}:`, updateData)

      // Trigger cleanup with new settings
      await this.cleanupOldBuilds(projectId)
    }

    return true
  }

  async getAllBuildStats() {
    if (!this.db) await this.initialize()

    const projects = await this.db
      .select()
      .from(items)
      .where(eq(items.type, 'project'))
    const stats = []
    for (const project of projects) {
      const projectStats = await this.getProjectStats(project.id)
      stats.push({
        ...projectStats,
        projectId: project.id,
        projectName: project.name
      })
    }
    return stats
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