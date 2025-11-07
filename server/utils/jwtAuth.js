/**
 * JWT Authentication Utilities
 *
 * Enterprise-grade JWT implementation with:
 * - Short-lived access tokens (15 minutes)
 * - Long-lived refresh tokens (7 days)
 * - Token rotation on refresh
 * - Device/IP tracking
 * - Instant revocation via database
 */

import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { getDB, refreshTokens } from './database.js'
import { eq, and, lt } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import logger from './logger.js'

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'  // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7  // 7 days

/**
 * Generate a secure random token for refresh tokens
 */
function generateSecureToken() {
  return crypto.randomBytes(64).toString('hex')
}

/**
 * Hash a refresh token for storage
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Generate an access token (JWT)
 *
 * @param {Object} payload - Token payload {userId, userName, email, role}
 * @param {string} secret - JWT secret
 * @returns {string} - Signed JWT token
 */
export function generateAccessToken(payload, secret) {
  return jwt.sign(payload, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'flowforge',
    audience: 'flowforge-api'
  })
}

/**
 * Generate a refresh token and store it in database
 *
 * @param {string} userId - User ID
 * @param {Object} deviceInfo - Device information {ipAddress, userAgent, deviceInfo}
 * @returns {Promise<string>} - Refresh token
 */
export async function generateRefreshToken(userId, deviceInfo = {}) {
  const db = await getDB()
  const token = generateSecureToken()
  const tokenHash = hashToken(token)
  const tokenId = uuidv4()

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS)

  try {
    await db.insert(refreshTokens).values({
      id: tokenId,
      userId: userId,
      tokenHash: tokenHash,
      deviceInfo: deviceInfo.deviceInfo || null,
      ipAddress: deviceInfo.ipAddress || null,
      userAgent: deviceInfo.userAgent || null,
      expiresAt: expiresAt.toISOString(),
      isRevoked: 'false',
      createdAt: new Date().toISOString()
    })

    logger.info(`Generated refresh token for user ${userId} (expires: ${expiresAt.toISOString()})`)
    return token
  } catch (error) {
    logger.error('Failed to generate refresh token:', error)
    throw new Error('Failed to generate refresh token')
  }
}

/**
 * Verify an access token
 *
 * @param {string} token - JWT access token
 * @param {string} secret - JWT secret
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
export function verifyAccessToken(token, secret) {
  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'flowforge',
      audience: 'flowforge-api'
    })
    return decoded
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug('Access token expired')
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid access token')
    } else {
      logger.error('Access token verification error:', error)
    }
    return null
  }
}

/**
 * Verify a refresh token
 *
 * @param {string} token - Refresh token
 * @returns {Promise<Object|null>} - Token record or null if invalid
 */
export async function verifyRefreshToken(token) {
  const db = await getDB()
  const tokenHash = hashToken(token)

  try {
    const result = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1)

    if (!result || result.length === 0) {
      logger.warn('Refresh token not found in database')
      return null
    }

    const tokenRecord = result[0]

    // Check if token is revoked
    if (tokenRecord.isRevoked === 'true') {
      logger.warn(`Refresh token is revoked: ${tokenRecord.id}`)
      return null
    }

    // Check if token is expired
    const expiresAt = new Date(tokenRecord.expiresAt)
    if (expiresAt < new Date()) {
      logger.warn(`Refresh token expired: ${tokenRecord.id}`)
      return null
    }

    // Update last used timestamp
    await db
      .update(refreshTokens)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(refreshTokens.id, tokenRecord.id))

    return tokenRecord
  } catch (error) {
    logger.error('Failed to verify refresh token:', error)
    return null
  }
}

/**
 * Rotate refresh token (revoke old, create new)
 *
 * @param {string} oldToken - Old refresh token
 * @param {string} userId - User ID
 * @param {Object} deviceInfo - Device information
 * @returns {Promise<string|null>} - New refresh token or null if failed
 */
