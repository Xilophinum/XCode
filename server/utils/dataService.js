import { getDB, users, items, envVariables, credentialVault, systemSettings, agents, auditLogs, projectSnapshots } from './database.js'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'
import { AuditLogger, generateChangesSummary, analyzeDiagramChanges } from './audit-logger.js'
import { AccessControl } from './accessControl.js'
import logger from './logger.js'

export class DataService {
  constructor() {
    this.db = null
    this.auditLogger = null
  }

  async initialize() {
    this.db = await getDB()
    // Initialize audit logger
    this.auditLogger = new AuditLogger(this.db, { auditLogs, projectSnapshots })
    // Initialize system settings with defaults if they don't exist
    await this.initializeSystemSettings()
  }

  // User methods
  async createUser(userData) {
    await this.ensureInitialized()
    
    const user = {
      id: Date.now().toString(),
      name: userData.name,
      email: userData.email,
      passwordHash: userData.passwordHash,
      role: userData.role || 'user',
      userType: userData.userType || 'local',
      externalId: userData.externalId || null,
      lastLogin: userData.lastLogin || null,
      isActive: userData.isActive || 'true',
      passwordChangeRequired: userData.passwordChangeRequired || 'false',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await this.db.insert(users).values(user)
    return user
  }

  async getUserByEmail(email) {
    await this.ensureInitialized()
    
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    const foundUser = user[0] || null
    if (foundUser && !foundUser.role) {
      foundUser.role = 'user' // Default role for existing users
    }
    return foundUser
  }

  async getUserByExternalId(userType, externalId) {
    await this.ensureInitialized()
    
    const user = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.userType, userType),
          eq(users.externalId, externalId)
        )
      )
      .limit(1)

    const foundUser = user[0] || null
    if (foundUser && !foundUser.role) {
      foundUser.role = 'user'
    }
    return foundUser
  }

  async getUserById(id) {
    await this.ensureInitialized()
    
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    const foundUser = user[0] || null
    if (foundUser && !foundUser.role) {
      foundUser.role = 'user' // Default role for existing users
    }
    return foundUser
  }

  // Item methods (folders and projects)
  async createItem(itemData, userInfo = null) {
    await this.ensureInitialized()

    const item = {
      id: Date.now().toString(),
      name: itemData.name,
      description: itemData.description || '',
      type: itemData.type,
      path: JSON.stringify(itemData.path || []),
      userId: itemData.userId,
      diagramData: itemData.diagramData ? JSON.stringify(itemData.diagramData) : null,
      status: itemData.status || 'active', // Default to active
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await this.db.insert(items).values(item)

    // Log audit event
    if (userInfo) {
      await this.auditLogger.logEvent({
        entityType: item.type,
        entityId: item.id,
        entityName: item.name,
        action: 'create',
        userId: userInfo.userId,
        userName: userInfo.userName,
        changesSummary: `Created ${item.type} "${item.name}"`,
        newData: this.parseItem(item),
        ipAddress: userInfo.ipAddress,
        userAgent: userInfo.userAgent
      })

      // Create initial snapshot for projects
      if (item.type === 'project' && item.diagramData) {
        await this.auditLogger.createSnapshot({
          projectId: item.id,
          projectName: item.name,
          diagramData: JSON.parse(item.diagramData),
          status: item.status,
          maxBuildsToKeep: itemData.maxBuildsToKeep || 50,
          maxLogDays: itemData.maxLogDays || 30,
          userId: userInfo.userId,
          userName: userInfo.userName,
          snapshotType: 'auto',
          description: 'Initial version'
        })
      }
    }

    // Return the item with parsed data
    return this.parseItem(item)
  }

  async getItemsByUserId(userId) {
    await this.ensureInitialized()
    
    const user = await this.getUserById(userId)
    if (!user) return []
    
    // Admin users see all items
    if (user.role === 'admin') {
      const allItems = await this.getAllItems()
      return allItems
    }
    
    // Regular users see items based on access control
    const allItems = await this.getAllItems()
    return await AccessControl.filterAccessibleItems(allItems, userId)
  }

  async getItemById(id) {
    await this.ensureInitialized()
    
    const item = await this.db
      .select()
      .from(items)
      .where(eq(items.id, id))
      .limit(1)

    return item[0] ? this.parseItem(item[0]) : null
  }

  async updateItem(id, updates, userInfo = null) {
    await this.ensureInitialized()
    // Get the item before update for audit log
    const previousItem = await this.getItemById(id)
    if (!previousItem) {
      throw new Error('Item not found')
    }

    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Handle path as JSON if provided
    if (updates.path) {
      updateData.path = JSON.stringify(updates.path)
    }

    // Handle diagramData as JSON if provided
    if (updates.diagramData) {
      updateData.diagramData = JSON.stringify(updates.diagramData)
    }

    // Handle allowedGroups as JSON if provided
    if (updates.allowedGroups !== undefined) {
      updateData.allowedGroups = updates.allowedGroups ? JSON.stringify(updates.allowedGroups) : null
    }

    await this.db
      .update(items)
      .set(updateData)
      .where(eq(items.id, id))

    const updatedItem = await this.getItemById(id)

    // Log audit event
    if (userInfo) {
      const changesSummary = generateChangesSummary(previousItem, updatedItem)

      // For projects with diagram changes, store detailed change metadata
      let diagramChangesMetadata = null
      if (updatedItem.type === 'project' && JSON.stringify(previousItem.diagramData) !== JSON.stringify(updatedItem.diagramData)) {
        diagramChangesMetadata = analyzeDiagramChanges(previousItem.diagramData, updatedItem.diagramData)
      }

      // Create a lightweight version of the data for audit log
      // Only include non-diagram fields to avoid duplication with snapshots
      const lightweightPrevData = {
        name: previousItem.name,
        description: previousItem.description,
        status: previousItem.status,
        maxBuildsToKeep: previousItem.maxBuildsToKeep,
        maxLogDays: previousItem.maxLogDays,
        allowedGroups: previousItem.allowedGroups,
        // Include diagram change metadata instead of full diagram
        diagramChanges: diagramChangesMetadata
      }

      const lightweightNewData = {
        name: updatedItem.name,
        description: updatedItem.description,
        status: updatedItem.status,
        maxBuildsToKeep: updatedItem.maxBuildsToKeep,
        maxLogDays: updatedItem.maxLogDays,
        allowedGroups: updatedItem.allowedGroups
      }

      await this.auditLogger.logEvent({
        entityType: updatedItem.type,
        entityId: updatedItem.id,
        entityName: updatedItem.name,
        action: 'update',
        userId: userInfo.userId,
        userName: userInfo.userName,
        changesSummary,
        previousData: updatedItem.type === 'project' ? lightweightPrevData : previousItem,
        newData: updatedItem.type === 'project' ? lightweightNewData : updatedItem,
        ipAddress: userInfo.ipAddress,
        userAgent: userInfo.userAgent
      })

      // Create snapshot for project updates (only when diagram actually changed)
      if (updatedItem.type === 'project' && updatedItem.diagramData && diagramChangesMetadata) {
        await this.auditLogger.createSnapshot({
          projectId: updatedItem.id,
          projectName: updatedItem.name,
          diagramData: updatedItem.diagramData,
          status: updatedItem.status,
          maxBuildsToKeep: updatedItem.maxBuildsToKeep || 50,
          maxLogDays: updatedItem.maxLogDays || 30,
          userId: userInfo.userId,
          userName: userInfo.userName,
          snapshotType: 'auto',
          description: changesSummary
        })
      }
    }

    return updatedItem
  }

  async deleteItem(id, userInfo = null) {
    await this.ensureInitialized()

    // Get item for audit log before deletion
    const item = userInfo ? await this.getItemById(id) : null

    await this.db
      .delete(items)
      .where(eq(items.id, id))

    // Log audit event
    if (userInfo && item) {
      await this.auditLogger.logEvent({
        entityType: item.type,
        entityId: item.id,
        entityName: item.name,
        action: 'delete',
        userId: userInfo.userId,
        userName: userInfo.userName,
        changesSummary: `Deleted ${item.type} "${item.name}"`,
        previousData: item,
        ipAddress: userInfo.ipAddress,
        userAgent: userInfo.userAgent
      })
    }
  }

  async getAllItems() {
    await this.ensureInitialized()

    const itemList = await this.db
      .select()
      .from(items)

    return itemList.map(item => this.parseItem(item))
  }

  async deleteItemWithCascade(id, userInfo = null) {
    await this.ensureInitialized()

    // First get the item to be deleted
    const itemToDelete = await this.getItemById(id)
    if (!itemToDelete) {
      throw new Error('Item not found')
    }

    // If it's a folder, we need to delete all children recursively
    if (itemToDelete.type === 'folder') {
      await this.deleteFolderAndChildren(itemToDelete, userInfo)
    } else {
      // For projects, just delete the item
      await this.deleteItem(id, userInfo)
    }
  }

  async deleteFolderAndChildren(folder, userInfo = null) {
    await this.ensureInitialized()

    // Build the path for children of this folder
    const childPath = [...folder.path, folder.name]

    // Find all items that are children of this folder
    // Children have a path that starts with the folder's path + folder name
    const allItems = await this.getAllItems()
    const childItems = allItems.filter(item => {
      // Check if this item's path starts with the folder's child path
      if (item.path.length >= childPath.length) {
        return childPath.every((segment, index) => item.path[index] === segment)
      }
      return false
    })

    // Delete all children first (recursively)
    for (const child of childItems) {
      if (child.type === 'folder') {
        await this.deleteFolderAndChildren(child, userInfo)
      } else {
        await this.deleteItem(child.id, userInfo)
      }
    }

    // Finally delete the folder itself
    await this.deleteItem(folder.id, userInfo)
  }

  // Helper methods
  parseItem(item) {
    return {
      ...item,
      path: JSON.parse(item.path || '[]'),
      diagramData: item.diagramData ? JSON.parse(item.diagramData) : null,
      allowedGroups: item.allowedGroups ? JSON.parse(item.allowedGroups) : [],
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }
  }

  async ensureInitialized() {
    if (!this.db) {
      await this.initialize()
    }
  }

  // Migration helper - to move localStorage data to database
  async migrateFromLocalStorage(localStorageData, userId) {
    await this.ensureInitialized()
    
    if (!localStorageData || !Array.isArray(localStorageData)) {
      return []
    }

    const migratedItems = []
    
    for (const item of localStorageData) {
      const migratedItem = await this.createItem({
        name: item.name,
        description: item.description || '',
        type: item.type,
        path: item.path || [],
        userId: userId,
        diagramData: item.diagramData || (item.nodes ? { nodes: item.nodes, edges: item.connections || [] } : null)
      })
      
      migratedItems.push(migratedItem)
    }

    return migratedItems
  }

  // Admin methods - Environment Variables
  async createEnvVariable(data) {
    await this.ensureInitialized()
    
    const envVar = {
      id: Date.now().toString(),
      key: data.key,
      value: data.value,
      description: data.description || '',
      isSecret: data.isSecret ? 'true' : 'false',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await this.db.insert(envVariables).values(envVar)
    return envVar
  }

  async getEnvVariables() {
    await this.ensureInitialized()
    
    const variables = await this.db.select().from(envVariables)
    return variables
  }

  async updateEnvVariable(id, updates) {
    await this.ensureInitialized()

    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Convert isSecret boolean to string for SQLite (if present in updates)
    if (typeof updateData.isSecret === 'boolean') {
      updateData.isSecret = updateData.isSecret ? 'true' : 'false'
    }

    await this.db
      .update(envVariables)
      .set(updateData)
      .where(eq(envVariables.id, id))

    return await this.db
      .select()
      .from(envVariables)
      .where(eq(envVariables.id, id))
      .limit(1)
      .then(result => result[0])
  }

  async deleteEnvVariable(id) {
    await this.ensureInitialized()
    
    await this.db
      .delete(envVariables)
      .where(eq(envVariables.id, id))
  }

  // Admin methods - Password Vault
  async createPasswordEntry(data) {
    await this.ensureInitialized()
    
    const entry = {
      id: Date.now().toString(),
      name: data.name,
      username: data.username || '',
      password: data.password, // Should be encrypted before calling this
      url: data.url || '',
      description: data.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await this.db.insert(passwordVault).values(entry)
    return entry
  }

  async getPasswordEntries() {
    await this.ensureInitialized()
    
    const entries = await this.db.select().from(passwordVault)
    return entries
  }

  async updatePasswordEntry(id, updates) {
    await this.ensureInitialized()
    
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    await this.db
      .update(passwordVault)
      .set(updateData)
      .where(eq(passwordVault.id, id))

    return await this.db
      .select()
      .from(passwordVault)
      .where(eq(passwordVault.id, id))
      .limit(1)
      .then(result => result[0])
  }

  async deletePasswordEntry(id) {
    await this.ensureInitialized()
    
    await this.db
      .delete(passwordVault)
      .where(eq(passwordVault.id, id))
  }

  // Admin methods - Credential Vault (Enhanced)
  async createCredential(data) {
    await this.ensureInitialized()
    
    const credential = {
      id: Date.now().toString(),
      name: data.name,
      type: data.type, // password, user_pass, token, ssh_key, certificate, file, custom
      description: data.description || '',
      username: data.username || null,
      password: data.password || null, // Should be encrypted before calling this
      token: data.token || null,
      privateKey: data.privateKey || null,
      certificate: data.certificate || null,
      fileData: data.fileData || null, // Base64 encoded file content
      fileName: data.fileName || null,
      fileMimeType: data.fileMimeType || null,
      url: data.url || null,
      environment: data.environment || null,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      customFields: data.customFields ? JSON.stringify(data.customFields) : null,
      expiresAt: data.expiresAt || null,
      lastUsed: null,
      isActive: 'true',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await this.db.insert(credentialVault).values(credential)
    return credential
  }

  async getCredentials() {
    await this.ensureInitialized()
    
    const credentials = await this.db.select().from(credentialVault)
    return credentials.map(cred => ({
      ...cred,
      tags: cred.tags ? JSON.parse(cred.tags) : [],
      customFields: cred.customFields ? JSON.parse(cred.customFields) : {},
      isActive: cred.isActive === 'true'
    }))
  }

  async getCredentialById(id) {
    await this.ensureInitialized()
    
    const credential = await this.db
      .select()
      .from(credentialVault)
      .where(eq(credentialVault.id, id))
      .limit(1)
      .then(result => result[0])
    
    if (credential) {
      credential.tags = credential.tags ? JSON.parse(credential.tags) : []
      credential.customFields = credential.customFields ? JSON.parse(credential.customFields) : {}
      credential.isActive = credential.isActive === 'true'
    }
    
    return credential
  }

  async updateCredential(id, updates) {
    await this.ensureInitialized()
    
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Handle JSON fields
    if (updates.tags) {
      updateData.tags = JSON.stringify(updates.tags)
    }
    if (updates.customFields) {
      updateData.customFields = JSON.stringify(updates.customFields)
    }
    if (typeof updates.isActive === 'boolean') {
      updateData.isActive = updates.isActive ? 'true' : 'false'
    }

    await this.db
      .update(credentialVault)
      .set(updateData)
      .where(eq(credentialVault.id, id))

    return await this.getCredentialById(id)
  }

  async deleteCredential(id) {
    await this.ensureInitialized()
    
    await this.db
      .delete(credentialVault)
      .where(eq(credentialVault.id, id))
  }

  async updateCredentialLastUsed(id) {
    await this.ensureInitialized()
    
    await this.db
      .update(credentialVault)
      .set({ 
        lastUsed: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(credentialVault.id, id))
  }

  async getCredentialsByType(type) {
    await this.ensureInitialized()
    
    const credentials = await this.db
      .select()
      .from(credentialVault)
      .where(eq(credentialVault.type, type))
    
    return credentials.map(cred => ({
      ...cred,
      tags: cred.tags ? JSON.parse(cred.tags) : [],
      customFields: cred.customFields ? JSON.parse(cred.customFields) : {},
      isActive: cred.isActive === 'true'
    }))
  }

  async getCredentialsByEnvironment(environment) {
    await this.ensureInitialized()
    
    const credentials = await this.db
      .select()
      .from(credentialVault)
      .where(eq(credentialVault.environment, environment))
    
    return credentials.map(cred => ({
      ...cred,
      tags: cred.tags ? JSON.parse(cred.tags) : [],
      customFields: cred.customFields ? JSON.parse(cred.customFields) : {},
      isActive: cred.isActive === 'true'
    }))
  }

  // Admin methods - System Settings
  async createSystemSetting(data) {
    await this.ensureInitialized()
    
    const setting = {
      id: data.id || Date.now().toString(),
      category: data.category,
      key: data.key,
      value: data.value,
      defaultValue: data.defaultValue,
      type: data.type,
      options: data.options,
      label: data.label,
      description: data.description,
      required: data.required,
      readonly: data.readonly,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await this.db.insert(systemSettings).values(setting)
    return setting
  }

  async getSystemSettings(category = null) {
    await this.ensureInitialized()
    
    if (category) {
      return await this.db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.category, category))
    }
    
    return await this.db.select().from(systemSettings)
  }

  async updateSystemSetting(id, updates) {
    await this.ensureInitialized()
    
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    await this.db
      .update(systemSettings)
      .set(updateData)
      .where(eq(systemSettings.id, id))

    return await this.db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.id, id))
      .limit(1)
      .then(result => result[0])
  }

  async getSystemSettingByKey(key) {
    await this.ensureInitialized()
    
    const result = await this.db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1)
    
    return result[0] || null
  }

  // Alias for getSystemSettingByKey
  async getSystemSetting(key) {
    return await this.getSystemSettingByKey(key)
  }

  async updateSystemSettingByKey(key, value) {
    await this.ensureInitialized()
    
    await this.db
      .update(systemSettings)
      .set({ 
        value: value,
        updatedAt: new Date().toISOString() 
      })
      .where(eq(systemSettings.key, key))

    return await this.getSystemSettingByKey(key)
  }

  async deleteSystemSetting(id) {
    await this.ensureInitialized()
    
    await this.db
      .delete(systemSettings)
      .where(eq(systemSettings.id, id))
  }

  // Admin methods - User Management
  async getAllUsers() {
    await this.ensureInitialized()
    
    const userList = await this.db.select().from(users)
    // Don't return password hashes
    return userList.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      userType: user.userType || 'local',
      externalId: user.externalId,
      lastLogin: user.lastLogin,
      isActive: user.isActive || 'true',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }))
  }

  async updateUserRole(userId, role) {
    await this.ensureInitialized()
    
    await this.db
      .update(users)
      .set({ 
        role: role,
        updatedAt: new Date().toISOString() 
      })
      .where(eq(users.id, userId))

    return await this.getUserById(userId)
  }

  async updateUser(userId, updates) {
    await this.ensureInitialized()
    
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))

    return await this.getUserById(userId)
  }

  // Admin methods - Agent Management
  async createAgent(agentData) {
    await this.ensureInitialized()
    
    // Use provided token or generate a secure token for the agent
    const token = agentData.token || crypto.randomBytes(32).toString('hex')
    
    const agent = {
      id: agentData.id || `agent-${Date.now()}`,
      name: agentData.name,
      description: agentData.description || '',
      token: token,
      maxConcurrentJobs: agentData.maxConcurrentJobs || 1,
      isLocal: agentData.isLocal === true ? 'true' : 'false',  // Convert boolean to string for DB
      
      // System information (will be populated when agent connects)
      hostname: null,
      platform: null,
      architecture: null,
      capabilities: null,
      systemInfo: null,
      agentVersion: null,
      // Runtime information
      status: agentData.status || 'offline',
      currentJobs: 0,
      lastHeartbeat: null,
      ipAddress: null,
      firstConnectedAt: null,
      totalBuilds: 0,
      
      // Optional metadata
      tags: JSON.stringify(agentData.tags || []),
      notes: agentData.notes || '',
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    await this.db.insert(agents).values(agent)
    return {
      ...agent,
      tags: JSON.parse(agent.tags || '[]')
    }
  }

  async getAgentByToken(token) {
    await this.ensureInitialized()
    const result = await this.db
      .select()
      .from(agents)
      .where(eq(agents.token, token))
      .limit(1)

    if (result.length === 0) return null
    
    const agent = result[0]
    return {
      ...agent,
      capabilities: JSON.parse(agent.capabilities || '[]'),
      tags: JSON.parse(agent.tags || '[]'),
      systemInfo: agent.systemInfo ? JSON.parse(agent.systemInfo) : null,
      isLocal: agent.isLocal === 'true'
    }
  }

  async registerAgent(token, systemData) {
    await this.ensureInitialized()
    
    const agent = await this.getAgentByToken(token)
    if (!agent) return null
    
    const updateData = {
      hostname: systemData.hostname,
      platform: systemData.platform,
      architecture: systemData.architecture,
      capabilities: JSON.stringify(systemData.capabilities || []),
      agentVersion: systemData.agentVersion,
      systemInfo: JSON.stringify(systemData.systemInfo || {}),
      ipAddress: systemData.ipAddress,
      status: 'online',
      lastHeartbeat: new Date().toISOString(),
      firstConnectedAt: agent.firstConnectedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    await this.db
      .update(agents)
      .set(updateData)
      .where(eq(agents.token, token))

    return await this.getAgentByToken(token)
  }

  async getAgents() {
    await this.ensureInitialized()
    const result = await this.db.select().from(agents)
    return result.map(agent => ({
      ...agent,
      capabilities: JSON.parse(agent.capabilities || '[]'),
      tags: JSON.parse(agent.tags || '[]'),
      systemInfo: agent.systemInfo ? JSON.parse(agent.systemInfo) : null,
      isLocal: agent.isLocal === 'true'
    }))
  }

  async getAgentById(id) {
    await this.ensureInitialized()
    const result = await this.db
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1)

    if (result.length === 0) return null
    
    const agent = result[0]
    return {
      ...agent,
      capabilities: JSON.parse(agent.capabilities || '[]'),
      tags: JSON.parse(agent.tags || '[]'),
      systemInfo: agent.systemInfo ? JSON.parse(agent.systemInfo) : null,
      isLocal: agent.isLocal === 'true'
    }
  }

  async getAgentByName(name) {
    await this.ensureInitialized()
    const result = await this.db
      .select()
      .from(agents)
      .where(eq(agents.name, name))
      .limit(1)

    if (result.length === 0) return null
    
    const agent = result[0]
    return {
      ...agent,
      capabilities: JSON.parse(agent.capabilities || '[]'),
      tags: JSON.parse(agent.tags || '[]'),
      systemInfo: agent.systemInfo ? JSON.parse(agent.systemInfo) : null,
      isLocal: agent.isLocal === 'true'
    }
  }

  async updateAgent(id, updates) {
    await this.ensureInitialized()
    
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    
    // Handle JSON fields
    if (updates.capabilities) {
      updateData.capabilities = JSON.stringify(updates.capabilities)
    }
    if (updates.tags) {
      updateData.tags = JSON.stringify(updates.tags)
    }
    if (updates.systemInfo) {
      updateData.systemInfo = JSON.stringify(updates.systemInfo)
    }
    if (typeof updates.isLocal === 'boolean') {
      updateData.isLocal = updates.isLocal ? 'true' : 'false'
    }
    
    await this.db
      .update(agents)
      .set(updateData)
      .where(eq(agents.id, id))

    return await this.getAgentById(id)
  }

  async updateAgentHeartbeat(id, status = 'online') {
    await this.ensureInitialized()

    await this.db
      .update(agents)
      .set({
        lastHeartbeat: new Date().toISOString(),
        status: status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(agents.id, id))

    return await this.getAgentById(id)
  }

  async updateAgentStatus(id, status) {
    await this.ensureInitialized()

    await this.db
      .update(agents)
      .set({
        status: status,
        currentJobs: status === 'offline' || status === 'disconnected' ? 0 : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(agents.id, id))

    logger.info(`Agent ${id} status updated to: ${status}`)
    return await this.getAgentById(id)
  }

  async markAllAgentsOffline() {
    await this.ensureInitialized()

    const result = await this.db
      .update(agents)
      .set({
        status: 'offline',
        currentJobs: 0,
        updatedAt: new Date().toISOString(),
      })

    logger.info('Marked all agents as offline on server startup')
    return result
  }

  async deleteAgent(id) {
    await this.ensureInitialized()
    
    const result = await this.db
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1)

    if (result.length === 0) return false
    
    await this.db
      .delete(agents)
      .where(eq(agents.id, id))

    return true
  }

  async getOnlineAgents() {
    await this.ensureInitialized()
    const result = await this.db
      .select()
      .from(agents)
      .where(eq(agents.status, 'online'))
    
    return result.map(agent => ({
      ...agent,
      capabilities: JSON.parse(agent.capabilities || '[]'),
      tags: JSON.parse(agent.tags || '[]')
    }))
  }

  async getAgentsByCapability(capability) {
    await this.ensureInitialized()
    const allAgents = await this.getAgents()
    
    return allAgents.filter(agent => 
      agent.capabilities.includes(capability) && agent.status === 'online'
    )
  }

  // System Settings methods
  async initializeSystemSettings() {
    await this.ensureInitialized()
    
    const defaultSettings = [
      // Branding Settings
      {
        id: 'brand_name',
        category: 'branding',
        key: 'brand_name',
        value: 'FlowForge',
        defaultValue: 'FlowForge',
        type: 'text',
        label: 'Brand Name',
        description: 'The application name shown in the navigation header',
        required: 'true',
        readonly: 'false'
      },
      {
        id: 'app_logo',
        category: 'branding',
        key: 'app_logo',
        value: null,
        defaultValue: null,
        type: 'file',
        label: 'Application Logo',
        description: 'Logo displayed next to the brand name (recommended: 32x32px PNG)',
        required: 'false',
        readonly: 'false'
      },
      
      // General Settings
      {
        id: 'admin_email',
        category: 'general',
        key: 'admin_email',
        value: 'admin@localhost',
        defaultValue: 'admin@localhost',
        type: 'text',
        label: 'Administrator Email',
        description: 'Email address of the system administrator',
        required: 'true',
        readonly: 'false'
      },
      {
        id: 'cron_timezone',
        category: 'general',
        key: 'cron_timezone',
        value: 'America/New_York',
        defaultValue: 'America/New_York',
        type: 'select',
        options: JSON.stringify([
          'UTC',
          'America/New_York',
          'America/Chicago',
          'America/Denver',
          'America/Los_Angeles',
          'America/Phoenix',
          'America/Anchorage',
          'America/Honolulu',
          'Europe/London',
          'Europe/Paris',
          'Europe/Berlin',
          'Europe/Moscow',
          'Asia/Tokyo',
          'Asia/Shanghai',
          'Asia/Kolkata',
          'Asia/Dubai',
          'Australia/Sydney',
          'Australia/Melbourne',
          'Pacific/Auckland'
        ]),
        label: 'Cron Job Timezone',
        description: 'Default timezone for all scheduled cron jobs',
        required: 'true',
        readonly: 'false'
      },
      {
        id: 'session_timeout',
        category: 'security',
        key: 'session_timeout',
        value: '24',
        defaultValue: '24',
        type: 'select',
        options: JSON.stringify(['1', '8', '24', '72', '168']),
        label: 'Session Timeout (hours)',
        description: 'How long user sessions remain active',
        required: 'true',
        readonly: 'false'
      },
      {
        id: 'log_level',
        category: 'general',
        key: 'log_level',
        value: 'info',
        defaultValue: 'info',
        type: 'select',
        options: JSON.stringify(['error', 'warn', 'info', 'debug']),
        label: 'Log Level',
        description: 'Console logging verbosity level (error = least verbose, debug = most verbose)',
        required: 'true',
        readonly: 'false'
      },

      // Security Settings
      {
        id: 'enable_registration',
        category: 'security',
        key: 'enable_registration',
        value: 'true',
        defaultValue: 'true',
        type: 'boolean',
        label: 'Enable User Registration',
        description: 'Allow new users to register accounts',
        required: 'true',
        readonly: 'false'
      },
      
      // Notification Settings
      {
        id: 'smtp_server',
        category: 'notifications',
        key: 'smtp_server',
        value: null,
        defaultValue: null,
        type: 'text',
        label: 'SMTP Server',
        description: 'SMTP server hostname for sending emails',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'smtp_port',
        category: 'notifications',
        key: 'smtp_port',
        value: '25',
        defaultValue: '25',
        type: 'number',
        label: 'SMTP Port',
        description: 'SMTP server port (common: 25, 587, 465, 1025 for MailHog)',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'smtp_username',
        category: 'notifications',
        key: 'smtp_username',
        value: null,
        defaultValue: null,
        type: 'text',
        label: 'SMTP Username',
        description: 'SMTP authentication username (leave empty for unauthenticated servers like MailHog)',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'smtp_password',
        category: 'notifications',
        key: 'smtp_password',
        value: null,
        defaultValue: null,
        type: 'password',
        label: 'SMTP Password',
        description: 'SMTP authentication password (leave empty for unauthenticated servers like MailHog)',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'smtp_secure',
        category: 'notifications',
        key: 'smtp_secure',
        value: 'false',
        defaultValue: 'false',
        type: 'boolean',
        label: 'Use SSL/TLS',
        description: 'Enable SSL/TLS encryption (use true for port 465, false for ports 25, 587, 1025)',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'default_email_from',
        category: 'notifications',
        key: 'default_email_from',
        value: 'noreply@localhost',
        defaultValue: 'noreply@localhost',
        type: 'text',
        label: 'Default From Address',
        description: 'Default email address to send notifications from',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'default_email_to',
        category: 'notifications',
        key: 'default_email_to',
        value: 'admin@localhost',
        defaultValue: 'admin@localhost',
        type: 'text',
        label: 'Default To Address',
        description: 'Default email address to send notifications to (comma-separated for multiple)',
        required: 'false',
        readonly: 'false'
      },

      // System Information (readonly)
      {
        id: 'system_version',
        category: 'system',
        key: 'system_version',
        value: '1.0.0',
        defaultValue: '1.0.0',
        type: 'text',
        label: 'System Version',
        description: 'Current version of the application',
        required: 'true',
        readonly: 'true'
      },
      {
        id: 'ldap_enabled',
        category: 'authentication',
        key: 'ldap_enabled',
        value: 'false',
        defaultValue: 'false',
        type: 'boolean',
        label: 'Enable LDAP Authentication',
        description: 'Enable LDAP/Active Directory authentication for users',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'ldap_url',
        category: 'authentication',
        key: 'ldap_url',
        value: '',
        defaultValue: '',
        type: 'text',
        label: 'LDAP Server URL',
        description: 'LDAP server URL (e.g., ldap://domain.com:389 or ldaps://domain.com:636)',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'ldap_bind_dn',
        category: 'authentication',
        key: 'ldap_bind_dn',
        value: '',
        defaultValue: '',
        type: 'text',
        label: 'Bind DN',
        description: 'Service account DN for LDAP binding (optional)',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'ldap_bind_password',
        category: 'authentication',
        key: 'ldap_bind_password',
        value: '',
        defaultValue: '',
        type: 'password',
        label: 'Bind Password',
        description: 'Service account password for LDAP binding (optional)',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'ldap_user_search_base',
        category: 'authentication',
        key: 'ldap_user_search_base',
        value: '',
        defaultValue: '',
        type: 'text',
        label: 'User Search Base',
        description: 'Base DN for user searches (e.g., ou=users,dc=domain,dc=com)',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'ldap_user_search_filter',
        category: 'authentication',
        key: 'ldap_user_search_filter',
        value: '(mail={username})',
        defaultValue: '(mail={username})',
        type: 'text',
        label: 'User Search Filter',
        description: 'LDAP filter for finding users. Use {username} placeholder (e.g., (mail={username}) or (sAMAccountName={username}))',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'ldap_timeout',
        category: 'authentication',
        key: 'ldap_timeout',
        value: '5000',
        defaultValue: '5000',
        type: 'number',
        label: 'Connection Timeout (ms)',
        description: 'LDAP connection timeout in milliseconds',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'ldap_auto_create_users',
        category: 'authentication',
        key: 'ldap_auto_create_users',
        value: 'true',
        defaultValue: 'true',
        type: 'boolean',
        label: 'Auto-create LDAP Users',
        description: 'Automatically create user accounts for successful LDAP authentications',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'ldap_default_role',
        category: 'authentication',
        key: 'ldap_default_role',
        value: 'user',
        defaultValue: 'user',
        type: 'select',
        options: JSON.stringify(['user', 'admin']),
        label: 'Default Role for LDAP Users',
        description: 'Default role assigned to new LDAP users',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'ldap_use_tls',
        category: 'authentication',
        key: 'ldap_use_tls',
        value: 'false',
        defaultValue: 'false',
        type: 'boolean',
        label: 'Use TLS/StartTLS',
        description: 'Enable TLS encryption for LDAP connections',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'ldap_tls_certificate',
        category: 'authentication',
        key: 'ldap_tls_certificate',
        value: '',
        defaultValue: '',
        type: 'file',
        label: 'TLS Certificate (.pem)',
        description: 'Upload CA certificate for TLS verification (optional)',
        required: 'false',
        readonly: 'false'
      },
      {
        id: 'user_groups',
        category: 'general',
        key: 'user_groups',
        value: '[]',
        defaultValue: '[]',
        type: 'text',
        label: 'User Groups',
        description: 'JSON array of available user groups for access control',
        required: 'false',
        readonly: 'true'
      }
    ]

    // Check if settings already exist, if not, insert them
    for (const setting of defaultSettings) {
      const existing = await this.db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, setting.key))
        .limit(1)

      if (!existing.length) {
        await this.createSystemSetting(setting)
      }
    }
  }
  
}

// Singleton instance
let dataService = null

export async function getDataService() {
  if (!dataService) {
    dataService = new DataService()
    await dataService.initialize()
  }
  return dataService
}