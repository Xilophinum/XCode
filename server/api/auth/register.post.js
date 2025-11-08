import { getDataService } from '../../utils/dataService.js'
import bcrypt from 'bcryptjs'
import logger from '../../utils/logger.js'

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
      passwordHash: hashedPassword,
      role: 'user'
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
    
    // Set user session using nuxt-auth-utils with custom maxAge from system settings
    await setUserSession(event, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'user'
      },
      loggedInAt: Date.now()
    }, {
      maxAge: 60 * 60 * sessionTimeoutHours // Convert hours to seconds
    })

    logger.info(`User registered and logged in: ${user.email} (session: ${sessionTimeoutHours}h)`)
    
    return { 
      user: {
        id: user.id, 
        name: user.name, 
        email: user.email,
        role: 'user'
      }
    }
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