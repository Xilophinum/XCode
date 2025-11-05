import { getAuthenticatedUser } from '../../../utils/auth.js'
import { getDB, groups, userGroupMemberships } from '../../../utils/database.js'
import { eq } from 'drizzle-orm'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  // Check authentication and admin role
  const user = await getAuthenticatedUser(event)
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    })
  }

  try {
    const groupId = event.context.params.id
    const db = await getDB()

    // Delete all memberships first
    await db.delete(userGroupMemberships)
      .where(eq(userGroupMemberships.groupId, groupId))

    // Delete the group
    await db.delete(groups)
      .where(eq(groups.id, groupId))

    logger.info(`Group deleted: ${groupId}`)

    return { success: true }
  } catch (error) {
    logger.error('Failed to delete group:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete group'
    })
  }
})
