import { getDataService } from '../../utils/dataService.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, password } = body
    const dataService = await getDataService()
    
    // Check if user exists in database
    let user = await dataService.getUserByEmail(email)
    
    // If no user exists and this is the default admin account, create it
    if (!user && email === 'admin@example.com') {
      const hashedPassword = await bcrypt.hash('password', 10)
      user = await dataService.createUser({
        name: 'Admin User',
        email: email,
        passwordHash: hashedPassword,
        role: 'admin'
      })
    }
    
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials'
      })
    }

    // Ensure user has a role (for backward compatibility)
    const userRole = user.role || 'user'

    // Create JWT token
    const config = useRuntimeConfig()
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: userRole },
      config.jwtSecret,
      { expiresIn: '24h' }
    )
    
    // Set HTTP-only cookie
    setCookie(event, 'auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    })

    return { id: user.id, name: user.name, email: user.email, role: userRole }
  } catch (error) {
    console.error('Login error:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to login'
    })
  }
})