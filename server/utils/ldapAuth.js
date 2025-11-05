import { Client } from 'ldapts'
import { getDataService } from './dataService.js'
import logger from './logger.js'

export class LDAPAuthenticator {
  constructor(config) {
    this.config = config
    this.client = null
  }

  async connect() {
    try {
      const clientOptions = {
        url: this.config.url,
        timeout: this.config.timeout || 5000,
        connectTimeout: this.config.connectTimeout || 10000
      }

      // Add TLS options if enabled
      if (this.config.useTLS) {
        clientOptions.tlsOptions = {
          rejectUnauthorized: true
        }
        
        // Add custom CA certificate if provided
        if (this.config.tlsCertificate) {
          clientOptions.tlsOptions.ca = [this.config.tlsCertificate]
        }
      }

      this.client = new Client(clientOptions)
      
      // Use StartTLS if enabled and not using ldaps://
      if (this.config.useTLS && !this.config.url.startsWith('ldaps://')) {
        await this.client.startTLS()
      }
      
      logger.info('🔗 LDAP client connected')
    } catch (error) {
      logger.error('LDAP connection error:', error)
      throw error
    }
  }

  async authenticate(username, password) {
    try {
      await this.connect()

      // Bind with service account if configured
      if (this.config.bindDN && this.config.bindPassword) {
        await this.bind(this.config.bindDN, this.config.bindPassword)
      }

      // Search for user
      const userDN = await this.findUser(username)
      if (!userDN) {
        throw new Error('User not found in LDAP')
      }

      // Authenticate user
      await this.bind(userDN.dn, password)

      // Get user attributes
      const userInfo = await this.getUserInfo(userDN.dn)

      // Normalize groups to always be an array
      let groups = []
      if (userInfo.memberOf) {
        groups = Array.isArray(userInfo.memberOf) ? userInfo.memberOf : [userInfo.memberOf]
      }

      return {
        success: true,
        user: {
          dn: userDN.dn,
          username: userInfo.uid || userInfo.sAMAccountName || username,
          email: userInfo.mail || userInfo.email,
          name: userInfo.displayName || userInfo.cn || userInfo.name || username,
          groups: groups
        }
      }
    } catch (error) {
      logger.error('LDAP authentication failed:', error)
      return {
        success: false,
        error: error.message
      }
    } finally {
      if (this.client) {
        await this.client.unbind()
      }
    }
  }

  async bind(dn, password) {
    try {
      await this.client.bind(dn, password)
    } catch (error) {
      throw new Error(`LDAP bind failed: ${error.message}`)
    }
  }

  async findUser(username) {
    try {
      const searchFilter = this.config.userSearchFilter
        .replace('{username}', username)
        .replace('{0}', username)

      const opts = {
        filter: searchFilter,
        scope: 'sub',
        attributes: ['dn', 'cn', 'mail', 'displayName', 'uid', 'sAMAccountName']
      }

      const { searchEntries } = await this.client.search(this.config.userSearchBase, opts)
      
      if (searchEntries.length === 0) {
        return null
      }

      const entry = searchEntries[0]
      return {
        dn: entry.dn,
        attributes: entry
      }
    } catch (error) {
      throw error
    }
  }

  async getUserInfo(userDN) {
    try {
      const opts = {
        scope: 'base',
        attributes: [
          'cn', 'mail', 'displayName', 'uid', 'sAMAccountName', 
          'memberOf', 'name', 'email', 'givenName', 'sn'
        ]
      }

      const { searchEntries } = await this.client.search(userDN, opts)
      
      if (searchEntries.length === 0) {
        return {}
      }

      return searchEntries[0]
    } catch (error) {
      return {}
    }
  }

  static async createFromSettings() {
    try {
      const dataService = await getDataService()
      
      const settings = await Promise.all([
        dataService.getSystemSetting('ldap_enabled'),
        dataService.getSystemSetting('ldap_url'),
        dataService.getSystemSetting('ldap_bind_dn'),
        dataService.getSystemSetting('ldap_bind_password'),
        dataService.getSystemSetting('ldap_user_search_base'),
        dataService.getSystemSetting('ldap_user_search_filter'),
        dataService.getSystemSetting('ldap_timeout'),
        dataService.getSystemSetting('ldap_use_tls'),
        dataService.getSystemSetting('ldap_tls_certificate')
      ])

      const [enabled, url, bindDN, bindPassword, userSearchBase, userSearchFilter, timeout, useTLS, tlsCert] = settings

      if (!enabled?.value || enabled.value !== 'true') {
        return null
      }

      if (!url?.value || !userSearchBase?.value || !userSearchFilter?.value) {
        throw new Error('LDAP configuration incomplete')
      }

      const config = {
        url: url.value,
        bindDN: bindDN?.value,
        bindPassword: bindPassword?.value,
        userSearchBase: userSearchBase.value,
        userSearchFilter: userSearchFilter.value,
        timeout: parseInt(timeout?.value || '5000'),
        useTLS: useTLS?.value === 'true',
        tlsCertificate: tlsCert?.value
      }

      return new LDAPAuthenticator(config)
    } catch (error) {
      logger.error('Failed to create LDAP authenticator:', error)
      return null
    }
  }
}

export async function authenticateWithLDAP(username, password) {
  const ldapAuth = await LDAPAuthenticator.createFromSettings()
  
  if (!ldapAuth) {
    return { success: false, error: 'LDAP not configured' }
  }

  return await ldapAuth.authenticate(username, password)
}