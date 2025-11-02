/**
 * Shutdown Manager - Handles graceful shutdown of the application
 * Ensures all resources are properly closed before exit
 */

import logger from './logger.js'
import { cronManager } from './cronManager.js'
import { jobManager } from './jobManager.js'
import { getRawDB } from './database.js'

class ShutdownManager {
  constructor() {
    this.isShuttingDown = false
    this.shutdownCallbacks = []
    this.forceShutdownTimeout = 30000 // 30 seconds max wait
  }

  /**
   * Register a shutdown callback
   * @param {string} name - Name of the component
   * @param {Function} callback - Async function to call during shutdown
   * @param {number} priority - Lower numbers execute first (default: 50)
   */
  register(name, callback, priority = 50) {
    this.shutdownCallbacks.push({
      name,
      callback,
      priority
    })

    // Sort by priority
    this.shutdownCallbacks.sort((a, b) => a.priority - b.priority)

    logger.info(`Registered shutdown callback: ${name} (priority: ${priority})`)
  }

  /**
   * Perform graceful shutdown
   * @param {Object} options - Shutdown options
   * @param {boolean} options.waitForJobs - Whether to wait for running jobs to complete
   * @param {boolean} options.force - Force shutdown even if jobs are running
   */
  async shutdown(options = {}) {
    const { waitForJobs = false, force = false } = options

    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress')
      return
    }

    this.isShuttingDown = true
    logger.info('=== Starting graceful shutdown ===')

    const shutdownStart = Date.now()

