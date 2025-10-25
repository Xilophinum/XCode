import { getDataService } from '../../utils/dataService.js'
import { getAuthenticatedUser } from '../../utils/auth.js'
import crypto from 'crypto'
import logger from '~/server/utils/logger.js'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here' // Should be 32 chars
const ALGORITHM = 'aes-256-cbc'

function encrypt(text) {
  if (!text) return text
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export default defineEventHandler(async (event) => {
  try {
    // Check authentication and admin role
    const user = await getAuthenticatedUser(event)
    if (user.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Admin access required'
      })
    }

    const body = await readBody(event)
    const { 
      name, 
      type, 
      description, 
      username, 
      password, 
      token, 
      privateKey, 
      certificate, 
      fileData, 
      fileName, 
      fileMimeType,
      url, 
      environment, 
      tags, 
      customFields,
      expiresAt 
    } = body

    if (!name || !type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Name and type are required'
      })
    }

    // Validate credential type
    const validTypes = ['password', 'user_pass', 'token', 'ssh_key', 'certificate', 'file', 'custom']
    if (!validTypes.includes(type)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid credential type'
      })
    }

    // Encrypt sensitive fields
    const credentialData = {
      name,
      type,
      description,
      username,
      password: password ? encrypt(password) : null,
      token: token ? encrypt(token) : null,
      privateKey: privateKey ? encrypt(privateKey) : null,
      certificate: certificate ? encrypt(certificate) : null,
      fileData: fileData ? encrypt(fileData) : null,
      fileName,
      fileMimeType,
      url,
      environment,
      tags: tags || [],
      customFields: customFields || {},
      expiresAt
    }

    const dataService = await getDataService()
    const credential = await dataService.createCredential(credentialData)

    return { success: true, credential }
  } catch (error) {
    logger.error('Error creating credential:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create credential'
    })
  }
})