import { getDataService } from './dataService.js'
import { getUserGroupIds } from './groupManager.js'
import logger from './logger.js'

export class AccessControl {
  static async checkItemAccess(itemId, userId) {
    const dataService = await getDataService()

    // Get item and user data
    const [item, user] = await Promise.all([
      dataService.getItemById(itemId),
      dataService.getUserById(userId)
    ])

    if (!item || !user) {
      logger.warn(`Item or user not found - itemId: ${itemId}, userId: ${userId}`)
      return false
    }

    // Admin users have access to everything
    if (user.role === 'admin') return true

    // Owner always has access
    if (item.userId === userId) return true

    // Check access policy (default to 'public' if not set)
    const accessPolicy = item.accessPolicy || 'public'
    switch (accessPolicy) {
      case 'public':
        return true
      case 'owner':
        return item.userId === userId
      case 'groups':
        const hasGroupAccess = await this.checkGroupAccess(item, userId)
        return hasGroupAccess
      default:
        return false
    }
  }

  static async checkGroupAccess(item, userId) {
    if (!item.allowedGroups) return false

    let allowedGroups
    try {
      // Try to parse as JSON
      allowedGroups = JSON.parse(item.allowedGroups)
    } catch (error) {
      // If parse fails, it might be a single value - wrap it in an array
      allowedGroups = [item.allowedGroups]
    }

    // Ensure it's an array
    if (!Array.isArray(allowedGroups)) {
      allowedGroups = [allowedGroups]
    }

    if (allowedGroups.length === 0) return false

    // Get user's group IDs from the new group membership system
    const userGroupIds = await getUserGroupIds(userId)
    // Normalize both arrays to strings for comparison
    const normalizedUserGroups = userGroupIds.map(g => String(g))
    const normalizedAllowedGroups = allowedGroups.map(g => String(g))

    // Check if user belongs to any of the allowed groups
    const hasAccess = normalizedAllowedGroups.some(groupId => normalizedUserGroups.includes(groupId))
    return hasAccess
  }

  static async filterAccessibleItems(items, userId) {
    const accessibleItems = []
    const dataService = await getDataService()
    const user = await dataService.getUserById(userId)

    if (!user) return []

    // Admin sees everything
    if (user.role === 'admin') {
      return items
    }

    // First pass: check direct access to each item
    const directlyAccessible = new Set()
    for (const item of items) {
      if (await this.checkItemAccess(item.id, userId)) {
        directlyAccessible.add(item.id)
        accessibleItems.push(item)
      }
    }

    // Second pass: for folders, include them if they contain any accessible items
    const foldersToInclude = new Set()
    for (const item of items) {
      if (item.type === 'folder' && !directlyAccessible.has(item.id)) {
        // Build the path that children would have
        const childPath = [...item.path, item.name]

        // Check if any item has this folder in its path and is accessible
        const hasAccessibleChildren = items.some(childItem => {
          // Check if this item is a child of the folder
          if (childItem.path.length >= childPath.length) {
            const isChild = childPath.every((segment, index) => childItem.path[index] === segment)
            return isChild && directlyAccessible.has(childItem.id)
          }
          return false
        })

        if (hasAccessibleChildren) {
          foldersToInclude.add(item.id)
          accessibleItems.push(item)
        }
      }
    }

    return accessibleItems
  }
}