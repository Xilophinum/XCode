import { getDB, groups, userGroupMemberships } from './database.js'
import { eq, and } from 'drizzle-orm'
import logger from './logger.js'

/**
 * Extract CN (Common Name) from an LDAP DN string
 * Examples:
 *   "CN=DL-Admin-Group,OU=Groups,DC=example,DC=com" -> "DL-Admin-Group"
 *   "DL-Admin-Group" -> "DL-Admin-Group"
 * @param {string} dnOrCn - DN or CN string
 * @returns {string} - Extracted CN
 */
function extractCN(dnOrCn) {
  if (!dnOrCn) return ''

  // Check if it's a DN with CN= prefix
  const cnMatch = dnOrCn.match(/CN=([^,]+)/i)
  if (cnMatch) {
    return cnMatch[1].trim()
  }

  // Otherwise, return as-is (already a simple name)
  return dnOrCn.trim()
}

/**
 * Get all groups that a user should belong to based on their LDAP groups
 * @param {Array<string>} userLdapGroups - Array of LDAP group DNs/CNs from user's memberOf
 * @returns {Promise<Array>} - Array of group IDs
 */
export async function getGroupsForLdapUser(userLdapGroups) {
  if (!userLdapGroups || userLdapGroups.length === 0) {
    return []
  }

  try {
    const db = await getDB()

    // Get all groups with LDAP mappings
    const allGroups = await db.select().from(groups)

    const matchingGroupIds = []

    // Extract CNs from user's LDAP groups for comparison
    const userGroupCNs = userLdapGroups.map(g => extractCN(g).toLowerCase())

    for (const group of allGroups) {
      if (!group.ldapMappings) continue

      try {
        const ldapMappings = JSON.parse(group.ldapMappings)

        // Check if any of the user's LDAP groups match any of the group's LDAP mappings
        for (const mapping of ldapMappings) {
          if (!mapping || !mapping.trim()) continue

          // Extract CN from the mapping (supports both "DL-Admin-Group" and full DN)
          const mappingCN = extractCN(mapping).toLowerCase()

          // Check if any user group CN matches this mapping CN
          if (userGroupCNs.includes(mappingCN)) {
            matchingGroupIds.push(group.id)
            logger.debug(`User LDAP group CN "${mappingCN}" matches group "${group.name}" mapping "${mapping}"`)
            break
          }
        }
      } catch (error) {
        logger.error(`Failed to parse ldapMappings for group ${group.id}:`, error)
      }
    }

    return matchingGroupIds
  } catch (error) {
    logger.error('Failed to get groups for LDAP user:', error)
    return []
  }
}

/**
 * Sync a user's group memberships based on their LDAP groups
 * @param {string} userId - User ID
 * @param {Array<string>} userLdapGroups - Array of LDAP group DNs/CNs
 */
export async function syncUserGroupMemberships(userId, userLdapGroups) {
  try {
    const db = await getDB()

    // Get groups the user should belong to based on LDAP
    const targetGroupIds = await getGroupsForLdapUser(userLdapGroups)

    // Get current group memberships
    const currentMemberships = await db.select()
      .from(userGroupMemberships)
      .where(eq(userGroupMemberships.userId, userId))

    const currentGroupIds = currentMemberships.map(m => m.groupId)

    // Groups to add
    const toAdd = targetGroupIds.filter(gid => !currentGroupIds.includes(gid))

    // Groups to remove (only LDAP-mapped groups that user no longer qualifies for)
    const allGroups = await db.select().from(groups)
    const ldapMappedGroupIds = allGroups
      .filter(g => g.ldapMappings && JSON.parse(g.ldapMappings).length > 0)
      .map(g => g.id)

    const toRemove = currentGroupIds.filter(gid =>
      ldapMappedGroupIds.includes(gid) && !targetGroupIds.includes(gid)
    )

    // Add new memberships
    for (const groupId of toAdd) {
      await db.insert(userGroupMemberships).values({
        userId,
        groupId,
        createdAt: new Date().toISOString()
      })
      logger.info(`Added user ${userId} to group ${groupId} via LDAP mapping`)
    }

    // Remove old memberships
    for (const groupId of toRemove) {
      await db.delete(userGroupMemberships)
        .where(and(
          eq(userGroupMemberships.userId, userId),
          eq(userGroupMemberships.groupId, groupId)
        ))
      logger.info(`Removed user ${userId} from group ${groupId} (LDAP mapping no longer matches)`)
    }

    return {
      added: toAdd.length,
      removed: toRemove.length,
      total: targetGroupIds.length
    }
  } catch (error) {
    logger.error('Failed to sync user group memberships:', error)
    return { added: 0, removed: 0, total: 0 }
  }
}

/**
 * Get all group IDs for a user (both direct memberships and LDAP-mapped)
 * @param {string} userId - User ID
 * @returns {Promise<Array<string>>} - Array of group IDs
 */
export async function getUserGroupIds(userId) {
  try {
    const db = await getDB()

    const memberships = await db.select()
      .from(userGroupMemberships)
      .where(eq(userGroupMemberships.userId, userId))

    return memberships.map(m => m.groupId)
  } catch (error) {
    logger.error('Failed to get user group IDs:', error)
    return []
  }
}
