import { getDataService } from '~/server/utils/dataService.js'
import { authenticateWithLDAP } from '~/server/utils/ldapAuth.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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
              externalId: ldapResult.user.dn,
              groups: (ldapResult.user.groups || []).join(',')
            })
          } catch (createError) {
            throw createError
          }
        }
        
        if (user) {
          // Update existing LDAP user info and groups
          await dataService.updateUser(user.id, {
            name: ldapResult.user.name,
            groups: (ldapResult.user.groups || []).join(','),
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
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
      console.warn('Failed to get session timeout setting, using default 24h:', error)
    }

    // Create JWT token
    const config = useRuntimeConfig()
    const token = jwt.sign(
      { userId: user.id, userName: user.name, email: user.email, role: userRole },
      config.jwtSecret,
      { expiresIn: `${sessionTimeoutHours}h` }
    )
    
    // Set HTTP-only cookie
    setCookie(event, 'auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * sessionTimeoutHours // Match JWT expiration
    })

    return { id: user.id, name: user.name, email: user.email, role: userRole }
  } catch (error) {
    console.error('Login error:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to login'
    })
  }
})