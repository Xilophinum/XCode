/**
 * Authentication Middleware - Session-based
 *
 * Protects API routes by checking user session (nuxt-auth-utils)
 * Much simpler than JWT!
 */

import logger from '../utils/logger.js'

/**
 * Middleware to verify user session
 */
export default defineEventHandler(async (event) => {
  const path = event.node.req.url

  // Only apply to API routes - skip all non-API routes (frontend pages, assets, etc.)
  if (!path.startsWith('/api/')) {
    return  // Skip authentication for non-API routes
  }

  // Skip auth for public API routes - check /api/public/ first before other routes
  if (path.startsWith('/api/public/')) {
    return  // Skip authentication for all public API endpoints
  }

  // Skip auth for other specific public routes
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/me',      // Session check validates its own session
    '/api/health',
    '/api/system/status',
    '/api/agent/register',
    '/api/agent/heartbeat',
    '/api/projects/execute'
  ]

  // Check if path starts with any public route
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route))
  if (isPublicRoute) {
    return  // Skip authentication for public routes
  }
  
  // Check user session using nuxt-auth-utils
  const session = await getUserSession(event)
  
  if (!session || !session.user) {
    logger.info(`❌ No session for ${path}`)
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - No active session'
    })
  }

  // Attach user info to event context for backwards compatibility
  event.context.auth = {
    userId: session.user.id,
    userName: session.user.name,
    email: session.user.email,
    role: session.user.role
  }
})
