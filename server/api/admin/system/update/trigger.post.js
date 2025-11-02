/**
 * API Endpoint: Trigger system update
 * POST /api/admin/system/update/trigger
 */

import { getUpdateService } from '~/server/utils/updateService.js'
import { shutdownManager } from '~/server/utils/shutdownManager.js'
import { getAuthenticatedUser } from '~/server/utils/auth.js'
import { getUpdateDataService } from '~/server/utils/updateDataService.js'
import { v4 as uuidv4 } from 'uuid'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    // Require admin authentication
    const user = await getAuthenticatedUser(event)
    if (user.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Admin access required'
      })
    }

    const body = await readBody(event)
    const { waitForJobs = false } = body

    const updateService = getUpdateService()

    // Check if update is already in progress
    if (updateService.updateInProgress) {
      throw new Error('Update already in progress')
    }

    // Get current and latest versions
    const currentVersion = await updateService.getCurrentVersion()
    const updateInfo = await updateService.checkForUpdates()

    if (!updateInfo.updateAvailable) {
      throw new Error('No update available')
    }

    logger.info(`Starting update from ${currentVersion} to ${updateInfo.latestVersion}`)

    // Create update record in database
    const updateDataService = getUpdateDataService()
    const updateId = uuidv4()
    const now = new Date().toISOString()

    await updateDataService.createUpdateRecord({
      id: updateId,
      currentVersion: currentVersion,
      targetVersion: updateInfo.latestVersion,
      status: 'downloading',
      downloadProgress: 0,
      downloadUrl: updateInfo.downloadUrl,
      releaseNotes: updateInfo.releaseNotes,
      startedBy: user.id,
      startedByName: user.name,
      waitForJobs: waitForJobs ? 'true' : 'false',
      startedAt: now,
      createdAt: now,
      updatedAt: now
    })

    // Broadcast update start to all clients
    if (globalThis.broadcastToClients) {
      globalThis.broadcastToClients({
        type: 'update_started',
        updateId,
        currentVersion,
        targetVersion: updateInfo.latestVersion,
        timestamp: now
      })
    }

    // Start download in background
    setImmediate(async () => {
      try {
        // Download update
        logger.info('Downloading update...')
        const downloadPath = await updateService.downloadUpdate(updateInfo.downloadUrl, (progress) => {
          // Update database with download progress
          updateDataService.updateUpdateRecord(updateId, {
            downloadProgress: progress.percentage
          }).catch(err => logger.error('Failed to update download progress:', err))

          // Broadcast progress to clients
          if (globalThis.broadcastToClients) {
            globalThis.broadcastToClients({
              type: 'update_progress',
              updateId,
              progress: progress.percentage,
              downloaded: progress.downloaded,
              total: progress.total
            })
          }
        })

        // Update status to extracting
        await updateDataService.updateUpdateRecord(updateId, {
          status: 'extracting'
        })

        // Extract update
        logger.info('Extracting update...')
        const extractedDir = await updateService.extractUpdate(downloadPath)

        // Update status to preparing
        await updateDataService.updateUpdateRecord(updateId, {
          status: 'preparing'
        })

        // Broadcast shutdown warning
        if (globalThis.broadcastToClients) {
          globalThis.broadcastToClients({
            type: 'update_shutdown_warning',
            updateId,
            message: 'Server will shut down in 10 seconds for update',
            waitForJobs
          })
        }

        // Wait 10 seconds for clients to receive the message
        await new Promise(resolve => setTimeout(resolve, 10000))

        // Update status to shutting_down
        await updateDataService.updateUpdateRecord(updateId, {
          status: 'shutting_down'
        })

        // Trigger updater and graceful shutdown
        logger.info('Triggering updater and shutting down...')
        const updaterResult = await updateService.triggerUpdate(downloadPath, extractedDir)

        // Graceful shutdown
        await shutdownManager.shutdown({
          waitForJobs,
          force: false
        })

        // Exit process to allow updater to replace files
        logger.info('Exiting for update...')
        process.exit(0)

      } catch (error) {
        logger.error('Update failed:', error)

        // Update database with error
        await updateDataService.markUpdateFailed(updateId, error.message)
          .catch(err => logger.error('Failed to update error status:', err))

        // Broadcast failure to clients
        if (globalThis.broadcastToClients) {
          globalThis.broadcastToClients({
            type: 'update_failed',
            updateId,
            error: error.message
          })
        }

        // Cleanup
        await updateService.cleanup()
      }
    })

    return {
      success: true,
      message: 'Update initiated',
      updateId,
      currentVersion,
      targetVersion: updateInfo.latestVersion
    }

  } catch (error) {
    logger.error('Failed to trigger update:', error)

    return {
      success: false,
      error: error.message || 'Failed to trigger update'
    }
  }
})
