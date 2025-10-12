import { getDB } from '../server/utils/database.js'

// Initialize database on server startup
let dbInitialized = false

export default async function(nitroApp) {
  if (!dbInitialized) {
    try {
      await getDB()
      dbInitialized = true
    } catch (error) {
      console.error('Failed to initialize database:', error)
    }
  }
}