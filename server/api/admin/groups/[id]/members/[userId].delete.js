import { getAuthenticatedUser } from '../../../../../utils/auth.js'
import { getDB, userGroupMemberships } from '../../../../../utils/database.js'
import { and, eq } from 'drizzle-orm'
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
    const userId = event.context.params.userId
    const db = await getDB()

    // Remove user from group
    await db.delete(userGroupMemberships)
      .where(and(
        eq(userGroupMemberships.userId, userId),
        eq(userGroupMemberships.groupId, groupId)
      ))

    logger.info(`User ${userId} removed from group ${groupId}`)

    return { success: true }
  } catch (error) {
    logger.error('Failed to remove user from group:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to remove user from group'
    })
  }
})
