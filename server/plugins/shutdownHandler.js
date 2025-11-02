/**
 * Shutdown Handler Plugin
 * Initializes graceful shutdown manager with signal handlers
 */

import { shutdownManager } from '../utils/shutdownManager.js'
import logger from '../utils/logger.js'

export default defineNitroPlugin((nitroApp) => {
  logger.info('Initializing shutdown manager...')

  // Setup signal handlers for graceful shutdown
  shutdownManager.setupSignalHandlers()

  logger.info('Shutdown manager initialized')
})
