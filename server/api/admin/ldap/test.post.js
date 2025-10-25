import { getAuthenticatedUser } from '../../../utils/auth.js'
import { LDAPAuthenticator } from '../../../utils/ldapAuth.js'
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
    const { username, password, config } = body

    if (!username || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username and password are required for testing'
      })
    }

    if (!config || !config.url || !config.userSearchBase || !config.userSearchFilter) {
      throw createError({
        statusCode: 400,
        statusMessage: 'LDAP configuration is incomplete'
      })
    }

    // Create LDAP authenticator with provided config
    const ldapAuth = new LDAPAuthenticator(config)
    
    // Test authentication
    const result = await ldapAuth.authenticate(username, password)
    
    if (result.success) {
      return {
        success: true,
        message: 'LDAP authentication successful',
        user: {
          dn: result.user.dn,
          username: result.user.username,
          email: result.user.email,
          name: result.user.name,
          groups: result.user.groups?.slice(0, 5) || [] // Limit groups for display
        }
      }
    } else {
      return {
        success: false,
        message: 'LDAP authentication failed',
        error: result.error
      }
    }
  } catch (error) {
    logger.error('LDAP test error:', error)
    return {
      success: false,
      message: 'LDAP test failed',
      error: error.message
    }
  }
})