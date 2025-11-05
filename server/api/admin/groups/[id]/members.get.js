import { getAuthenticatedUser } from '../../../../utils/auth.js'
import { getDB, userGroupMemberships, users } from '../../../../utils/database.js'
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

    // Get all members of this group
    const members = await db.select({
      userId: users.id,
      name: users.name,
      email: users.email,
      userType: users.userType,
      joinedAt: userGroupMemberships.createdAt
    })
    .from(userGroupMemberships)
    .innerJoin(users, eq(userGroupMemberships.userId, users.id))
    .where(eq(userGroupMemberships.groupId, groupId))

    return members
  } catch (error) {
    logger.error('Failed to fetch group members:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch group members'
    })
  }
})
