/**
 * Update Checker Plugin
 * Automatically checks for updates on startup and every 24 hours
 */

import { getUpdateService } from '../utils/updateService.js'
import logger from '../utils/logger.js'

export default defineNitroPlugin(async (nitroApp) => {
  const updateService = getUpdateService()
  const CHECK_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

  /**
   * Perform update check
   */
  async function checkForUpdates() {
    try {
      logger.info('Checking for updates...')
      const updateInfo = await updateService.checkForUpdates()

      if (updateInfo.updateAvailable) {
        logger.info(`Update available: ${updateInfo.currentVersion} -> ${updateInfo.latestVersion}`)

        // Broadcast to WebSocket clients that update is available
        if (globalThis.broadcastToClients) {
          globalThis.broadcastToClients({
            type: 'update_available',
            currentVersion: updateInfo.currentVersion,
            latestVersion: updateInfo.latestVersion,
            releaseNotes: updateInfo.releaseNotes,
            publishedAt: updateInfo.publishedAt,
            timestamp: new Date().toISOString()
          })
        }
      } else {
        logger.info('No updates available')
      }
    } catch (error) {
      logger.error('Update check failed:', error)
    }
  }

  // Check for updates on startup (after a short delay to let the server fully initialize)
  setTimeout(async () => {
    logger.info('Performing initial update check...')
    await checkForUpdates()
  }, 10000) // 10 seconds delay

  // Schedule periodic update checks every 24 hours
  setInterval(async () => {
    logger.info('Performing scheduled update check...')
    await checkForUpdates()
  }, CHECK_INTERVAL)

  logger.info('Update checker plugin initialized - will check for updates every 24 hours')
})
