import { getDataService } from '../../../utils/dataService.js'
import { getAuthenticatedUser } from '../../../utils/auth.js'
import logger from '~/server/utils/logger.js'
/**
 * Revert a project to a specific snapshot version
 * POST /api/projects/:projectId/revert
 * Body: { version: number }
 */
export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    const userAuth = await getAuthenticatedUser(event)

    const projectId = getRouterParam(event, 'projectId')
    const body = await readBody(event)
    const { version } = body

    if (!version || typeof version !== 'number') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Version number is required'
      })
    }

    const dataService = await getDataService()

    // Get the snapshot
    const snapshot = await dataService.auditLogger.getSnapshot(projectId, version)
    if (!snapshot) {
      throw createError({
        statusCode: 404,
        statusMessage: `Snapshot version ${version} not found`
      })
    }

    // Get current project for audit log
    const currentProject = await dataService.getItemById(projectId)
    if (!currentProject) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      })
    }

    // Extract user info for audit logging
    const userInfo = {
      userId: userAuth.userId,
      userName: userAuth.userName,
      ipAddress: event.node.req.socket.remoteAddress || event.node.req.headers['x-forwarded-for'] || 'unknown',
      userAgent: event.node.req.headers['user-agent'] || 'unknown'
    }

    // Update the project with snapshot data
    const updates = {
      name: snapshot.projectName,
      diagramData: snapshot.diagramData,
      status: snapshot.status,
      maxBuildsToKeep: snapshot.maxBuildsToKeep,
      maxLogDays: snapshot.maxLogDays
    }

    const updatedProject = await dataService.updateItem(projectId, updates, userInfo)

    // Log the reversion as a restore action
    await dataService.auditLogger.logEvent({
      entityType: 'project',
      entityId: projectId,
      entityName: snapshot.projectName,
      action: 'restore',
      userId: userAuth.userId,
      userName: userAuth.userName,
      changesSummary: `Reverted to version ${version}`,
      previousData: currentProject,
      newData: updatedProject,
      ipAddress: userInfo.ipAddress,
      userAgent: userInfo.userAgent
    })

    return {
      success: true,
      message: `Project reverted to version ${version}`,
      project: updatedProject,
      snapshot: {
        version: snapshot.version,
        createdAt: snapshot.createdAt,
        createdBy: snapshot.createdByName
      }
    }
  } catch (error) {
    logger.error('Error reverting project:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to revert project'
    })
  }
})
