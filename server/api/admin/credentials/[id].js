import { getDataService } from '../../../utils/dataService.js'
import { getAuthenticatedUser } from '../../../utils/auth.js'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here'
const ALGORITHM = 'aes-256-cbc'

function encrypt(text) {
  if (!text) return text
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(text) {
  if (!text) return text
  try {
    const parts = text.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const encryptedData = parts[1]
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY)
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    return text // Return original if decryption fails
  }
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

    const credentialId = getRouterParam(event, 'id')
    const method = getMethod(event)

    const dataService = await getDataService()

    if (method === 'GET') {
      // Get credential by ID with decrypted data
      const credential = await dataService.getCredentialById(credentialId)
      
      if (!credential) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Credential not found'
        })
      }

      // Decrypt sensitive fields for display/editing
      if (credential.password) credential.password = decrypt(credential.password)
      if (credential.token) credential.token = decrypt(credential.token)
      if (credential.privateKey) credential.privateKey = decrypt(credential.privateKey)
      if (credential.certificate) credential.certificate = decrypt(credential.certificate)
      if (credential.fileData) credential.fileData = decrypt(credential.fileData)

      return credential
    }

    if (method === 'PUT') {
      // Update credential
      const body = await readBody(event)
      const updates = { ...body }

      // Encrypt sensitive fields that are being updated
      if (updates.password) updates.password = encrypt(updates.password)
      if (updates.token) updates.token = encrypt(updates.token)
      if (updates.privateKey) updates.privateKey = encrypt(updates.privateKey)
      if (updates.certificate) updates.certificate = encrypt(updates.certificate)
      if (updates.fileData) updates.fileData = encrypt(updates.fileData)

      const updatedCredential = await dataService.updateCredential(credentialId, updates)
      return { success: true, credential: updatedCredential }
    }

    if (method === 'DELETE') {
      // Delete credential
      await dataService.deleteCredential(credentialId)
      return { success: true }
    }

    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })

  } catch (error) {
    console.error('Error handling credential operation:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to handle credential operation'
    })
  }
})