import { getDataService } from '../../utils/dataService.js'
import bcrypt from 'bcryptjs'

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