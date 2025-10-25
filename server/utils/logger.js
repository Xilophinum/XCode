/**
 * Centralized Winston Logger
 * Provides configurable logging with levels and build-specific file logging
 */

import winston from 'winston'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../data/build-logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Default log level (will be overridden from system settings)
let currentLogLevel = 'info'

// Custom format for console output with emojis
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const emoji = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      debug: '🐛'
    }[level] || 'ℹ️'

    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] ${emoji}  ${level.toUpperCase()}: ${message}${metaStr}`
  })
)

// Simple format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
)

// Create the main logger
const logger = winston.createLogger({
  level: currentLogLevel,
  format: winston.format.json(),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat
    })
  ]
})

// Map to track build-specific loggers
const buildLoggers = new Map()

/**
 * Set the global log level dynamically
 * @param {string} level - Log level (error, warn, info, debug)
 */
export function setLogLevel(level) {
  const validLevels = ['error', 'warn', 'info', 'debug']
  if (validLevels.includes(level)) {
    currentLogLevel = level
    logger.level = level
    // Update all build loggers
    for (const buildLogger of buildLoggers.values()) {
      buildLogger.level = level
    }
  }
}

/**
 * Get the current log level
 * @returns {string} Current log level
 */
export function getLogLevel() {
  return currentLogLevel
}

/**
 * Create a build-specific logger that writes to a file
 * @param {string} projectId - Project ID
 * @param {number} buildNumber - Build number
 * @returns {object} Winston logger instance
 */
export function createBuildLogger(projectId, buildNumber) {
  const buildKey = `${projectId}_${buildNumber}`

  // Return existing logger if already created
  if (buildLoggers.has(buildKey)) {
    return buildLoggers.get(buildKey)
  }

  const logFileName = `build_${projectId}_${buildNumber}.log`
  const logFilePath = path.join(logsDir, logFileName)

  // Create build-specific logger with file transport
  const buildLogger = winston.createLogger({
    level: currentLogLevel,
    format: fileFormat,
    transports: [
      new winston.transports.File({
        filename: logFilePath,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(({ level, message, timestamp }) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}`
          })
        )
      })
    ]
  })

  buildLogger.logFilePath = logFilePath
  buildLoggers.set(buildKey, buildLogger)

  return buildLogger
}

/**
 * Get the log file path for a build
 * @param {string} projectId - Project ID
 * @param {number} buildNumber - Build number
 * @returns {string|null} Log file path or null if not found
 */
export function getBuildLogPath(projectId, buildNumber) {
  const buildKey = `${projectId}_${buildNumber}`
  const buildLogger = buildLoggers.get(buildKey)
  return buildLogger?.logFilePath || null
}

/**
 * Close and delete a build-specific logger and its file
 * @param {string} projectId - Project ID
 * @param {number} buildNumber - Build number
 */
export async function closeBuildLogger(projectId, buildNumber) {
  const buildKey = `${projectId}_${buildNumber}`
  const buildLogger = buildLoggers.get(buildKey)

  if (buildLogger) {
    const logFilePath = buildLogger.logFilePath

    // Close the logger
    buildLogger.close()
    buildLoggers.delete(buildKey)

    // Delete the log file
    if (fs.existsSync(logFilePath)) {
      try {
        fs.unlinkSync(logFilePath)
        logger.debug(`Deleted build log file: ${logFilePath}`)
      } catch (error) {
        logger.error(`Failed to delete build log file: ${logFilePath}`, { error: error.message })
      }
    }
  }
}

/**
 * Get a build-specific logger if it exists, otherwise return main logger
 * @param {string} projectId - Project ID
 * @param {number} buildNumber - Build number
 * @returns {object} Winston logger instance
 */
export function getBuildLogger(projectId, buildNumber) {
  const buildKey = `${projectId}_${buildNumber}`
  return buildLoggers.get(buildKey) || logger
}

/**
 * Initialize logger with log level from system settings
 * Should be called after dataService is initialized
 */
export async function initializeLogger() {
  try {
    const { getDataService } = await import('./dataService.js')
    const dataService = await getDataService()
    const settings = await dataService.getSystemSettings('general')
    const logLevelSetting = settings.find(s => s.key === 'log_level')

    if (logLevelSetting && logLevelSetting.value) {
      setLogLevel(logLevelSetting.value)
      logger.info(`Logger initialized with level: ${logLevelSetting.value}`)
    }
  } catch (error) {
    logger.warn('Failed to load log level from system settings, using default', { error: error.message })
  }
}

// Export the main logger as default
export default logger

