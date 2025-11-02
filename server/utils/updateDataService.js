/**
 * Update Data Service
 * Manages database operations for system updates
 */

import { getDB, systemUpdates, systemSettings } from './database.js'
import { eq } from 'drizzle-orm'
import logger from './logger.js'

class UpdateDataService {
  /**
   * Create a new update record
   */
  async createUpdateRecord(data) {
    try {
      const db = await getDB()
      await db.insert(systemUpdates).values(data)
      logger.info(`Created update record: ${data.id}`)
      return data
    } catch (error) {
      logger.error('Failed to create update record:', error)
      throw error
    }
  }

  /**
   * Update an existing update record
   */
  async updateUpdateRecord(id, data) {
    try {
      const db = await getDB()
      await db.update(systemUpdates)
        .set({
          ...data,
          updatedAt: new Date().toISOString()
        })
        .where(eq(systemUpdates.id, id))

      logger.info(`Updated update record: ${id}`)
      return data
    } catch (error) {
      logger.error('Failed to update update record:', error)
      throw error
    }
  }

  /**
   * Get latest update record
   */
  async getLatestUpdate() {
    try {
      const db = await getDB()
      const result = await db
        .select()
        .from(systemUpdates)
        .orderBy(systemUpdates.createdAt)
        .limit(1)

      return result[0] || null
    } catch (error) {
      logger.error('Failed to get latest update:', error)
      throw error
    }
  }

  /**
   * Update system version in system_settings
   * This is called after a successful update
   */
  async updateSystemVersion(newVersion) {
    try {
      const db = await getDB()

      // Update the system_version setting
      await db.update(systemSettings)
        .set({
          value: newVersion,
          updatedAt: new Date().toISOString()
        })
        .where(eq(systemSettings.key, 'system_version'))

      logger.info(`Updated system version to: ${newVersion}`)
      return true
    } catch (error) {
      logger.error('Failed to update system version:', error)
      throw error
    }
  }

  /**
   * Get current system version from system_settings
   */
  async getCurrentSystemVersion() {
    try {
      const db = await getDB()
      const result = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, 'system_version'))
        .limit(1)

      return result[0]?.value || '0.0.0'
    } catch (error) {
      logger.error('Failed to get current system version:', error)
      return '0.0.0'
    }
  }

  /**
   * Mark update as completed successfully
   */
  async markUpdateComplete(updateId, newVersion) {
    try {
      const now = new Date().toISOString()

      // Update the update record
      await this.updateUpdateRecord(updateId, {
        status: 'completed',
        completedAt: now
      })

      // Update the system version
      await this.updateSystemVersion(newVersion)

      logger.info(`Update ${updateId} completed successfully, version now: ${newVersion}`)
      return true
    } catch (error) {
      logger.error('Failed to mark update as complete:', error)
      throw error
    }
  }

  /**
   * Mark update as failed
   */
  async markUpdateFailed(updateId, errorMessage) {
    try {
      await this.updateUpdateRecord(updateId, {
        status: 'failed',
        errorMessage,
        completedAt: new Date().toISOString()
      })

      logger.warn(`Update ${updateId} failed: ${errorMessage}`)
      return true
    } catch (error) {
      logger.error('Failed to mark update as failed:', error)
      throw error
    }
  }
}

// Singleton instance
let updateDataService = null

export function getUpdateDataService() {
  if (!updateDataService) {
    updateDataService = new UpdateDataService()
  }
  return updateDataService
}

export { UpdateDataService }
