/**
 * POST /api/webhook/[endpoint]
 * Handle webhook trigger execution for custom endpoints
 */

import { executeProjectFromTrigger } from '~/server/utils/triggerExecutor.js'
import { getDataService } from '~/server/utils/dataService.js'

export default defineEventHandler(async (event) => {
  try {
    const endpoint = getRouterParam(event, 'endpoint')
    const body = await readBody(event)
    const method = getMethod(event)
    
    // Only accept POST requests
    if (method !== 'POST') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method Not Allowed. Webhooks only accept POST requests.'
      })
    }
    
    console.log(`🎣 Webhook triggered: POST /api/webhook/${endpoint}`)
    
    if (!endpoint) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing webhook endpoint'
      })
    }

    // Find all projects with webhook triggers matching this endpoint
    const dataService = await getDataService()
    const allProjects = await dataService.getAllItems()
    
    const matchingProjects = []
    
    for (const project of allProjects) {
      if (project.status === 'disabled') {
        continue // Skip disabled projects
      }
      
      try {
        const projectData = JSON.parse(project.data || '{}')
        const { nodes = [], edges = [] } = projectData
        
        // Find webhook trigger nodes that match this endpoint
        const webhookNodes = nodes.filter(node => 
          node.data.nodeType === 'webhook' && 
          node.data.customEndpoint === endpoint &&
          node.data.active !== false &&
          node.data.secretToken // Only include webhooks with secret tokens
        )
        
        for (const webhookNode of webhookNodes) {
          // Secret token is mandatory - check it
          if (!webhookNode.data.secretToken) {
            console.log(`❌ Webhook ${project.name}/${webhookNode.data.label} has no secret token`)
            continue
          }
          
          const providedToken = getHeader(event, 'x-webhook-token') || body?.token || getQuery(event).token
          
          if (providedToken !== webhookNode.data.secretToken) {
            console.log(`❌ Invalid webhook token for ${project.name}/${webhookNode.data.label}`)
            continue
          }
          
          matchingProjects.push({
            project,
            webhookNode,
            nodes,
            edges
          })
        }
      } catch (error) {
        console.error(`❌ Error parsing project data for ${project.name}:`, error)
      }
    }
    
    if (matchingProjects.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: `No active webhook triggers found for endpoint: ${endpoint}. Ensure the webhook has a valid secret token and is active.`
      })
    }
    
    // Execute all matching webhook triggers
    const results = []
    
    for (const { project, webhookNode, nodes, edges } of matchingProjects) {
      try {
        console.log(`🚀 Executing webhook trigger: ${project.name}/${webhookNode.data.label}`)
        
        // Broadcast webhook trigger to subscribed clients
        if (globalThis.broadcastToProject) {
          globalThis.broadcastToProject(project.id, {
            type: 'webhook_trigger_fired',
            projectId: project.id,
            webhookNodeId: webhookNode.id,
            webhookNodeLabel: webhookNode.data.label,
            endpoint: endpoint,
            method: 'POST',
            timestamp: new Date().toISOString(),
            requestBody: body
          })
        }
        
        const result = await executeProjectFromTrigger(
          project.id, 
          nodes, 
          edges, 
          webhookNode.id
        )
        
        results.push({
          projectId: project.id,
          projectName: project.name,
          webhookNodeId: webhookNode.id,
          webhookNodeLabel: webhookNode.data.label,
          success: result.success,
          jobId: result.jobId,
          message: result.message
        })
        
      } catch (error) {
        console.error(`❌ Error executing webhook for ${project.name}:`, error)
        
        // Broadcast webhook error
        if (globalThis.broadcastToProject) {
          globalThis.broadcastToProject(project.id, {
            type: 'webhook_trigger_error',
            projectId: project.id,
            webhookNodeId: webhookNode.id,
            webhookNodeLabel: webhookNode.data.label,
            endpoint: endpoint,
            error: error.message,
            timestamp: new Date().toISOString()
          })
        }
        
        results.push({
          projectId: project.id,
          projectName: project.name,
          webhookNodeId: webhookNode.id,
          webhookNodeLabel: webhookNode.data.label,
          success: false,
          error: error.message
        })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount
    
    console.log(`✅ Webhook execution completed: ${successCount} success, ${failureCount} failed`)
    
    return {
      success: true,
      endpoint: endpoint,
      method: 'POST',
      triggeredCount: results.length,
      successCount,
      failureCount,
      results
    }
    
  } catch (error) {
    console.error(`❌ Webhook handler error:`, error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: `Webhook execution failed: ${error.message}`
    })
  }
})