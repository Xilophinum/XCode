import { getDataService } from '~/server/utils/dataService.js'
import logger from '~/server/utils/logger.js'

/**
 * Google OAuth Callback
 * Handles Google OAuth authentication flow
 */
export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user: googleUser, tokens }) {
    try {
      const dataService = await getDataService()
      
      // Check if user exists with this Google ID
      let user = await dataService.getUserByExternalId('google', googleUser.sub)
      
      if (!user) {
        // Check if user exists with this email
        user = await dataService.getUserByEmail(googleUser.email)
        
        if (user) {
          // Link existing user to Google account
          await dataService.updateUser(user.id, {
            userType: 'google',
            externalId: googleUser.sub,
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          logger.info(`Linked existing user ${user.email} to Google account`)
        } else {
          // Create new user from Google profile
          user = await dataService.createUser({
            name: googleUser.name || googleUser.email.split('@')[0],
            email: googleUser.email,
            passwordHash: null,
            role: 'user',
            userType: 'google',
            externalId: googleUser.sub
          })
          logger.info(`Created new user from Google: ${user.email}`)
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
          provider: 'google',
          accessToken: tokens.access_token
        }
      }, {
        maxAge: 60 * 60 * sessionTimeoutHours
      })

      logger.info(`User ${user.email} logged in via Google (session: ${sessionTimeoutHours}h)`)

      return sendRedirect(event, '/')
    } catch (error) {
      logger.error('Google OAuth error:', error)
      return sendRedirect(event, '/login?error=google_auth_failed')
    }
  },
  
  onError(event, error) {
    logger.error('Google OAuth error:', error)
    return sendRedirect(event, '/login?error=google_oauth_error')
  }
})
