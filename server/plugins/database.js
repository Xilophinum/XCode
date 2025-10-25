import { DatabaseManager } from '../utils/database.js'
import { initializeLogger } from '../utils/logger.js'
import logger from '../utils/logger.js'

let dbManager = null

export default async function () {
  if (!dbManager) {
    logger.info('Initializing database...')
    dbManager = new DatabaseManager()
    await dbManager.initialize()
    logger.info('Database initialized successfully')

    // Initialize logger with system settings
    await initializeLogger()
  }
}