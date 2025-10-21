import { getDataService } from './dataService.js'

export class AccessControl {
  static async checkItemAccess(itemId, userId) {
    const dataService = await getDataService()
    
    // Get item and user data
    const [item, user] = await Promise.all([
      dataService.getItemById(itemId),
      dataService.getUserById(userId)
    ])
    
    if (!item || !user) return false
    
    // Admin users have access to everything
    if (user.role === 'admin') return true
    
    // Owner always has access
    if (item.userId === userId) return true
    
    // Check access policy
    switch (item.accessPolicy) {
      case 'public':
        return true
      case 'owner':
        return item.userId === userId
      case 'groups':
        return this.checkGroupAccess(item, user)
      default:
        return false
    }
  }
  
  static checkGroupAccess(item, user) {
    if (!item.allowedGroups || !user.groups) return false
    
    const allowedGroups = JSON.parse(item.allowedGroups || '[]')
    const userGroups = JSON.parse(user.groups || '[]')
    
    return allowedGroups.some(group => userGroups.includes(group))
  }
  
  static async filterAccessibleItems(items, userId) {
    const accessibleItems = []
    
    for (const item of items) {
      if (await this.checkItemAccess(item.id, userId)) {
        accessibleItems.push(item)
      }
    }
    
    return accessibleItems
  }
}