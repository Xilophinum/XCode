import { getDataService } from '~/server/utils/dataService.js'
import logger from '~/server/utils/logger.js'

/**
 * Microsoft OAuth Callback
 * Handles Microsoft/Azure AD OAuth authentication flow
 */
export default defineOAuthMicrosoftEventHandler({
  async onSuccess(event, { user: microsoftUser, tokens }) {
    try {
      const dataService = await getDataService()
      
      // Check if user exists with this Microsoft ID
      let user = await dataService.getUserByExternalId('microsoft', microsoftUser.sub || microsoftUser.oid)
      
      if (!user) {
        // Check if user exists with this email
        user = await dataService.getUserByEmail(microsoftUser.email || microsoftUser.userPrincipalName)
        
        if (user) {
          // Link existing user to Microsoft account
          await dataService.updateUser(user.id, {
            userType: 'microsoft',
            externalId: microsoftUser.sub || microsoftUser.oid,
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          logger.info(`Linked existing user ${user.email} to Microsoft account`)
        } else {
          // Create new user from Microsoft profile
          user = await dataService.createUser({
            name: microsoftUser.name || microsoftUser.displayName || microsoftUser.email?.split('@')[0],
            email: microsoftUser.email || microsoftUser.userPrincipalName,
            passwordHash: null,
            role: 'user',
            userType: 'microsoft',
            externalId: microsoftUser.sub || microsoftUser.oid
          })
          logger.info(`Created new user from Microsoft: ${user.email}`)
        }
      } else {
        // Update last login
        await dataService.updateUser(user.id, {
          lastLogin: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }

      // Get session timeout from system settings
      let sessionTimeoutHours = 24
      try {
        const sessionSetting = await dataService.getSystemSetting('session_timeout')
        if (sessionSetting?.value) {
          sessionTimeoutHours = parseInt(sessionSetting.value)
        }
      } catch (error) {
        logger.warn('Failed to get session timeout setting, using default 24h:', error)
      }

      // Set user session
      await setUserSession(event, {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'user'
        },
        loggedInAt: Date.now(),
        oauth: {
          provider: 'microsoft',
          accessToken: tokens.access_token
        }
      }, {
        maxAge: 60 * 60 * sessionTimeoutHours
      })

      logger.info(`User ${user.email} logged in via Microsoft (session: ${sessionTimeoutHours}h)`)

      return sendRedirect(event, '/')
    } catch (error) {
      logger.error('Microsoft OAuth error:', error)
      return sendRedirect(event, '/login?error=microsoft_auth_failed')
    }
  },
  
  onError(event, error) {
    logger.error('Microsoft OAuth error:', error)
    return sendRedirect(event, '/login?error=microsoft_oauth_error')
  }
})
