/**
 * Client-Side Logger Composable
 * Provides Winston-style logging for Vue components
 * Respects log level from system settings
 */

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
}

// Current log level (fetched from system settings)
let currentLogLevel = 'info'

// Emoji mapping for log levels
const EMOJIS = {
  error: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  debug: '🐛'
}

/**
 * Check if a log level should be displayed
 */
function shouldLog(level) {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLogLevel]
}

/**
 * Format timestamp
 */
function getTimestamp() {
  const now = new Date()
  return now.toTimeString().split(' ')[0]
}

/**
 * Log a message with the given level
 */
function log(level, message, meta = {}) {
  if (!shouldLog(level)) return

  const emoji = EMOJIS[level] || 'ℹ️'
  const timestamp = getTimestamp()
  const prefix = `${emoji} [${timestamp}] ${level.toUpperCase()}:`

  // Use appropriate console method
  const consoleMethod = console[level] || logger.info

  if (Object.keys(meta).length > 0) {
    consoleMethod(prefix, message, meta)
  } else {
    consoleMethod(prefix, message)
  }
}

/**
 * Fetch and set log level from system settings
 */
async function fetchLogLevel() {
  try {
    const response = await $fetch('/api/public/system-settings/log_level')
    if (response?.value) {
      currentLogLevel = response.value
    }
  } catch (error) {
    // Silently fail - keep default level
  }
}

// Fetch log level on composable load
if (process.client) {
  fetchLogLevel()
}

/**
 * Logger composable for Vue components
 */
export const useLogger = () => {
  return {
    error: (message, meta) => log('error', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    info: (message, meta) => log('info', message, meta),
    debug: (message, meta) => log('debug', message, meta),

    // Utility to manually set log level
    setLevel: (level) => {
      if (LOG_LEVELS[level] !== undefined) {
        currentLogLevel = level
      }
    },

    // Utility to get current log level
    getLevel: () => currentLogLevel
  }
}

// Export a default logger instance for non-composable usage
export const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),
  setLevel: (level) => {
    if (LOG_LEVELS[level] !== undefined) {
      currentLogLevel = level
    }
  },
  getLevel: () => currentLogLevel
}
