/**
 * DELETE /api/admin/metrics/logs
 * Delete metrics/logs for specific entities
 * 
 * Body params:
 *   entityType: 'agent' | 'server' | 'api' | 'build' (required)
 *   entityId: ID of the entity to delete logs for (optional - if not provided, deletes all of that type)
 *   from: ISO timestamp - delete logs from this date (optional)
 *   to: ISO timestamp - delete logs until this date (optional)
 */

import { getDB, metrics as metricsSchema } from '~/server/utils/database.js'
import { eq, and, gte, lte } from 'drizzle-orm'
import logger from '~/server/utils/logger.js'
import { getAuthenticatedUser } from '~/server/utils/auth.js'

export default defineEventHandler(async (event) => {
  try {
    // Verify user is authenticated and is admin
    const user = await getAuthenticatedUser(event)
    if (!user || user.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Admin access required'
      })
    }

    const body = await readBody(event)
    const { entityType, entityId, from, to } = body

    if (!entityType) {
      return {
        success: false,
        error: 'Entity type is required (agent, server, api, build)'
      }
    }

    // Validate entityType
    const validTypes = ['agent', 'server', 'api', 'build', 'agents_total', 'builds_summary']
    if (!validTypes.includes(entityType)) {
      return {
        success: false,
        error: `Invalid entity type. Must be one of: ${validTypes.join(', ')}`
      }
    }

    const db = await getDB()
    if (!db) {
      return {
        success: false,
        error: 'Database not initialized'
      }
    }

    // Build conditions for deletion
    const conditions = [eq(metricsSchema.entityType, entityType)]

    // Add entityId filter if provided
    if (entityId) {
      conditions.push(eq(metricsSchema.entityId, entityId))
    }

    // Add date range filters if provided
    if (from) {
      const fromDate = new Date(from)
      if (!isNaN(fromDate.getTime())) {
        conditions.push(gte(metricsSchema.timestamp, fromDate.toISOString()))
      }
    }

    if (to) {
      const toDate = new Date(to)
      if (!isNaN(toDate.getTime())) {
        conditions.push(lte(metricsSchema.timestamp, toDate.toISOString()))
      }
    }

    // Delete metrics matching conditions
    const result = await db
      .delete(metricsSchema)
      .where(and(...conditions))

    const deletedCount = result.changes || 0

    // Log the deletion
    const logMessage = entityId 
      ? `Deleted ${deletedCount} ${entityType} metrics for entity ${entityId}`
      : `Deleted ${deletedCount} ${entityType} metrics (all entities)`
    
    logger.info(logMessage)

    return {
      success: true,
      message: logMessage,
      deletedCount,
      entityType,
      entityId: entityId || null
    }

  } catch (error) {
    logger.error('Error deleting metrics:', error)
    return {
      success: false,
      error: error.message
    }
  }
})
