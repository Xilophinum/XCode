import { getAuthenticatedUser } from '../../../utils/auth.js'
import { getDB, groups } from '../../../utils/database.js'
import { v4 as uuidv4 } from 'uuid'
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
    const body = await readBody(event)
    const { name, description, ldapMappings } = body

    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group name is required'
      })
    }

    const db = await getDB()
    const now = new Date().toISOString()

    const newGroup = {
      id: uuidv4(),
      name,
      description: description || null,
      ldapMappings: ldapMappings ? JSON.stringify(ldapMappings) : JSON.stringify([]),
      createdAt: now,
      updatedAt: now
    }

    await db.insert(groups).values(newGroup)

    logger.info(`Group created: ${name}`)

    return {
      ...newGroup,
      ldapMappings: JSON.parse(newGroup.ldapMappings)
    }
  } catch (error) {
    logger.error('Failed to create group:', error)
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group name already exists'
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create group'
    })
  }
})
