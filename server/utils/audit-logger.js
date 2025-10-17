import { nanoid } from 'nanoid'
import { eq, and, desc } from 'drizzle-orm'

/**
 * Audit Logger Utility
 * Tracks all changes to folders and projects with full history
 */
export class AuditLogger {
  constructor(db, schema) {
    this.db = db
    this.auditLogs = schema.auditLogs
    this.projectSnapshots = schema.projectSnapshots
  }

  /**
   * Log an audit event
   * @param {Object} params
   * @param {string} params.entityType - 'folder' or 'project'
   * @param {string} params.entityId - ID of the folder/project
   * @param {string} params.entityName - Name of the folder/project
   * @param {string} params.action - 'create', 'update', 'delete', 'restore'
   * @param {string} params.userId - ID of user performing action
   * @param {string} params.userName - Name of user performing action
   * @param {string} params.changesSummary - Human-readable summary
   * @param {Object} params.previousData - Data before change (optional)
   * @param {Object} params.newData - Data after change (optional)
   * @param {string} params.ipAddress - User IP (optional)
   * @param {string} params.userAgent - User agent string (optional)
   */
  async logEvent({
    entityType,
    entityId,
    entityName,
    action,
    userId,
    userName,
    changesSummary = null,
    previousData = null,
    newData = null,
    ipAddress = null,
    userAgent = null
  }) {
    try {
      const auditLog = {
        id: nanoid(),
        entityType,
        entityId,
        entityName,
        action,
        userId,
        userName,
        changesSummary,
        previousData: previousData ? JSON.stringify(previousData) : null,
        newData: newData ? JSON.stringify(newData) : null,
        ipAddress,
        userAgent,
        createdAt: new Date().toISOString()
      }

      await this.db.insert(this.auditLogs).values(auditLog)

      console.log(`📝 Audit log: ${action} ${entityType} "${entityName}" by ${userName}`)
      return auditLog
    } catch (error) {
      console.error('❌ Error logging audit event:', error)
      throw error
    }
  }

  /**
   * Create a project snapshot for version history
   * @param {Object} params
   * @param {string} params.projectId - Project ID
   * @param {string} params.projectName - Project name
   * @param {Object} params.diagramData - Full project configuration
   * @param {string} params.status - Project status
   * @param {number} params.maxBuildsToKeep - Retention setting
   * @param {number} params.maxLogDays - Retention setting
   * @param {string} params.userId - User creating snapshot
   * @param {string} params.userName - User name
   * @param {string} params.snapshotType - 'auto' or 'manual'
   * @param {string} params.description - Optional description
   */
  async createSnapshot({
    projectId,
    projectName,
    diagramData,
    status,
    maxBuildsToKeep,
    maxLogDays,
    userId,
    userName,
    snapshotType = 'auto',
    description = null
  }) {
    try {
      // Get the next version number
      const existingSnapshots = await this.db
        .select()
        .from(this.projectSnapshots)
        .where(eq(this.projectSnapshots.projectId, projectId))
        .orderBy(desc(this.projectSnapshots.version))
        .limit(1)

      const nextVersion = existingSnapshots.length > 0 ? existingSnapshots[0].version + 1 : 1

      const snapshot = {
        id: nanoid(),
        projectId,
        projectName,
        version: nextVersion,
        diagramData: JSON.stringify(diagramData),
        description,
        status,
        maxBuildsToKeep,
        maxLogDays,
        createdBy: userId,
        createdByName: userName,
        snapshotType,
        createdAt: new Date().toISOString()
      }

      await this.db.insert(this.projectSnapshots).values(snapshot)

      console.log(`📸 Snapshot created: "${projectName}" v${nextVersion} (${snapshotType})`)
      return snapshot
    } catch (error) {
      console.error('❌ Error creating snapshot:', error)
      throw error
    }
  }

  /**
   * Get audit logs for an entity
   * @param {string} entityId - Entity ID
   * @param {number} limit - Max number of logs to return
   */
  async getEntityLogs(entityId, limit = 50) {
    try {
      const logs = await this.db
        .select()
        .from(this.auditLogs)
        .where(eq(this.auditLogs.entityId, entityId))
        .orderBy(desc(this.auditLogs.createdAt))
        .limit(limit)

      return logs.map(log => ({
        ...log,
        previousData: log.previousData ? JSON.parse(log.previousData) : null,
        newData: log.newData ? JSON.parse(log.newData) : null
      }))
    } catch (error) {
      console.error('❌ Error fetching entity logs:', error)
      throw error
    }
  }

