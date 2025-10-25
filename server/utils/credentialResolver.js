/**
 * Credential Resolver - Handles credential injection into job execution
 * 
 * Provides secure credential binding similar to Jenkins credentials plugin:
 * - Resolves credential references in node properties
 * - Decrypts and injects credentials as environment variables
 * - Cleans up credentials after job completion
 */

import { getDataService } from './dataService.js'
import crypto from 'crypto'
import LogMasker from './logMasker.js'
import logger from './logger.js'

const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-key-change-in-production'
const ALGORITHM = 'aes-256-gcm'

export class CredentialResolver {
  constructor() {
    this.dataService = null
    this.logMasker = new LogMasker()
  }

  async initialize() {
    this.dataService = await getDataService()
  }

  /**
   * Resolve credentials for a job and inject as environment variables
   * @param {Array} nodes - Workflow nodes that may contain credential references
   * @param {Object} baseEnv - Base environment variables
   * @returns {Object} - Environment variables with injected credentials
   */
  async resolveCredentials(nodes, baseEnv = {}) {
    if (!this.dataService) await this.initialize()

    const env = { ...baseEnv }
    const credentialIds = new Set()

    // Extract credential references from all nodes
    for (const node of nodes) {
      if (node.data?.credentials) {
        for (const credBinding of node.data.credentials) {
          if (credBinding.credentialId) {
            credentialIds.add(credBinding.credentialId)
          }
        }
      }
    }

    // Resolve each credential
    for (const credentialId of credentialIds) {
      try {
        const credential = await this.dataService.getCredentialById(credentialId)
        if (!credential || credential.isActive !== 'true') {
          logger.warn(`Credential ${credentialId} not found or inactive`)
          continue
        }

        // Check expiration
        if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
          logger.warn(`Credential ${credentialId} has expired`)
          continue
        }

        // Inject credential into environment based on type
        const resolvedValues = await this.injectCredential(credential, env, nodes)
        
        // Register credential values for log masking
        this.logMasker.registerCredential(credential, resolvedValues)
        
        // Update last used timestamp
        await this.dataService.updateCredentialLastUsed(credentialId)
        
      } catch (error) {
        logger.error(`Error resolving credential ${credentialId}:`, error)
      }
    }

    return env
  }

  /**
   * Inject a single credential into environment variables
   */
  async injectCredential(credential, env, nodes) {
    // Find how this credential is bound in the nodes
    const bindings = this.findCredentialBindings(credential.id, nodes)
    const resolvedValues = {}

    for (const binding of bindings) {
      const envVarName = binding.variable || this.getDefaultEnvVarName(credential, binding.field)
      
      switch (credential.type) {
        case 'password':
          if (binding.field === 'password' || !binding.field) {
            const password = this.decrypt(credential.password)
            env[envVarName] = password
            resolvedValues.password = password
          }
          break

        case 'user_pass':
          if (binding.field === 'username') {
            env[envVarName] = credential.username
            resolvedValues.username = credential.username
          } else if (binding.field === 'password') {
            const password = this.decrypt(credential.password)
            env[envVarName] = password
            resolvedValues.password = password
          } else if (!binding.field) {
            // Default: inject both
            const password = this.decrypt(credential.password)
            env[`${envVarName}_USERNAME`] = credential.username
            env[`${envVarName}_PASSWORD`] = password
            resolvedValues.username = credential.username
            resolvedValues.password = password
          }
          break

        case 'token':
          if (binding.field === 'token' || !binding.field) {
            const token = this.decrypt(credential.token)
            env[envVarName] = token
            resolvedValues.token = token
          }
          break

        case 'ssh_key':
          if (binding.field === 'private_key' || !binding.field) {
            const privateKey = this.decrypt(credential.privateKey)
            env[envVarName] = privateKey
            resolvedValues.private_key = privateKey
          }
          if (binding.field === 'username') {
            env[envVarName] = credential.username
            resolvedValues.username = credential.username
          }
          break

        case 'certificate':
          if (binding.field === 'certificate' || !binding.field) {
            const certificate = this.decrypt(credential.certificate)
            env[envVarName] = certificate
            resolvedValues.certificate = certificate
          }
          break

        case 'file':
          if (binding.field === 'file_data' || !binding.field) {
            const content = this.decrypt(credential.fileData)
            env[envVarName] = content
            resolvedValues.content = content
          }
          if (binding.field === 'file_name') {
            env[envVarName] = credential.fileName
          }
          break

        case 'custom':
          // Handle custom fields
          if (credential.customFields) {
            const customFields = JSON.parse(credential.customFields)
            if (binding.field && customFields[binding.field]) {
              const value = this.decrypt(customFields[binding.field])
              env[envVarName] = value
              resolvedValues[binding.field] = value
            }
          }
          break
      }
    }
    
    return resolvedValues
  }

  /**
   * Find credential bindings in nodes
   */
  findCredentialBindings(credentialId, nodes) {
    const bindings = []
    
    for (const node of nodes) {
      if (node.data?.credentials) {
        for (const binding of node.data.credentials) {
          if (binding.credentialId === credentialId) {
            bindings.push(binding)
          }
        }
      }
    }
    
    return bindings
  }

  /**
   * Generate default environment variable name
   */
  getDefaultEnvVarName(credential, field) {
    const baseName = credential.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')
    return field ? `${baseName}_${field.toUpperCase()}` : baseName
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    if (!text) return null
    
    try {
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipherGCM('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)))
      cipher.setIVLength(16)
      
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const authTag = cipher.getAuthTag()
      
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
    } catch (error) {
      logger.error('Error encrypting credential:', error)
      return text // Return unencrypted for fallback
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedText) {
    if (!encryptedText) return null
    
    try {
      const parts = encryptedText.split(':')
      if (parts.length !== 3) {
        // Assume unencrypted for backward compatibility
        return encryptedText
      }
      
      const [ivHex, authTagHex, encrypted] = parts
      const iv = Buffer.from(ivHex, 'hex')
      const authTag = Buffer.from(authTagHex, 'hex')
      
      const decipher = crypto.createDecipherGCM('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)))
      decipher.setAuthTag(authTag)
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      logger.error('Error decrypting credential:', error)
      // Return original for backward compatibility
      return encryptedText
    }
  }

  /**
   * Mask sensitive values in log output
   */
  maskLog(logOutput) {
    return this.logMasker.maskLog(logOutput)
  }

  /**
   * Clean up credential environment variables after job completion
   */
  cleanupCredentials(env, credentialVars) {
    for (const varName of credentialVars) {
      delete env[varName]
    }
    // Clear log masker
    this.logMasker.clear()
  }
}

// Singleton instance
let credentialResolver = null

export async function getCredentialResolver() {
  if (!credentialResolver) {
    credentialResolver = new CredentialResolver()
    await credentialResolver.initialize()
  }
  return credentialResolver
}