import { getDataService } from '~/server/utils/dataService.js'
import logger from '~/server/utils/logger.js'

/**
 * GitHub OAuth Callback
 * Handles GitHub OAuth authentication flow
 */
export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user: githubUser, tokens }) {
    try {
      const dataService = await getDataService()
      // Check if user exists with this GitHub ID
      let user = await dataService.getUserByExternalId('github', githubUser.id.toString())
      
      if (!user) {
        // Check if user exists with this email
        user = await dataService.getUserByEmail(githubUser.email)
        
        if (user) {
          // Link existing user to GitHub account
          await dataService.updateUser(user.id, {
            userType: 'github',
            externalId: githubUser.id.toString(),
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          logger.info(`Linked existing user ${user.email} to GitHub account`)
        } else {
          // Create new user from GitHub profile
          user = await dataService.createUser({
            name: githubUser.name || githubUser.login,
            email: githubUser.email,
            passwordHash: null, // OAuth users don't have passwords
            role: 'user',
            userType: 'github',
            externalId: githubUser.id.toString()
          })
          logger.info(`Created new user from GitHub: ${user.email}`)
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
          provider: 'github',
          accessToken: tokens.access_token // Store for API calls if needed
        }
      }, {
        maxAge: 60 * 60 * sessionTimeoutHours
      })

      logger.info(`User ${user.email} logged in via GitHub (session: ${sessionTimeoutHours}h)`)

      // Redirect to home page
      return sendRedirect(event, '/')
    } catch (error) {
      logger.error('GitHub OAuth error:', error)
      return sendRedirect(event, '/login?error=github_auth_failed')
    }
  },
  
  onError(event, error) {
    logger.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/login?error=github_oauth_error')
  }
})
