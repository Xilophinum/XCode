// Simple endpoint to record build events
export default defineEventHandler(async (event) => {
  const { projectId } = getRouterParams(event)
  const query = getQuery(event)
  
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  const action = query.action || 'success'
  const message = query.message || ''
  
  try {
    // Record build result
    const response = await $fetch(`/api/build-stats/${projectId}`, {
      method: 'POST',
      body: {
        type: 'build',
        status: action === 'fail' ? 'failure' : action,
        message: message || `Build ${action}`,
        logs: message ? [message] : [],
        duration: Math.floor(Math.random() * 5000) + 1000
      }
    })
    
    return { 
      success: true, 
      action, 
      projectId,
      summary: response.summary
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to record build: ' + error.message
    })
  }
})