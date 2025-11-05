import { getAuthenticatedUser } from '../../../../utils/auth.js'
import { getDB, userGroupMemberships } from '../../../../utils/database.js'
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
    const body = await readBody(event)
    const { userId } = body

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User ID is required'
      })
    }

    const db = await getDB()

    // Check if membership already exists
    const existing = await db.select()
      .from(userGroupMemberships)
      .where(and(
        eq(userGroupMemberships.userId, userId),
        eq(userGroupMemberships.groupId, groupId)
      ))

    if (existing.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User is already a member of this group'
      })
    }

    // Add user to group
    await db.insert(userGroupMemberships).values({
      userId,
      groupId,
      createdAt: new Date().toISOString()
    })

    logger.info(`User ${userId} added to group ${groupId}`)

    return { success: true }
  } catch (error) {
    logger.error('Failed to add user to group:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to add user to group'
    })
  }
})
