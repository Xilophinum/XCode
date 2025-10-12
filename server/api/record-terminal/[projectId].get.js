// Simple endpoint to record terminal logs
export default defineEventHandler(async (event) => {
  const { projectId } = getRouterParams(event)
  const query = getQuery(event)
  
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  const level = query.level || 'info'
  const message = query.message || 'Terminal activity'
  const command = query.command || null
  
  try {
    // Record terminal log
    const response = await $fetch(`/api/build-stats/${projectId}`, {
      method: 'POST',
      body: {
        type: 'terminal',
        level,
        message,
        command
      }
    })
    
    return { 
      success: true, 
      level,
      message,
      projectId,
      summary: response.summary
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to record terminal log: ' + error.message
    })
  }
})