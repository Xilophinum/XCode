import { DatabaseManager } from '../utils/database.js'

let dbManager = null

export default async function () {
  if (!dbManager) {
    console.log('🔄 Initializing database...')
    dbManager = new DatabaseManager()
    await dbManager.initialize()
    console.log('✅ Database initialized successfully')
  }
}