import { getDataService } from '~/server/utils/dataService.js'
import bcrypt from 'bcryptjs'
import logger from '~/server/utils/logger.js'

/**
 * POST /api/auth/change-password
 * Change user password (including forced password changes)
 */
export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event)
    
    if (!session || !session.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Not authenticated'
      })
    }

    const body = await readBody(event)
    const { currentPassword, newPassword } = body

    if (!newPassword || newPassword.length < 6) {
      throw createError({
        statusCode: 400,
        statusMessage: 'New password must be at least 6 characters'
      })
    }

    const dataService = await getDataService()
    const user = await dataService.getUserById(session.user.id)

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // For OAuth users, don't allow password changes
    if (user.userType !== 'local' && user.userType !== 'ldap') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot set password for OAuth users'
      })
    }

    // Verify current password (unless it's a forced change from default)
    if (user.passwordChangeRequired !== 'true' && currentPassword) {
      if (!user.passwordHash) {
        throw createError({
          statusCode: 400,
          statusMessage: 'No password set'
        })
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!passwordMatch) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Current password is incorrect'
        })
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update user password and clear passwordChangeRequired flag
    await dataService.updateUser(user.id, {
      passwordHash: hashedPassword,
      passwordChangeRequired: 'false',
      updatedAt: new Date().toISOString()
    })

    // Update session to reflect password change
    await setUserSession(event, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        passwordChangeRequired: false
      },
      loggedInAt: Date.now()
    })

    logger.info(`User ${user.email} changed their password`)

    return {
      success: true,
      message: 'Password changed successfully'
    }
  } catch (error) {
    logger.error('Password change error:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to change password'
    })
  }
})
