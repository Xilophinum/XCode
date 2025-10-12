import { promises as fs } from 'fs'
import path from 'path'

// File-based storage for build statistics to avoid DB performance issues
const STATS_DIR = path.join(process.cwd(), 'data', 'build-stats')

// Ensure stats directory exists
async function ensureStatsDir() {
  try {
    await fs.mkdir(STATS_DIR, { recursive: true })
  } catch (error) {
    console.error('Failed to create stats directory:', error)
  }
}

// Get the path for a project's build stats file
function getStatsFilePath(projectId) {
  return path.join(STATS_DIR, `${projectId}.json`)
}

// Build status schema
const createBuildEntry = (status, message = '', logs = [], duration = 0) => ({
  id: `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  timestamp: new Date().toISOString(),
  status, // 'success', 'failure', 'warning', 'running'
  message,
  logs: Array.isArray(logs) ? logs : [logs],
  duration, // in milliseconds
  type: 'build' // 'build' or 'terminal'
})

const createTerminalEntry = (level, message, command = null) => ({
  id: `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  timestamp: new Date().toISOString(),
  level, // 'info', 'warn', 'error', 'success'
  message,
  command,
  type: 'terminal'
})

// Load build stats for a project
export async function loadBuildStats(projectId) {
  await ensureStatsDir()
  const filePath = getStatsFilePath(projectId)
  
  try {
    const data = await fs.readFile(filePath, 'utf8')
    const stats = JSON.parse(data)
    
    // Ensure we have the expected structure
    return {
      lastBuilds: stats.lastBuilds || [],
      terminalLogs: stats.terminalLogs || [],
      summary: stats.summary || { successRate: 1, lastStatus: 'success' }
    }
  } catch (error) {
    // File doesn't exist or is corrupted, return default structure
    return {
      lastBuilds: [],
      terminalLogs: [],
      summary: { successRate: 1, lastStatus: 'success' }
    }
  }
}

// Save build stats for a project
export async function saveBuildStats(projectId, stats) {
  await ensureStatsDir()
  const filePath = getStatsFilePath(projectId)
  
  try {
    await fs.writeFile(filePath, JSON.stringify(stats, null, 2), 'utf8')
    return true
  } catch (error) {
    console.error('Failed to save build stats:', error)
    return false
  }
}

// Add a build result
export async function addBuildResult(projectId, status, message = '', logs = [], duration = 0) {
  const stats = await loadBuildStats(projectId)
  const buildEntry = createBuildEntry(status, message, logs, duration)
  
  // Add to beginning of array (most recent first)
  stats.lastBuilds.unshift(buildEntry)
  
  // Keep only last 10 builds
  if (stats.lastBuilds.length > 10) {
    stats.lastBuilds = stats.lastBuilds.slice(0, 10)
  }
  
  // Update summary
  stats.summary = calculateSummary(stats.lastBuilds, stats.terminalLogs)
  
  await saveBuildStats(projectId, stats)
  return stats.summary
}

// Add a terminal log entry
export async function addTerminalLog(projectId, level, message, command = null) {
  const stats = await loadBuildStats(projectId)
  const logEntry = createTerminalEntry(level, message, command)
  
  // Add to beginning of array (most recent first)
  stats.terminalLogs.unshift(logEntry)
  
  // Keep only last 50 terminal logs (more than builds since they're smaller)
  if (stats.terminalLogs.length > 50) {
    stats.terminalLogs = stats.terminalLogs.slice(0, 50)
  }
  
  // Update summary
  stats.summary = calculateSummary(stats.lastBuilds, stats.terminalLogs)
  
  await saveBuildStats(projectId, stats)
  return stats.summary
}

// Calculate project health summary
function calculateSummary(builds, terminalLogs) {
  // If no builds, check terminal logs for overall health
  if (builds.length === 0) {
    const recentLogs = terminalLogs.slice(0, 10) // Last 10 terminal entries
    const errorCount = recentLogs.filter(log => log.level === 'error').length
    const warnCount = recentLogs.filter(log => log.level === 'warn').length
    
    if (errorCount > 0) {
      return {
        successRate: Math.max(0, (recentLogs.length - errorCount) / recentLogs.length),
        lastStatus: 'error',
        source: 'terminal'
      }
    } else if (warnCount > 0) {
      return {
        successRate: Math.max(0.5, (recentLogs.length - warnCount) / recentLogs.length),
        lastStatus: 'warning',
        source: 'terminal'
      }
    }
    
    return { successRate: 1, lastStatus: 'success', source: 'default' }
  }
  
  // Calculate success rate from builds
  const successCount = builds.filter(build => build.status === 'success').length
  const successRate = successCount / builds.length
  const lastStatus = builds[0]?.status || 'success'
  
  // Factor in recent terminal errors
  const recentTerminalErrors = terminalLogs
    .slice(0, 5) // Last 5 terminal entries
    .filter(log => log.level === 'error').length
  
  // Reduce success rate if there are recent terminal errors
  const adjustedSuccessRate = recentTerminalErrors > 0 
    ? Math.max(0, successRate - (recentTerminalErrors * 0.1))
    : successRate
  
  return {
    successRate: adjustedSuccessRate,
    lastStatus,
    source: 'builds'
  }
}

// Get color based on project health
export function getProjectHealthColor(summary) {
  const { successRate, lastStatus } = summary
  
  // Base colors: Green for success, Red for failure
  if (successRate >= 0.8) {
    return {
      bg: 'bg-green-50 dark:bg-green-900/20',
      hover: 'hover:bg-green-100 dark:hover:bg-green-800/30',
      icon: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-600'
    }
  } else if (successRate >= 0.6) {
    return {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-800/30',
      icon: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-600'
    }
  } else if (successRate >= 0.3) {
    return {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      hover: 'hover:bg-orange-100 dark:hover:bg-orange-800/30',
      icon: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-600'
    }
  } else {
    return {
      bg: 'bg-red-50 dark:bg-red-900/20',
      hover: 'hover:bg-red-100 dark:hover:bg-red-800/30',
      icon: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-600'
    }
  }
}

// Get menu colors that contrast well with delete button
export function getProjectMenuColors(summary) {
  const { successRate } = summary
  
  // For red projects, use darker background to contrast with red delete button
  if (successRate < 0.3) {
    return {
      menu: 'bg-gray-50 dark:bg-gray-700',
      deleteButton: 'text-red-700 dark:text-red-300', // Darker red for contrast
      moveButton: 'text-gray-700 dark:text-gray-200'
    }
  }
  
  // Default menu colors
  return {
    menu: 'bg-white dark:bg-gray-800',
    deleteButton: 'text-red-600 dark:text-red-400',
    moveButton: 'text-gray-700 dark:text-gray-300'
  }
}