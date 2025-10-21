/**
 * POST /api/projects/[projectId]/cron
 * Update cron jobs for a project
 */

import { cronManager } from '../../../utils/cronManager.js'
import { getDataService } from '../../../utils/dataService.js'

export default defineEventHandler(async (event) => {
  try {
    const projectId = getRouterParam(event, 'projectId')
    const body = await readBody(event)
    const { nodes, edges } = body

    if (!projectId || !nodes || !edges) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: projectId, nodes, edges'
      })
    }

    console.log(`🔄 Updating cron jobs for project ${projectId}`)

    // Check project status before updating cron jobs
    const dataService = await getDataService()
    const project = await dataService.getItemById(projectId)
    
    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      })
    }

    // If project is disabled, skip cron job scheduling and clean up existing jobs
    if (project.status === 'disabled') {
      console.log(`🚫 Project ${projectId} is disabled, cancelling existing cron jobs...`)
      cronManager.cancelProjectCronJobs(projectId)
      
      return {
        success: true,
        scheduledJobs: [],
        message: 'Project is disabled - cron jobs cancelled'
      }
    }

    // Update cron jobs for the project (only if active)
    await cronManager.updateProjectCronJobs(projectId, nodes, edges)

    // Get the updated scheduled jobs
    const scheduledJobs = cronManager.getScheduledJobs()
    const projectJobs = scheduledJobs.filter(job => job.projectId === projectId)

    console.log(`✅ Updated ${projectJobs.length} cron jobs for project ${projectId}`)

    return {
      success: true,
      scheduledJobs: projectJobs,
      message: `Updated ${projectJobs.length} cron job(s)`
    }

  } catch (error) {
    console.error('❌ Error updating cron jobs:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update cron jobs'
    })
  }
})