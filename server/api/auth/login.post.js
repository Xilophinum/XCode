import { getDataService } from '~/server/utils/dataService.js'
import { authenticateWithLDAP } from '~/server/utils/ldapAuth.js'
import { syncUserGroupMemberships } from '~/server/utils/groupManager.js'
import { generateAccessToken, generateRefreshToken } from '~/server/utils/jwtAuth.js'
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
        userType: 'local'
      })
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

    // Generate access token (short-lived, 15 minutes)
    const config = useRuntimeConfig()
    const accessToken = generateAccessToken(
      { userId: user.id, userName: user.name, email: user.email, role: userRole },
      config.jwtSecret
    )

    // Generate refresh token (long-lived, 7 days, stored in DB)
    const deviceInfo = {
      ipAddress: getRequestHeader(event, 'x-forwarded-for') || getRequestHeader(event, 'x-real-ip') || event.node.req.socket.remoteAddress,
      userAgent: getRequestHeader(event, 'user-agent'),
      deviceInfo: null  // Could parse user agent for device details
    }
    const refreshToken = await generateRefreshToken(user.id, deviceInfo)

    // Set access token in HTTP-only cookie (15 min expiry)
    setCookie(event, 'auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 // 15 minutes
    })

    // Set refresh token in HTTP-only cookie (7 days expiry)
    setCookie(event, 'refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    logger.info(`User ${user.email} logged in successfully`)

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole
      },
      accessToken,  // Also return in response for mobile/API clients
      expiresIn: 900  // 15 minutes in seconds
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