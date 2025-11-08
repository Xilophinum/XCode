import logger from '../utils/logger.js'

/**
 * Session Hooks Plugin
 * Integrates with nuxt-auth-utils session lifecycle
 */
export default defineNitroPlugin(() => {
  // Called when the session is fetched (e.g., /api/_auth/session or useUserSession().fetch())
  sessionHooks.hook('fetch', async (session, event) => {
    if (session?.user) {
      logger.debug(`Session fetched for user: ${session.user.email}`)
      
      // Could extend session data from database here if needed
      // For example, fetch latest user permissions, profile updates, etc.
      // const dataService = await getDataService()
      // const freshUserData = await dataService.getUserById(session.user.id)
      // session.user = { ...session.user, ...freshUserData }
    }
  })

  // Called when we call useUserSession().clear() or clearUserSession(event)
  sessionHooks.hook('clear', async (session, event) => {
    if (session?.user) {
      logger.info(`🔴 Session cleared for user: ${session.user.email}`)
      
      // Could log to audit table here if needed
      // const dataService = await getDataService()
      // await dataService.logAuditEvent({
      //   userId: session.user.id,
      //   action: 'logout',
      //   timestamp: new Date().toISOString()
      // })
    } else {
      logger.debug('Session cleared (no user data)')
    }
  })

  logger.info('Session hooks plugin initialized')
})
