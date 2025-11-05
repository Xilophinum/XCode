import { getAuthenticatedUser } from '../../../utils/auth.js'
import { getDB, groups, userGroupMemberships } from '../../../utils/database.js'
import { eq, sql } from 'drizzle-orm'
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
    const db = await getDB()

    // Get all groups with member counts
    const allGroups = await db.select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      ldapMappings: groups.ldapMappings,
      createdAt: groups.createdAt,
      updatedAt: groups.updatedAt,
      memberCount: sql`(SELECT COUNT(*) FROM ${userGroupMemberships} WHERE ${userGroupMemberships.groupId} = ${groups.id})`
    }).from(groups)

    // Parse ldapMappings JSON for each group
    const groupsWithParsedData = allGroups.map(group => ({
      ...group,
      ldapMappings: group.ldapMappings ? JSON.parse(group.ldapMappings) : [],
      memberCount: Number(group.memberCount)
    }))

    return groupsWithParsedData
  } catch (error) {
    logger.error('Failed to fetch groups:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch groups'
    })
  }
})
