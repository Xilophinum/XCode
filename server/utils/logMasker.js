/**
 * Log masking utility to prevent credential exposure in logs
 * Masks sensitive values while preserving usernames (Jenkins-style)
 */

class LogMasker {
  constructor() {
    this.sensitiveValues = new Set()
    this.usernameValues = new Set()
  }

  /**
   * Register credential values for masking
   * @param {Object} credential - Credential object with type and fields
   * @param {Object} resolvedValues - Resolved credential values
   */
  registerCredential(credential, resolvedValues) {
    if (!credential || !resolvedValues) return

    switch (credential.type) {
      case 'user_pass':
        // Username can be unmasked, password must be masked
        if (resolvedValues.username) {
          this.usernameValues.add(resolvedValues.username)
        }
        if (resolvedValues.password) {
          this.sensitiveValues.add(resolvedValues.password)
        }
        break
      
      case 'password':
      case 'token':
      case 'ssh_key':
      case 'certificate':
        // All values are sensitive
        Object.values(resolvedValues).forEach(value => {
          if (value && typeof value === 'string') {
            this.sensitiveValues.add(value)
          }
        })
        break
      
      case 'file':
        // File content is sensitive
        if (resolvedValues.content) {
          this.sensitiveValues.add(resolvedValues.content)
        }
        break
      
      case 'custom':
        // Custom fields - mask all except those marked as non-sensitive
        Object.entries(resolvedValues).forEach(([key, value]) => {
          if (value && typeof value === 'string' && !key.toLowerCase().includes('username')) {
            this.sensitiveValues.add(value)
          }
        })
        break
    }
  }

  /**
   * Mask sensitive values in log output
   * @param {string} logOutput - Raw log output
   * @returns {string} Masked log output
   */
  maskLog(logOutput) {
    if (!logOutput || typeof logOutput !== 'string') return logOutput

    let maskedOutput = logOutput

    // Mask sensitive values with ****
    this.sensitiveValues.forEach(sensitiveValue => {
      if (sensitiveValue && sensitiveValue.length > 0) {
        // Create regex to match the sensitive value
        const escapedValue = sensitiveValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escapedValue, 'g')
        maskedOutput = maskedOutput.replace(regex, '****')
      }
    })

    return maskedOutput
  }

  /**
   * Clear all registered values (call after job completion)
   */
  clear() {
    this.sensitiveValues.clear()
    this.usernameValues.clear()
  }

  /**
   * Get count of registered sensitive values (for debugging)
   */
  getSensitiveCount() {
    return this.sensitiveValues.size
  }
}

export default LogMasker