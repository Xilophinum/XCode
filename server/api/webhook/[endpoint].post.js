/**
 * POST /api/webhook/[endpoint]
 * Handle webhook trigger execution for custom endpoints
 */

import { executeProjectFromTrigger } from '../../../server/utils/triggerExecutor.js'
import { getDataService } from '../../../server/utils/dataService.js'
import crypto from 'crypto'
import logger from '~/server/utils/logger.js'

/**
 * Validate webhook authentication using multiple methods:
 * 1. Custom token (X-Webhook-Token header, body.token, or query.token)
 * 2. GitHub signature (X-Hub-Signature-256)
 * 3. GitLab signature (X-Gitlab-Token)
 * 4. Bitbucket signature (X-Hub-Signature)
 */
async function validateWebhookAuthentication(event, webhookNode, body) {
  const headers = getHeaders(event)
  const query = getQuery(event)
  
  // Method 1: Custom secret token (our existing system)
  if (webhookNode.data.secretToken) {
    const providedToken = headers['x-webhook-token'] || body?.token || query.token
    if (providedToken === webhookNode.data.secretToken) {
      logger.info(`Custom token authentication successful`)
      return true
    }
  }
  
  // Method 2: GitHub signature validation
  if (headers['x-hub-signature-256'] && webhookNode.data.secretToken) {
    try {
      const signature = headers['x-hub-signature-256']
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', webhookNode.data.secretToken)
        .update(JSON.stringify(body))
        .digest('hex')
      
      if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        logger.info(`GitHub signature authentication successful`)
        return true
      }
    } catch (error) {
      logger.info(`GitHub signature validation failed:`, error.message)
    }
  }
  
  // Method 3: GitLab token validation
  if (headers['x-gitlab-token'] && webhookNode.data.secretToken) {
    if (headers['x-gitlab-token'] === webhookNode.data.secretToken) {
      logger.info(`GitLab token authentication successful`)
      return true
    }
  }
  
  // Method 4: Bitbucket signature validation (SHA1)
  if (headers['x-hub-signature'] && webhookNode.data.secretToken) {
    try {
      const signature = headers['x-hub-signature']
      const expectedSignature = 'sha1=' + crypto
        .createHmac('sha1', webhookNode.data.secretToken)
        .update(JSON.stringify(body))
        .digest('hex')
      
      if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        logger.info(`Bitbucket signature authentication successful`)
        return true
      }
    } catch (error) {
      logger.info(`Bitbucket signature validation failed:`, error.message)
    }
  }
  
  // Method 5: Azure DevOps (uses basic auth or token in query/header)
  if (headers['authorization'] && webhookNode.data.secretToken) {
    // Azure DevOps can send Basic auth or Bearer token
    const auth = headers['authorization']
    if (auth.includes(webhookNode.data.secretToken)) {
      logger.info(`Azure DevOps authentication successful`)
      return true
    }
  }
  
  logger.info(`All authentication methods failed`)
  return false
}

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
    
    logger.info(`🎣 Webhook triggered: POST /api/webhook/${endpoint}`)
    logger.info(`🔍 Looking for webhook nodes with endpoint: ${endpoint}`)
    
    if (!endpoint) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing webhook endpoint'
      })
    }

    // Find all projects with webhook triggers matching this endpoint
    const dataService = await getDataService()
    const allProjects = await dataService.getAllItems()
    
    logger.info(`🔍 Found ${allProjects.length} total projects`)
    
    const matchingProjects = []
    
    for (const project of allProjects) {
      logger.info(`🔍 Checking project: ${project.name} (status: ${project.status})`)
      
      if (project.status === 'disabled') {
        logger.info(`⏭️ Skipping disabled project: ${project.name}`)
        continue // Skip disabled projects
      }
      
      try {
        const projectData = project.diagramData || { nodes: [], edges: [] }
        const { nodes = [], edges = [] } = projectData
        
        logger.info(`🔍 Project ${project.name} has ${nodes.length} nodes`)
        
        // Find webhook trigger nodes that match this endpoint
        const webhookNodes = nodes.filter(node => 
          node.data.nodeType === 'webhook' && 
          node.data.customEndpoint === endpoint &&
          node.data.active !== false
        )
        
        logger.info(`🔍 Found ${webhookNodes.length} webhook nodes matching endpoint "${endpoint}" in project ${project.name}`)
        
        if (webhookNodes.length > 0) {
          webhookNodes.forEach(node => {
            logger.info(`Webhook node: ${node.data.label}, endpoint: ${node.data.customEndpoint}, active: ${node.data.active}, hasToken: ${!!node.data.secretToken}`)
          })
        }
        
        for (const webhookNode of webhookNodes) {
          // Check authentication - either custom token OR Git platform signature
          const isAuthenticated = await validateWebhookAuthentication(event, webhookNode, body)
          
          if (!isAuthenticated) {
            logger.info(`Authentication failed for ${project.name}/${webhookNode.data.label}`)
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
        logger.error(`Error parsing project data for ${project.name}:`, error)
      }
    }
    
    if (matchingProjects.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: `No active webhook triggers found for endpoint: ${endpoint}. Ensure the webhook is properly configured and authenticated.`
      })
    }
    
    // Execute all matching webhook triggers
    const results = []
    
    for (const { project, webhookNode, nodes, edges } of matchingProjects) {
      try {
        logger.info(`Executing webhook trigger: ${project.name}/${webhookNode.data.label}`)
        
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
        
        // Prepare webhook context data for execution
        const webhookContext = {
          headers: getHeaders(event),
          query: getQuery(event),
          body: body,
          endpoint: endpoint,
          timestamp: new Date().toISOString()
        }
        
        const result = await executeProjectFromTrigger(
          project.id, 
          nodes, 
          edges, 
          webhookNode.id,
          webhookContext  // Pass webhook context
        )
        
        // If execution failed, broadcast webhook-specific error
        if (!result.success && globalThis.broadcastToProject) {
          globalThis.broadcastToProject(project.id, {
            type: 'webhook_trigger_error',
            projectId: project.id,
            webhookNodeId: webhookNode.id,
            webhookNodeLabel: webhookNode.data.label,
            endpoint: endpoint,
            error: result.message,
            timestamp: new Date().toISOString()
          })
        }
        
        results.push({
          projectId: project.id,
          projectName: project.name,
          webhookNodeId: webhookNode.id,
          webhookNodeLabel: webhookNode.data.label,
          success: result.success,
          jobId: result.jobId,
          buildNumber: result.buildNumber,
          message: result.message
        })
        
      } catch (error) {
        logger.error(`Error executing webhook for ${project.name}:`, error)
        
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
    
    logger.info(`Webhook execution completed: ${successCount} success, ${failureCount} failed`)
    
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
    logger.error(`Webhook handler error:`, error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: `Webhook execution failed: ${error.message}`
    })
  }
})