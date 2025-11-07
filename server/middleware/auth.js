/**
 * Authentication Middleware
 *
 * Protects API routes by verifying JWT access tokens
 * Supports both:
 * - Authorization header: Bearer <token>
 * - Cookie: auth-token
 *
 * If token is invalid/expired, clears cookies and allows request to proceed
 * (frontend will handle redirect to login)
 */

import { verifyAccessToken } from '../utils/jwtAuth.js'
import logger from '../utils/logger.js'

/**
 * Middleware to verify JWT access token
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
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
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/me',      // User session verification - validates its own token
    '/api/health',
    '/api/system/status',
    '/api/agent/register',
    '/api/agent/heartbeat',
  ]

  // Check if path starts with any public route
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route))
  if (isPublicRoute) {
    return  // Skip authentication for public routes
  }

  // Get token from Authorization header or cookie
  let token = null

  // Try Authorization header first
  const authHeader = getRequestHeader(event, 'authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  }

  // Fallback to cookie if no header
  if (!token) {
    token = getCookie(event, 'auth-token')
  }

  // No token found - clear any stale cookies and return 401
  if (!token) {
    logger.debug(`No auth token for ${path} - clearing stale cookies`)

    // Clear any stale auth cookies
    setCookie(event, 'auth-token', '', { maxAge: 0 })
    setCookie(event, 'refresh-token', '', { maxAge: 0 })

    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - No token provided'
    })
  }

  // Verify token
  const decoded = verifyAccessToken(token, config.jwtSecret)
  if (!decoded) {
    logger.warn(`Invalid/expired token for ${path} - clearing cookies`)

    // Clear invalid tokens automatically
    setCookie(event, 'auth-token', '', { maxAge: 0 })
    setCookie(event, 'refresh-token', '', { maxAge: 0 })

    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - Token expired or invalid'
    })
  }

  // Attach user info to event context
  event.context.auth = {
    userId: decoded.userId,
    userName: decoded.userName,
    email: decoded.email,
    role: decoded.role
  }

  logger.debug(`Authenticated request from ${decoded.email} to ${path}`)
})