    try {
      // Step 1: Stop accepting new work
      await this.stopAcceptingNewWork()

      // Step 2: Handle running jobs
      if (waitForJobs && !force) {
        await this.waitForJobsToComplete()
      } else if (!force) {
        await this.pauseRunningJobs()
      } else {
        await this.cancelRunningJobs()
      }

      // Step 3: Stop cron jobs
      await this.stopCronJobs()

      // Step 4: Disconnect WebSocket clients
      await this.disconnectWebSockets()

      // Step 5: Close database connections
      await this.closeDatabaseConnections()

      // Step 6: Execute registered shutdown callbacks
      await this.executeShutdownCallbacks()

      const shutdownDuration = Date.now() - shutdownStart
      logger.info(`=== Graceful shutdown completed in ${shutdownDuration}ms ===`)

      return {
        success: true,
        duration: shutdownDuration
      }
    } catch (error) {
      logger.error('Error during graceful shutdown:', error)
      throw error
    }
  }

  /**
   * Stop accepting new work
   */
  async stopAcceptingNewWork() {
    logger.info('[Shutdown] Stopping acceptance of new work...')

    // Broadcast to all WebSocket clients that server is shutting down
    if (globalThis.broadcastToClients) {
      globalThis.broadcastToClients({
        type: 'server_shutdown',
        message: 'Server is shutting down for maintenance',
        timestamp: new Date().toISOString()
      })
    }

    // TODO: Set a flag to reject new job requests
    // This would be implemented in your job queue/API endpoints

    logger.info('[Shutdown] No longer accepting new work')
  }

  /**
   * Wait for running jobs to complete
   */
  async waitForJobsToComplete() {
    logger.info('[Shutdown] Waiting for running jobs to complete...')

    const maxWaitTime = 300000 // 5 minutes max
    const checkInterval = 2000 // Check every 2 seconds
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      const runningJobs = this.getRunningJobs()

      if (runningJobs.length === 0) {
        logger.info('[Shutdown] All jobs completed')
        return
      }

      logger.info(`[Shutdown] Waiting for ${runningJobs.length} job(s) to complete...`)

      // Broadcast progress to clients
      if (globalThis.broadcastToClients) {
        globalThis.broadcastToClients({
          type: 'shutdown_progress',
          message: `Waiting for ${runningJobs.length} job(s) to complete`,
          runningJobs: runningJobs.length,
          timestamp: new Date().toISOString()
        })
      }

      await this.sleep(checkInterval)
    }

    logger.warn('[Shutdown] Timeout waiting for jobs to complete. Forcing shutdown.')
  }

  /**
   * Pause running jobs (mark them as retriable)
   */
  async pauseRunningJobs() {
    logger.info('[Shutdown] Pausing running jobs...')

    const runningJobs = this.getRunningJobs()

    for (const job of runningJobs) {
      try {
        // Mark job as paused/retriable
        await jobManager.updateJob(job.id, {
          status: 'paused',
          canRetryOnReconnect: 'true',
          message: 'Job paused due to server shutdown'
        })

        logger.info(`[Shutdown] Paused job: ${job.id}`)
      } catch (error) {
        logger.error(`[Shutdown] Failed to pause job ${job.id}:`, error)
      }
    }

    logger.info(`[Shutdown] Paused ${runningJobs.length} job(s)`)
  }

  /**
   * Cancel running jobs
   */
  async cancelRunningJobs() {
    logger.info('[Shutdown] Canceling running jobs...')

    const runningJobs = this.getRunningJobs()

    for (const job of runningJobs) {
      try {
        await jobManager.updateJob(job.id, {
          status: 'cancelled',
          message: 'Job cancelled due to server shutdown',
          finishedAt: new Date().toISOString()
        })

        logger.info(`[Shutdown] Cancelled job: ${job.id}`)
      } catch (error) {
        logger.error(`[Shutdown] Failed to cancel job ${job.id}:`, error)
      }
    }

    logger.info(`[Shutdown] Cancelled ${runningJobs.length} job(s)`)
  }

  /**
   * Get list of running jobs
   */
  getRunningJobs() {
    const runningJobs = []

    for (const [jobId, job] of jobManager.jobs) {
      if (job.status === 'running' || job.status === 'queued') {
        runningJobs.push({
          id: jobId,
          projectId: job.projectId,
          buildNumber: job.buildNumber,
          status: job.status
        })
      }
    }

    return runningJobs
  }

  /**
   * Stop all cron jobs
   */
  async stopCronJobs() {
    logger.info('[Shutdown] Stopping cron jobs...')

    try {
      await cronManager.stopAllCronJobs()
      logger.info('[Shutdown] All cron jobs stopped')
    } catch (error) {
      logger.error('[Shutdown] Failed to stop cron jobs:', error)
    }
  }

  /**
   * Disconnect all WebSocket clients
   */
  async disconnectWebSockets() {
    logger.info('[Shutdown] Disconnecting WebSocket clients...')

    try {
      if (globalThis.socketIO) {
        // Send final shutdown message
        globalThis.socketIO.emit('server_shutdown', {
          message: 'Server is shutting down',
          timestamp: new Date().toISOString()
        })

        // Close all connections
        await new Promise((resolve) => {
          globalThis.socketIO.close(() => {
            logger.info('[Shutdown] WebSocket server closed')
            resolve()
          })
        })
      }
    } catch (error) {
      logger.error('[Shutdown] Failed to close WebSocket connections:', error)
    }
  }

  /**
   * Close database connections
   */
  async closeDatabaseConnections() {
    logger.info('[Shutdown] Closing database connections...')

    try {
      const { db, type } = await getRawDB()

      if (type === 'sqlite' && db) {
        // SQLite close
        db.close()
        logger.info('[Shutdown] SQLite database closed')
      } else if (type === 'postgres' && db) {
        // PostgreSQL close
        await db.end()
        logger.info('[Shutdown] PostgreSQL database closed')
      }
    } catch (error) {
      logger.error('[Shutdown] Failed to close database:', error)
    }
  }

  /**
   * Execute all registered shutdown callbacks
   */
  async executeShutdownCallbacks() {
    logger.info(`[Shutdown] Executing ${this.shutdownCallbacks.length} shutdown callbacks...`)

    for (const { name, callback } of this.shutdownCallbacks) {
      try {
        logger.info(`[Shutdown] Executing callback: ${name}`)
        await callback()
        logger.info(`[Shutdown] Callback completed: ${name}`)
      } catch (error) {
        logger.error(`[Shutdown] Callback failed: ${name}`, error)
      }
    }
  }

  /**
   * Get shutdown status
   */
  getStatus() {
    return {
      isShuttingDown: this.isShuttingDown,
      runningJobs: this.getRunningJobs().length
    }
  }

  /**
   * Helper: Sleep for ms
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Setup process signal handlers for graceful shutdown
   * PM2-aware: Handles SIGINT (PM2 graceful reload) and SIGTERM properly
   */
  setupSignalHandlers() {
    const isPM2 = !!(process.env.PM2_HOME || process.env.pm_id !== undefined)

    if (isPM2) {
      logger.info('Running under PM2 - setting up PM2-compatible signal handlers')

      // PM2 sends SIGINT for graceful shutdown/reload
      process.on('SIGINT', async () => {
        logger.info('Received SIGINT from PM2 (graceful shutdown)')
        try {
          await this.shutdown({ waitForJobs: false, force: false })

          // Signal PM2 that we're ready to be restarted
          if (process.send) {
            process.send('shutdown')
          }

          // Give PM2 time to process the signal
          setTimeout(() => {
            process.exit(0)
          }, 1000)
        } catch (error) {
          logger.error('Shutdown failed:', error)
          process.exit(1)
        }
      })

      // PM2 also uses SIGTERM for cluster mode
      process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM from PM2')
        try {
          await this.shutdown({ waitForJobs: false, force: false })
          process.exit(0)
        } catch (error) {
          logger.error('Shutdown failed:', error)
          process.exit(1)
        }
      })

      // Notify PM2 that the app is ready
      if (process.send) {
        process.send('ready')
        logger.info('Sent "ready" signal to PM2')
      }
    } else {
      logger.info('Running in standalone mode - setting up standard signal handlers')

      // Handle SIGTERM (e.g., from docker stop, systemd)
      process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM signal')
        try {
          await this.shutdown({ waitForJobs: false, force: false })
          process.exit(0)
        } catch (error) {
          logger.error('Shutdown failed:', error)
          process.exit(1)
        }
      })

      // Handle SIGINT (e.g., Ctrl+C)
      process.on('SIGINT', async () => {
        logger.info('Received SIGINT signal')
        try {
          await this.shutdown({ waitForJobs: false, force: false })
          process.exit(0)
        } catch (error) {
          logger.error('Shutdown failed:', error)
          process.exit(1)
        }
      })
    }

    // Handle uncaught exceptions (same for both modes)
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception:', error)
      try {
        await this.shutdown({ waitForJobs: false, force: true })
        process.exit(1)
      } catch (shutdownError) {
        logger.error('Shutdown failed:', shutdownError)
        process.exit(1)
      }
    })

    // Handle unhandled promise rejections (same for both modes)
    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason)
      // Don't exit on unhandled rejections by default
      // but log them for debugging
    })

    logger.info('Signal handlers registered for graceful shutdown')
  }
}

// Singleton instance
const shutdownManager = new ShutdownManager()

export { shutdownManager, ShutdownManager }
