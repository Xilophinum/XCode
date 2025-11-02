/**
 * Post-Update Check Plugin
 * Runs on server startup to check if an update was just completed
 * and marks it as successful in the database
 */

import { getUpdateDataService } from '../utils/updateDataService.js'
import { getUpdateService } from '../utils/updateService.js'
import logger from '../utils/logger.js'

export default defineNitroPlugin(async (nitroApp) => {
  // Wait a bit for the server to fully initialize
  setTimeout(async () => {
    try {
      const updateDataService = getUpdateDataService()
      const updateService = getUpdateService()

      // Get the current version from package.json
      const currentVersion = await updateService.getCurrentVersion()

      // Get the system version from database
      const dbVersion = await updateDataService.getCurrentSystemVersion()

      logger.info(`Checking versions - Package: ${currentVersion}, Database: ${dbVersion}`)

      // If versions don't match, we likely just updated
      if (currentVersion !== dbVersion) {
        logger.info('Version mismatch detected - checking for pending update...')

        // Get the latest update record
        const latestUpdate = await updateDataService.getLatestUpdate()

        if (latestUpdate && latestUpdate.status === 'shutting_down') {
          // Update was in progress, mark it as complete
          logger.info(`Marking update ${latestUpdate.id} as completed`)

          await updateDataService.markUpdateComplete(latestUpdate.id, currentVersion)

          // Broadcast update completion to WebSocket clients
          if (globalThis.broadcastToClients) {
            globalThis.broadcastToClients({
              type: 'update_completed',
              updateId: latestUpdate.id,
              previousVersion: latestUpdate.currentVersion,
              newVersion: currentVersion,
              timestamp: new Date().toISOString()
            })
          }

          logger.info(`Update completed successfully: ${latestUpdate.currentVersion} -> ${currentVersion}`)
        } else {
          // No pending update, just sync the version
          logger.info('No pending update found, syncing version...')
          await updateDataService.updateSystemVersion(currentVersion)
        }
      } else {
        logger.info('Versions match - no update to process')
      }
    } catch (error) {
      logger.error('Error in post-update check:', error)
    }
  }, 15000) // 15 second delay to ensure everything is initialized
})
