import { getAuthenticatedUser } from '../../../utils/auth.js'
import { getDB, groups } from '../../../utils/database.js'
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
    const body = await readBody(event)
    const { name, description, ldapMappings } = body

    const db = await getDB()

    const updateData = {
      updatedAt: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (ldapMappings !== undefined) updateData.ldapMappings = JSON.stringify(ldapMappings)

    await db.update(groups)
      .set(updateData)
      .where(eq(groups.id, groupId))

    logger.info(`Group updated: ${groupId}`)

    return { success: true }
  } catch (error) {
    logger.error('Failed to update group:', error)
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group name already exists'
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update group'
    })
  }
})
