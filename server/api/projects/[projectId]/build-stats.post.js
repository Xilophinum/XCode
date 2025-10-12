import { loadBuildStats, addBuildResult, addTerminalLog, getProjectHealthColor, getProjectMenuColors } from '../../../utils/buildStats.js'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const { projectId } = getRouterParams(event)
  
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  if (method === 'GET') {
    // Get build stats for a project
    const stats = await loadBuildStats(projectId)
    const healthColors = getProjectHealthColor(stats.summary)
    const menuColors = getProjectMenuColors(stats.summary)
    
    return {
      ...stats,
      colors: {
        health: healthColors,
        menu: menuColors
      }
    }
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const { type, ...data } = body

    if (type === 'build') {
      // Add build result
      const { status, message = '', logs = [], duration = 0 } = data
      const summary = await addBuildResult(projectId, status, message, logs, duration)
      const healthColors = getProjectHealthColor(summary)
      const menuColors = getProjectMenuColors(summary)
      
      return {
        success: true,
        summary,
        colors: {
          health: healthColors,
          menu: menuColors
        }
      }
    }

    if (type === 'terminal') {
      // Add terminal log
      const { level, message, command = null } = data
      const summary = await addTerminalLog(projectId, level, message, command)
      const healthColors = getProjectHealthColor(summary)
      const menuColors = getProjectMenuColors(summary)
      
      return {
        success: true,
        summary,
        colors: {
          health: healthColors,
          menu: menuColors
        }
      }
    }

    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid type. Must be "build" or "terminal"'
    })
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed'
  })
})