  /**
   * Get all snapshots for a project
   * @param {string} projectId - Project ID
   * @param {number} limit - Max number of snapshots to return
   */
  async getProjectSnapshots(projectId, limit = 20) {
    try {
      const snapshots = await this.db
        .select()
        .from(this.projectSnapshots)
        .where(eq(this.projectSnapshots.projectId, projectId))
        .orderBy(desc(this.projectSnapshots.version))
        .limit(limit)

      return snapshots.map(snapshot => ({
        ...snapshot,
        diagramData: JSON.parse(snapshot.diagramData)
      }))
    } catch (error) {
      console.error('❌ Error fetching project snapshots:', error)
      throw error
    }
  }

  /**
   * Get a specific snapshot version
   * @param {string} projectId - Project ID
   * @param {number} version - Version number
   */
  async getSnapshot(projectId, version) {
    try {
      const snapshots = await this.db
        .select()
        .from(this.projectSnapshots)
        .where(
          and(
            eq(this.projectSnapshots.projectId, projectId),
            eq(this.projectSnapshots.version, version)
          )
        )
        .limit(1)

      if (snapshots.length === 0) {
        return null
      }

      return {
        ...snapshots[0],
        diagramData: JSON.parse(snapshots[0].diagramData)
      }
    } catch (error) {
      console.error('❌ Error fetching snapshot:', error)
      throw error
    }
  }

  /**
   * Get audit logs by user
   * @param {string} userId - User ID
   * @param {number} limit - Max number of logs to return
   */
  async getUserLogs(userId, limit = 100) {
    try {
      const logs = await this.db
        .select()
        .from(this.auditLogs)
        .where(eq(this.auditLogs.userId, userId))
        .orderBy(desc(this.auditLogs.createdAt))
        .limit(limit)

      return logs.map(log => ({
        ...log,
        previousData: log.previousData ? JSON.parse(log.previousData) : null,
        newData: log.newData ? JSON.parse(log.newData) : null
      }))
    } catch (error) {
      console.error('❌ Error fetching user logs:', error)
      throw error
    }
  }

  /**
   * Get recent audit logs across all entities
   * @param {number} limit - Max number of logs to return
   * @param {string} entityType - Optional filter by entity type
   */
  async getRecentLogs(limit = 100, entityType = null) {
    try {
      let query = this.db.select().from(this.auditLogs)

      if (entityType) {
        query = query.where(eq(this.auditLogs.entityType, entityType))
      }

      const logs = await query
        .orderBy(desc(this.auditLogs.createdAt))
        .limit(limit)

      return logs.map(log => ({
        ...log,
        previousData: log.previousData ? JSON.parse(log.previousData) : null,
        newData: log.newData ? JSON.parse(log.newData) : null
      }))
    } catch (error) {
      console.error('❌ Error fetching recent logs:', error)
      throw error
    }
  }

  /**
   * Clean up old audit logs
   * @param {number} daysToKeep - Keep logs from last N days
   */
  async cleanupOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
      const cutoffISO = cutoffDate.toISOString()

      // Note: This would need to use raw SQL for proper date comparison in SQLite
      // For now, this is a placeholder
      console.log(`🧹 Would clean up audit logs older than ${cutoffISO}`)
      // await this.db.delete(this.auditLogs).where(lt(this.auditLogs.createdAt, cutoffISO))
    } catch (error) {
      console.error('❌ Error cleaning up old logs:', error)
      throw error
    }
  }
}

/**
 * Helper function to generate a human-readable changes summary
 * @param {Object} previousData - Data before change
 * @param {Object} newData - Data after change
 * @returns {string} Summary of changes
 */
export function generateChangesSummary(previousData, newData) {
  const changes = []

  if (!previousData) {
    return 'Created new item'
  }

  if (!newData) {
    return 'Deleted item'
  }

  // Compare common fields
  const fieldsToCheck = ['name', 'description', 'status', 'diagramData', 'maxBuildsToKeep', 'maxLogDays']

  for (const field of fieldsToCheck) {
    if (previousData[field] !== newData[field]) {
      if (field === 'diagramData') {
        changes.push('Updated project configuration')
      } else if (field === 'name') {
        changes.push(`Renamed from "${previousData[field]}" to "${newData[field]}"`)
      } else if (field === 'description') {
        changes.push('Updated description')
      } else if (field === 'status') {
        changes.push(`Status changed to ${newData[field]}`)
      } else {
        changes.push(`Updated ${field}`)
      }
    }
  }

  return changes.length > 0 ? changes.join(', ') : 'No significant changes'
}
