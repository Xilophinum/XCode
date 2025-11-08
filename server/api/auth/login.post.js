import { getDataService } from '~/server/utils/dataService.js'
import { authenticateWithLDAP } from '~/server/utils/ldapAuth.js'
import { syncUserGroupMemberships } from '~/server/utils/groupManager.js'
import bcrypt from 'bcryptjs'
import logger from '~/server/utils/logger.js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, password } = body
    const dataService = await getDataService()
    
    // Check if user exists in database (try both email and username)
    let user = await dataService.getUserByEmail(email)
    let authMethod = 'local'
    
    // If no user exists and this is the default admin account, create it
    if (!user && email === 'admin@example.com') {
      const hashedPassword = await bcrypt.hash('password', 10)
      user = await dataService.createUser({
        name: 'Admin User',
        email: email,
        passwordHash: hashedPassword,
        role: 'admin',
        userType: 'local',
        passwordChangeRequired: 'true' // Force password change on first login
      })
      logger.warn('⚠️ Default admin account created - password change required on first login')
    }
    
    // Try LDAP authentication first if user doesn't exist or is LDAP user
    if (!user || user.userType === 'ldap') {
      const ldapResult = await authenticateWithLDAP(email, password)
      if (ldapResult.success) {
        authMethod = 'ldap'
        user = await dataService.getUserByEmail(ldapResult.user.mail || ldapResult.user.email)
        // Create or update LDAP user
        if (!user) {
          try {
            user = await dataService.createUser({
              name: ldapResult.user.name,
              email: ldapResult.user.mail || ldapResult.user.email,
              passwordHash: null,
              role: 'user', // Default role for LDAP users
              userType: 'ldap',
              externalId: ldapResult.user.dn
            })

            // Sync group memberships for new LDAP user
            const syncResult = await syncUserGroupMemberships(user.id, ldapResult.user.groups || [])
            logger.info(`Synced LDAP group memberships for new user ${user.email}: ${syncResult.total} groups`)
          } catch (createError) {
            throw createError
          }
        }
        
        if (user) {
          // Update existing LDAP user info
          await dataService.updateUser(user.id, {
            name: ldapResult.user.name,
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })

          // Sync group memberships based on LDAP groups
          const syncResult = await syncUserGroupMemberships(user.id, ldapResult.user.groups || [])
          logger.info(`Synced LDAP group memberships for ${user.email}: +${syncResult.added} -${syncResult.removed} (total: ${syncResult.total})`)
        }
      } else {
        // LDAP auth failed
        if (!user) {
          throw createError({
            statusCode: 401,
            statusMessage: 'Invalid credentials'
          })
        } else if (user.userType === 'ldap') {
          throw createError({
            statusCode: 401,
            statusMessage: 'LDAP authentication failed'
          })
        }
      }
    }
    
    // For local users, verify password
    if (authMethod === 'local' && user.userType === 'local') {
      if (!user.passwordHash) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Invalid credentials'
        })
      }
      
      const passwordMatch = await bcrypt.compare(password, user.passwordHash)
      if (!passwordMatch) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Invalid credentials'
        })
      }
      
      // Update last login for local users
      await dataService.updateUser(user.id, {
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
    
    // Check if user is active
    if (user.isActive === 'false') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Account is disabled'
      })
    }

    // Ensure user has a role (for backward compatibility)
    const userRole = user.role || 'user'

    // Get session timeout from system settings
    let sessionTimeoutHours = 24 // Default fallback
    try {
      const sessionSetting = await dataService.getSystemSetting('session_timeout')
      if (sessionSetting?.value) {
        sessionTimeoutHours = parseInt(sessionSetting.value)
      }
    } catch (error) {
      logger.warn('Failed to get session timeout setting, using default 24h:', error)
    }

    // Set user session using nuxt-auth-utils with custom maxAge from system settings
    await setUserSession(event, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole,
        passwordChangeRequired: user.passwordChangeRequired === 'true'
      },
      loggedInAt: Date.now()
    }, {
      maxAge: 60 * 60 * sessionTimeoutHours // Convert hours to seconds
    })

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole,
        passwordChangeRequired: user.passwordChangeRequired === 'true'
      }
    }
  } catch (error) {
    logger.error('Login error:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to login'
    })
  }
})