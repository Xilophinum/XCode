import { getDataService } from '../../utils/dataService.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, password, name } = body
    const dataService = await getDataService()
    
    // Check if user already exists
    const existingUser = await dataService.getUserByEmail(email)
    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: 'User already exists with this email'
      })
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Create user in database
    const user = await dataService.createUser({
      name: name,
      email: email,
      passwordHash: hashedPassword
    })
    // Get session timeout from system settings
    let sessionTimeoutHours = 24 // Default fallback
    try {
      const sessionSetting = await dataService.getSystemSetting('session_timeout')
      if (sessionSetting?.value) {
        sessionTimeoutHours = parseInt(sessionSetting.value)
      }
    } catch (error) {
      logger.warn('Failed to get session timeout setting, using default 24h:', error)
    }

    // Create JWT token
    const config = useRuntimeConfig()
    const token = jwt.sign(
      { userId: user.id, userName: user.name, email: user.email, role: 'user' },
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
    
    return { id: user.id, name: user.name, email: user.email }
  } catch (error) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create user'
    })
  }
})