export async function rotateRefreshToken(oldToken, userId, deviceInfo = {}) {
  const db = await getDB()
  const oldTokenHash = hashToken(oldToken)

  try {
    // Revoke old token
    await db
      .update(refreshTokens)
      .set({
        isRevoked: 'true',
        revokedAt: new Date().toISOString(),
        revokedReason: 'rotated'
      })
      .where(eq(refreshTokens.tokenHash, oldTokenHash))

    // Generate new token
    const newToken = await generateRefreshToken(userId, deviceInfo)

    logger.info(`Rotated refresh token for user ${userId}`)
    return newToken
  } catch (error) {
    logger.error('Failed to rotate refresh token:', error)
    return null
  }
}

/**
 * Revoke a single refresh token
 *
 * @param {string} token - Refresh token to revoke
 * @param {string} reason - Revocation reason
 * @returns {Promise<boolean>} - True if revoked successfully
 */
export async function revokeRefreshToken(token, reason = 'logout') {
  const db = await getDB()
  const tokenHash = hashToken(token)

  try {
    await db
      .update(refreshTokens)
      .set({
        isRevoked: 'true',
        revokedAt: new Date().toISOString(),
        revokedReason: reason
      })
      .where(eq(refreshTokens.tokenHash, tokenHash))

    logger.info(`Revoked refresh token: ${reason}`)
    return true
  } catch (error) {
    logger.error('Failed to revoke refresh token:', error)
    return false
  }
}

/**
 * Revoke all refresh tokens for a user
 *
 * @param {string} userId - User ID
 * @param {string} reason - Revocation reason
 * @returns {Promise<boolean>} - True if revoked successfully
 */
export async function revokeAllUserTokens(userId, reason = 'logout_all') {
  const db = await getDB()

  try {
    await db
      .update(refreshTokens)
      .set({
        isRevoked: 'true',
        revokedAt: new Date().toISOString(),
        revokedReason: reason
      })
      .where(and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.isRevoked, 'false')
      ))

    logger.info(`Revoked all refresh tokens for user ${userId}: ${reason}`)
    return true
  } catch (error) {
    logger.error('Failed to revoke all user tokens:', error)
    return false
  }
}

/**
 * Clean up expired and revoked tokens (maintenance job)
 *
 * @returns {Promise<number>} - Number of tokens deleted
 */
export async function cleanupExpiredTokens() {
  const db = await getDB()
  const now = new Date().toISOString()

  try {
    // Delete tokens that are expired or revoked for more than 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const result = await db
      .delete(refreshTokens)
      .where(
        and(
          lt(refreshTokens.expiresAt, now),
          eq(refreshTokens.isRevoked, 'true')
        )
      )

    logger.info(`Cleaned up expired/revoked tokens`)
    return result
  } catch (error) {
    logger.error('Failed to cleanup expired tokens:', error)
    return 0
  }
}

/**
 * Get all active sessions for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of active sessions
 */
export async function getUserActiveSessions(userId) {
  const db = await getDB()

  try {
    const sessions = await db
      .select({
        id: refreshTokens.id,
        deviceInfo: refreshTokens.deviceInfo,
        ipAddress: refreshTokens.ipAddress,
        userAgent: refreshTokens.userAgent,
        createdAt: refreshTokens.createdAt,
        lastUsedAt: refreshTokens.lastUsedAt,
        expiresAt: refreshTokens.expiresAt
      })
      .from(refreshTokens)
      .where(and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.isRevoked, 'false')
      ))
      .orderBy(refreshTokens.createdAt)

    return sessions
  } catch (error) {
    logger.error('Failed to get user sessions:', error)
    return []
  }
}

/**
 * Revoke a specific session by ID
 *
 * @param {string} sessionId - Session/token ID
 * @param {string} userId - User ID (for verification)
 * @returns {Promise<boolean>} - True if revoked successfully
 */
export async function revokeSession(sessionId, userId) {
  const db = await getDB()

  try {
    await db
      .update(refreshTokens)
      .set({
        isRevoked: 'true',
        revokedAt: new Date().toISOString(),
        revokedReason: 'user_revoked'
      })
      .where(and(
        eq(refreshTokens.id, sessionId),
        eq(refreshTokens.userId, userId)
      ))

    logger.info(`User ${userId} revoked session ${sessionId}`)
    return true
  } catch (error) {
    logger.error('Failed to revoke session:', error)
    return false
  }
}
