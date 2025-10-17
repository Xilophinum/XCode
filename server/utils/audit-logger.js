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
 * Analyzes diagram changes and returns detailed diff information
 * @param {Object} previousDiagram - Previous diagram data
 * @param {Object} newDiagram - New diagram data
 * @returns {Object} Detailed change information
 */
export function analyzeDiagramChanges(previousDiagram, newDiagram) {
  if (!previousDiagram || !newDiagram) {
    return null
  }

  const changes = {
    nodesAdded: [],
    nodesDeleted: [],
    nodesModified: [],
    edgesAdded: [],
    edgesDeleted: [],
    summary: []
  }

  const prevNodes = previousDiagram.nodes || []
  const newNodes = newDiagram.nodes || []
  const prevEdges = previousDiagram.edges || []
  const newEdges = newDiagram.edges || []

  // Create lookup maps
  const prevNodeMap = new Map(prevNodes.map(n => [n.id, n]))
  const newNodeMap = new Map(newNodes.map(n => [n.id, n]))
  const prevEdgeMap = new Map(prevEdges.map(e => [`${e.source}-${e.target}`, e]))
  const newEdgeMap = new Map(newEdges.map(e => [`${e.source}-${e.target}`, e]))

  // Detect added nodes
  for (const node of newNodes) {
    if (!prevNodeMap.has(node.id)) {
      changes.nodesAdded.push({
        id: node.id,
        type: node.type,
        label: node.data?.label || 'Unlabeled',
        position: node.position
      })
    }
  }

  // Detect deleted nodes
  for (const node of prevNodes) {
    if (!newNodeMap.has(node.id)) {
      changes.nodesDeleted.push({
        id: node.id,
        type: node.type,
        label: node.data?.label || 'Unlabeled'
      })
    }
  }

  // Detect modified nodes
  for (const node of newNodes) {
    const prevNode = prevNodeMap.get(node.id)
    if (prevNode && newNodeMap.has(node.id)) {
      const modifications = []

      // Check label changes
      const prevLabel = prevNode.data?.label
      const newLabel = node.data?.label
      if (prevLabel !== newLabel) {
        modifications.push({
          field: 'label',
          before: prevLabel || '',
          after: newLabel || ''
        })
      }

      // Check script changes (for execution nodes)
      const executionNodeTypes = ['bash', 'powershell', 'cmd', 'python', 'node', 'python3', 'go', 'ruby', 'php', 'java', 'rust', 'perl']
      if (node.data?.nodeType && executionNodeTypes.includes(node.data.nodeType)) {
        const prevScript = prevNode.data?.script
        const newScript = node.data?.script
        if (prevScript !== newScript) {
          modifications.push({
            field: 'script',
            before: prevScript || '',
            after: newScript || ''
          })
        }

        // Check code changes
        const prevCode = prevNode.data?.code
        const newCode = node.data?.code
        if (prevCode !== newCode) {
          modifications.push({
            field: 'code',
            before: prevCode || '',
            after: newCode || ''
          })
        }
      }

      // Check trigger configuration changes (for trigger nodes)
      const triggerNodeTypes = ['cron', 'webhook', 'job-trigger']
      if (node.data?.nodeType && triggerNodeTypes.includes(node.data.nodeType)) {
        // For cron triggers
        if (node.data.nodeType === 'cron') {
          const prevCron = prevNode.data?.cronExpression
          const newCron = node.data?.cronExpression
          if (prevCron !== newCron) {
            modifications.push({
              field: 'cron_expression',
              before: prevCron || '',
              after: newCron || ''
            })
          }
        }

        // For webhook triggers
        if (node.data.nodeType === 'webhook') {
          const prevWebhook = JSON.stringify(prevNode.data?.webhook || {})
          const newWebhook = JSON.stringify(node.data?.webhook || {})
          if (prevWebhook !== newWebhook) {
            modifications.push({
              field: 'webhook_config',
              before: prevWebhook,
              after: newWebhook
            })
          }
        }

        // For job triggers
        if (node.data.nodeType === 'job-trigger') {
          const prevTrigger = JSON.stringify({
            projectId: prevNode.data?.triggerProjectId,
            onStatus: prevNode.data?.onStatus
          })
          const newTrigger = JSON.stringify({
            projectId: node.data?.triggerProjectId,
            onStatus: node.data?.onStatus
          })
          if (prevTrigger !== newTrigger) {
            modifications.push({
              field: 'job_trigger_config',
              before: prevTrigger,
              after: newTrigger
            })
          }
        }
      }

      // Check conditional node changes
      if (node.data?.nodeType === 'conditional') {
        const prevCondition = prevNode.data?.condition
        const newCondition = node.data?.condition
        if (prevCondition !== newCondition) {
          modifications.push({
            field: 'condition',
            before: prevCondition || '',
            after: newCondition || ''
          })
        }
      }

      // Check parallel execution changes
      if (node.data?.nodeType === 'parallel_execution') {
        const prevExecScript = prevNode.data?.script
        const newExecScript = node.data?.script
        if (prevExecScript !== newExecScript) {
          modifications.push({
            field: 'script',
            before: prevExecScript || '',
            after: newExecScript || ''
          })
        }
      }

      // Check position changes (significant movements only, > 50px)
      const posChanged = Math.abs((prevNode.position?.x || 0) - (node.position?.x || 0)) > 50 ||
                        Math.abs((prevNode.position?.y || 0) - (node.position?.y || 0)) > 50
      if (posChanged) {
        modifications.push({
          field: 'position',
          before: `(${prevNode.position?.x || 0}, ${prevNode.position?.y || 0})`,
          after: `(${node.position?.x || 0}, ${node.position?.y || 0})`
        })
      }

      if (modifications.length > 0) {
        changes.nodesModified.push({
          id: node.id,
          type: node.type,
          label: node.data?.label || 'Unlabeled',
          modifications
        })
      }
    }
  }

  // Detect added edges
  for (const [key, edge] of newEdgeMap) {
    if (!prevEdgeMap.has(key)) {
      const sourceNode = newNodeMap.get(edge.source)
      const targetNode = newNodeMap.get(edge.target)
      changes.edgesAdded.push({
        source: edge.source,
        target: edge.target,
        sourceLabel: sourceNode?.data?.label || edge.source,
        targetLabel: targetNode?.data?.label || edge.target
      })
    }
  }

  // Detect deleted edges
  for (const [key, edge] of prevEdgeMap) {
    if (!newEdgeMap.has(key)) {
      const sourceNode = prevNodeMap.get(edge.source)
      const targetNode = prevNodeMap.get(edge.target)
      changes.edgesDeleted.push({
        source: edge.source,
        target: edge.target,
        sourceLabel: sourceNode?.data?.label || edge.source,
        targetLabel: targetNode?.data?.label || edge.target
      })
    }
  }

  // Generate human-readable summary
  if (changes.nodesAdded.length > 0) {
    const labels = changes.nodesAdded.map(n => `"${n.label}"`).join(', ')
    changes.summary.push(`Added ${changes.nodesAdded.length} node${changes.nodesAdded.length > 1 ? 's' : ''}: ${labels}`)
  }

  if (changes.nodesDeleted.length > 0) {
    const labels = changes.nodesDeleted.map(n => `"${n.label}"`).join(', ')
    changes.summary.push(`Deleted ${changes.nodesDeleted.length} node${changes.nodesDeleted.length > 1 ? 's' : ''}: ${labels}`)
  }

  if (changes.nodesModified.length > 0) {
    for (const mod of changes.nodesModified) {
      const modTypes = mod.modifications.map(m => m.field).join(', ')
      changes.summary.push(`Modified "${mod.label}": ${modTypes}`)
    }
  }

  if (changes.edgesAdded.length > 0) {
    changes.summary.push(`Added ${changes.edgesAdded.length} connection${changes.edgesAdded.length > 1 ? 's' : ''}`)
  }

  if (changes.edgesDeleted.length > 0) {
    changes.summary.push(`Deleted ${changes.edgesDeleted.length} connection${changes.edgesDeleted.length > 1 ? 's' : ''}`)
  }

  return changes
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
    if (field === 'diagramData') {
      // Deep comparison for diagram data
      const prevDiagram = previousData[field]
      const newDiagram = newData[field]

      if (JSON.stringify(prevDiagram) !== JSON.stringify(newDiagram)) {
        const diagramChanges = analyzeDiagramChanges(prevDiagram, newDiagram)
        if (diagramChanges && diagramChanges.summary.length > 0) {
          changes.push(...diagramChanges.summary)
        } else {
          changes.push('Updated project diagram data')
        }
      }
    } else if (previousData[field] !== newData[field]) {
      if (field === 'name') {
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
