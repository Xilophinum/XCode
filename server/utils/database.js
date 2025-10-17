import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { createSchema } from './schema-factory.js'
import { resolve } from 'path'
import { existsSync, mkdirSync } from 'fs'

export class DatabaseManager {
  constructor() {
    this.db = null
    this.sqlite = null // Store raw SQLite instance
    this.postgres = null // Store raw PostgreSQL instance
    this.type = process.env.DATABASE_TYPE || 'sqlite'
    // Use absolute path to ensure database is created in the correct location
    this.url = process.env.DATABASE_URL || resolve(process.cwd(), 'data', 'projects.db')
  }

  async initialize() {
    switch (this.type) {
      case 'sqlite':
        await this.initializeSQLite()
        break
      case 'postgres':
        await this.initializePostgres()
        break
      default:
        throw new Error(`Unsupported database type: ${this.type}`)
    }

    // Run migrations
    await this.runMigrations()
    
    return this.db
  }

  async initializeSQLite() {
    // Ensure data directory exists
    const dbPath = this.url
    const dbDir = resolve(dbPath, '..')
    
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
    }

    this.sqlite = new Database(dbPath)
    this.sqlite.pragma('journal_mode = WAL')
    const schema = createSchema('sqlite')
    this.db = drizzle(this.sqlite, { schema })
  }

  async initializePostgres() {
    // Parse DATABASE_URL if individual variables aren't provided
    let connectionString = this.url
    
    if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
      throw new Error('Invalid PostgreSQL connection string. Must start with postgres:// or postgresql://')
    }

    console.log('🔄 Connecting to PostgreSQL database...')
    this.postgres = postgres(connectionString)
    const schema = createSchema('postgres')
    this.db = drizzlePostgres(this.postgres, { schema })
    console.log('✅ PostgreSQL database connected successfully')
    await this.postgres`SET client_min_messages TO warning;`
    await this.postgres`SET log_min_messages TO warning;`
    await this.postgres`SET log_min_error_statement TO error;`
  }



  async runMigrations() {
    if (this.type === 'sqlite') {
      await this.createSQLiteTables()
      await this.runSQLiteMigrations()
    } else if (this.type === 'postgres') {
      await this.createPostgresTables()
      await this.runPostgresMigrations()
    }
  }

  async runSQLiteMigrations() {
    // Drop legacy tables and migrate to unified builds
    try {
      this.sqlite.exec(`DROP TABLE IF EXISTS build_logs`)
      this.sqlite.exec(`DROP TABLE IF EXISTS jobs`)
      this.sqlite.exec(`DROP TABLE IF EXISTS job_outputs`)
      console.log('✅ Dropped legacy tables (build_logs, jobs, job_outputs)')
    } catch (error) {
      console.warn('⚠️ Migration warning (drop tables):', error.message)
    }

    // Add LDAP and access control columns to users table
    try {
      const columns = this.sqlite.prepare("PRAGMA table_info(users)").all()
      const columnNames = columns.map(col => col.name)
      
      const newColumns = [
        'user_type TEXT NOT NULL DEFAULT "local"',
        'external_id TEXT',
        'groups TEXT',
        'last_login TEXT',
        'is_active TEXT NOT NULL DEFAULT "true"'
      ]
      
      for (const column of newColumns) {
        const columnName = column.split(' ')[0]
        if (!columnNames.includes(columnName)) {
          this.sqlite.exec(`ALTER TABLE users ADD COLUMN ${column}`)
        }
      }
      
      console.log('✅ Updated users table with LDAP and access control support')
    } catch (error) {
      console.warn('⚠️ Migration warning (users columns):', error.message)
    }

    // Add access control columns to items table
    try {
      const columns = this.sqlite.prepare("PRAGMA table_info(items)").all()
      const columnNames = columns.map(col => col.name)
      
      const accessColumns = [
        'access_policy TEXT DEFAULT "public"',
        'allowed_groups TEXT'
      ]
      
      for (const column of accessColumns) {
        const columnName = column.split(' ')[0]
        if (!columnNames.includes(columnName)) {
          this.sqlite.exec(`ALTER TABLE items ADD COLUMN ${column}`)
        }
      }
      
      console.log('✅ Updated items table with access control support')
    } catch (error) {
      console.warn('⚠️ Migration warning (items access control):', error.message)
    }

    // Add new columns to existing builds table
    try {
      const columns = this.sqlite.prepare("PRAGMA table_info(builds)").all()
      const columnNames = columns.map(col => col.name)
      
      const newColumns = [
        'current_command_index INTEGER',
        'execution_commands TEXT',
        'current_node_id TEXT',
        'current_node_label TEXT',
        'nodes TEXT',
        'edges TEXT',
        'exit_code INTEGER',
        'error TEXT',
        'final_output TEXT',
        'can_retry_on_reconnect TEXT DEFAULT "false"',
        'parallel_branches_result TEXT',
        'parallel_matrix_result TEXT',
        'output_log TEXT',
        'last_sequence INTEGER DEFAULT 0'
      ]
      
      for (const column of newColumns) {
        const columnName = column.split(' ')[0]
        if (!columnNames.includes(columnName)) {
          this.sqlite.exec(`ALTER TABLE builds ADD COLUMN ${column}`)
        }
      }
      console.log('✅ Updated builds table with unified schema')
    } catch (error) {
      console.warn('⚠️ Migration warning (builds columns):', error.message)
    }

    // Add status column migration for existing items table (if needed)
    try {
      const result = this.sqlite.prepare("PRAGMA table_info(items)").all()
      const hasStatusColumn = result.some(column => column.name === 'status')
      
      if (!hasStatusColumn) {
        console.log('🔄 Adding status column to items table...')
        this.sqlite.exec(`ALTER TABLE items ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`)
        console.log('✅ Status column added to items table')
      }
    } catch (error) {
      console.warn('⚠️ Migration warning (status column):', error.message)
    }

    // Add retention settings columns for build management
    try {
      const result = this.sqlite.prepare("PRAGMA table_info(items)").all()
      const hasRetentionColumns = result.some(column => column.name === 'max_builds_to_keep')
      
      if (!hasRetentionColumns) {
        console.log('🔄 Adding retention settings columns to items table...')
        this.sqlite.exec(`ALTER TABLE items ADD COLUMN max_builds_to_keep INTEGER DEFAULT 50`)
        this.sqlite.exec(`ALTER TABLE items ADD COLUMN max_log_days INTEGER DEFAULT 30`)
        console.log('✅ Retention settings columns added to items table')
      }
    } catch (error) {
      console.warn('⚠️ Migration warning (retention columns):', error.message)
    }

    // Add isLocal column to agents table
    try {
      const result = this.sqlite.prepare("PRAGMA table_info(agents)").all()
      const hasIsLocalColumn = result.some(column => column.name === 'is_local')
      
      if (!hasIsLocalColumn) {
        console.log('🔄 Adding is_local column to agents table...')
        this.sqlite.exec(`ALTER TABLE agents ADD COLUMN is_local TEXT NOT NULL DEFAULT 'false'`)
        console.log('✅ is_local column added to agents table')
      }
    } catch (error) {
      console.warn('⚠️ Migration warning (is_local column):', error.message)
    }
  }

  async createSQLiteTables() {
    // Create tables if they don't exist using the raw sqlite instance
    try {
      // Users table
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          role TEXT,
          user_type TEXT NOT NULL DEFAULT 'local',
          external_id TEXT,
          groups TEXT,
          last_login TEXT,
          is_active TEXT NOT NULL DEFAULT 'true',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // Items table (folders and projects)
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL CHECK (type IN ('folder', 'project')),
          path TEXT NOT NULL,
          user_id TEXT NOT NULL,
          diagram_data TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          max_builds_to_keep INTEGER DEFAULT 50,
          max_log_days INTEGER DEFAULT 30,
          access_policy TEXT DEFAULT 'public',
          allowed_groups TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `)

      // Environment Variables table
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS envVariables (
          id TEXT PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          description TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // Credential Vault table (replaces passwordVault)
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS credential_vault (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          description TEXT,
          username TEXT,
          password TEXT,
          token TEXT,
          private_key TEXT,
          certificate TEXT,
          file_data TEXT,
          file_name TEXT,
          file_mime_type TEXT,
          url TEXT,
          environment TEXT,
          tags TEXT,
          custom_fields TEXT,
          expires_at TEXT,
          last_used TEXT,
          is_active TEXT NOT NULL DEFAULT 'true',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // Legacy Password Vault table (for backward compatibility)
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS passwordVault (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          username TEXT,
          password TEXT NOT NULL,
          url TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // Agents table
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          token TEXT NOT NULL UNIQUE,
          max_concurrent_jobs INTEGER NOT NULL DEFAULT 1,
          is_local TEXT NOT NULL DEFAULT 'false',
          hostname TEXT,
          platform TEXT,
          architecture TEXT,
          capabilities TEXT,
          version TEXT,
          system_info TEXT,
          status TEXT NOT NULL DEFAULT 'offline',
          current_jobs INTEGER NOT NULL DEFAULT 0,
          last_heartbeat TEXT,
          ip_address TEXT,
          first_connected_at TEXT,
          total_builds INTEGER NOT NULL DEFAULT 0,
          tags TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // System Settings table
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          key TEXT NOT NULL UNIQUE,
          value TEXT,
          default_value TEXT,
          type TEXT NOT NULL,
          options TEXT,
          label TEXT NOT NULL,
          description TEXT,
          required TEXT NOT NULL DEFAULT 'false',
          readonly TEXT NOT NULL DEFAULT 'false',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // Unified builds table (combines builds, jobs, and outputs)
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS builds (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          build_number INTEGER NOT NULL DEFAULT 0,
          agent_id TEXT,
          agent_name TEXT,
          trigger TEXT NOT NULL,
          status TEXT NOT NULL,
          message TEXT,
          started_at TEXT NOT NULL,
          finished_at TEXT,
          duration INTEGER,
          current_command_index INTEGER,
          execution_commands TEXT,
          current_node_id TEXT,
          current_node_label TEXT,
          nodes TEXT,
          edges TEXT,
          node_count INTEGER,
          nodes_executed INTEGER,
          exit_code INTEGER,
          error TEXT,
          final_output TEXT,
          can_retry_on_reconnect TEXT DEFAULT 'false',
          parallel_branches_result TEXT,
          parallel_matrix_result TEXT,
          git_branch TEXT,
          git_commit TEXT,
          metadata TEXT,
          output_log TEXT,
          last_sequence INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)



      // Cron Jobs table
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS cron_jobs (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          cron_node_id TEXT NOT NULL,
          cron_node_label TEXT NOT NULL,
          cron_expression TEXT NOT NULL,
          enabled TEXT NOT NULL DEFAULT 'true',
          nodes TEXT NOT NULL,
          edges TEXT NOT NULL,
          last_run TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // Audit Logs table
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          entity_name TEXT NOT NULL,
          action TEXT NOT NULL,
          user_id TEXT NOT NULL,
          user_name TEXT NOT NULL,
          changes_summary TEXT,
          previous_data TEXT,
          new_data TEXT,
          ip_address TEXT,
          user_agent TEXT,
          created_at TEXT NOT NULL
        )
      `)

      // Project Snapshots table
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS project_snapshots (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          project_name TEXT NOT NULL,
          version INTEGER NOT NULL,
          diagram_data TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL,
          max_builds_to_keep INTEGER,
          max_log_days INTEGER,
          created_by TEXT NOT NULL,
          created_by_name TEXT NOT NULL,
          snapshot_type TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `)



      // Create indexes for better performance
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_builds_project_id ON builds(project_id)`)
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status)`)
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_builds_started_at ON builds(started_at)`)
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_builds_build_number ON builds(project_id, build_number)`)

      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_cron_jobs_project_id ON cron_jobs(project_id)`)
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_cron_jobs_enabled ON cron_jobs(enabled)`)

      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id)`)
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type)`)
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`)
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`)
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`)

      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_project_snapshots_project_id ON project_snapshots(project_id)`)
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_project_snapshots_version ON project_snapshots(project_id, version)`)

    } catch (error) {
      console.error('Error creating tables:', error)
    }
  }



  async createPostgresTables() {
    try {
      console.log('🔄 Creating PostgreSQL tables...')
      // Create tables using raw SQL for PostgreSQL
      await this.postgres`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          role VARCHAR(50),
          user_type VARCHAR(50) NOT NULL DEFAULT 'local',
          external_id VARCHAR(255),
          groups TEXT,
          last_login TEXT,
          is_active VARCHAR(10) NOT NULL DEFAULT 'true',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `

      await this.postgres`
        CREATE TABLE IF NOT EXISTS items (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) NOT NULL CHECK (type IN ('folder', 'project')),
          path TEXT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          diagram_data TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          max_builds_to_keep INTEGER DEFAULT 50,
          max_log_days INTEGER DEFAULT 30,
          access_policy VARCHAR(50) DEFAULT 'public',
          allowed_groups TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `

      await this.postgres`
        CREATE TABLE IF NOT EXISTS env_variables (
          id VARCHAR(255) PRIMARY KEY,
          key VARCHAR(255) UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          is_secret VARCHAR(10) NOT NULL DEFAULT 'false',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `

      await this.postgres`
        CREATE TABLE IF NOT EXISTS credential_vault (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          description TEXT,
          username VARCHAR(255),
          password TEXT,
          token TEXT,
          private_key TEXT,
          certificate TEXT,
          file_data TEXT,
          file_name VARCHAR(255),
          file_mime_type VARCHAR(100),
          url VARCHAR(500),
          environment VARCHAR(50),
          tags TEXT,
          custom_fields TEXT,
          expires_at TEXT,
          last_used TEXT,
          is_active VARCHAR(10) NOT NULL DEFAULT 'true',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `

      await this.postgres`
        CREATE TABLE IF NOT EXISTS password_vault (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          username VARCHAR(255),
          password TEXT NOT NULL,
          url VARCHAR(500),
          description TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `

      await this.postgres`
        CREATE TABLE IF NOT EXISTS system_settings (
          id VARCHAR(255) PRIMARY KEY,
          category VARCHAR(100) NOT NULL,
          key VARCHAR(255) UNIQUE NOT NULL,
          value TEXT,
          default_value TEXT,
          type VARCHAR(50) NOT NULL,
          options TEXT,
          label VARCHAR(255) NOT NULL,
          description TEXT,
          required VARCHAR(10) NOT NULL DEFAULT 'false',
          readonly VARCHAR(10) NOT NULL DEFAULT 'false',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `

      await this.postgres`
        CREATE TABLE IF NOT EXISTS agents (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          token VARCHAR(255) UNIQUE NOT NULL,
          max_concurrent_jobs INTEGER NOT NULL DEFAULT 1,
          is_local VARCHAR(10) NOT NULL DEFAULT 'false',
          hostname VARCHAR(255),
          platform VARCHAR(50),
          architecture VARCHAR(50),
          capabilities TEXT,
          version VARCHAR(50),
          system_info TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'offline',
          current_jobs INTEGER NOT NULL DEFAULT 0,
          last_heartbeat TEXT,
          ip_address VARCHAR(45),
          first_connected_at TEXT,
          total_builds INTEGER NOT NULL DEFAULT 0,
          tags TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `

      await this.postgres`
        CREATE TABLE IF NOT EXISTS builds (
          id VARCHAR(255) PRIMARY KEY,
          project_id VARCHAR(255) NOT NULL,
          build_number INTEGER NOT NULL DEFAULT 0,
          agent_id VARCHAR(255),
          agent_name VARCHAR(255),
          trigger VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          message TEXT,
          started_at TEXT NOT NULL,
          finished_at TEXT,
          duration INTEGER,
          current_command_index INTEGER,
          execution_commands TEXT,
          current_node_id VARCHAR(255),
          current_node_label VARCHAR(255),
          nodes TEXT,
          edges TEXT,
          node_count INTEGER,
          nodes_executed INTEGER,
          exit_code INTEGER,
          error TEXT,
          final_output TEXT,
          can_retry_on_reconnect VARCHAR(10) DEFAULT 'false',
          parallel_branches_result TEXT,
          parallel_matrix_result TEXT,
          git_branch VARCHAR(255),
          git_commit VARCHAR(255),
          metadata TEXT,
          output_log TEXT,
          last_sequence INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `



      await this.postgres`
        CREATE TABLE IF NOT EXISTS cron_jobs (
          id VARCHAR(255) PRIMARY KEY,
          project_id VARCHAR(255) NOT NULL,
          cron_node_id VARCHAR(255) NOT NULL,
          cron_node_label VARCHAR(255) NOT NULL,
          cron_expression VARCHAR(100) NOT NULL,
          enabled VARCHAR(10) NOT NULL DEFAULT 'true',
          nodes TEXT NOT NULL,
          edges TEXT NOT NULL,
          last_run TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `

      await this.postgres`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(255) PRIMARY KEY,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(255) NOT NULL,
          entity_name VARCHAR(255) NOT NULL,
          action VARCHAR(50) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          changes_summary TEXT,
          previous_data TEXT,
          new_data TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TEXT NOT NULL
        )
      `

      await this.postgres`
        CREATE TABLE IF NOT EXISTS project_snapshots (
          id VARCHAR(255) PRIMARY KEY,
          project_id VARCHAR(255) NOT NULL,
          project_name VARCHAR(255) NOT NULL,
          version INTEGER NOT NULL,
          diagram_data TEXT NOT NULL,
          description TEXT,
          status VARCHAR(50) NOT NULL,
          max_builds_to_keep INTEGER,
          max_log_days INTEGER,
          created_by VARCHAR(255) NOT NULL,
          created_by_name VARCHAR(255) NOT NULL,
          snapshot_type VARCHAR(50) NOT NULL,
          created_at TEXT NOT NULL
        )
      `

      // Create indexes for better performance
      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_builds_project_id ON builds(project_id)`
      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_builds_status ON builds(status)`
      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_builds_started_at ON builds(started_at)`

      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cron_jobs_project_id ON cron_jobs(project_id)`
      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cron_jobs_enabled ON cron_jobs(enabled)`

      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id)`
      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type)`
      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`
      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`
      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`



      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_snapshots_project_id ON project_snapshots(project_id)`
      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_snapshots_version ON project_snapshots(project_id, version)`

      console.log('✅ PostgreSQL tables created successfully')
    } catch (error) {
      console.error('Error creating PostgreSQL tables:', error)
    }
  }

  async runPostgresMigrations() {
    // Drop legacy tables
    try {
      await this.postgres`DROP TABLE IF EXISTS build_logs`
      await this.postgres`DROP TABLE IF EXISTS jobs`
      await this.postgres`DROP TABLE IF EXISTS job_outputs`
      console.log('✅ Dropped legacy tables (build_logs, jobs, job_outputs)')
    } catch (error) {
      console.warn('⚠️ PostgreSQL migration warning (drop tables):', error.message)
    }

    // Add new columns to builds table
    try {
      await this.postgres`ALTER TABLE builds ADD COLUMN IF NOT EXISTS current_command_index INTEGER`
      await this.postgres`ALTER TABLE builds ADD COLUMN IF NOT EXISTS execution_commands TEXT`
      await this.postgres`ALTER TABLE builds ADD COLUMN IF NOT EXISTS current_node_id VARCHAR(255)`
      await this.postgres`ALTER TABLE builds ADD COLUMN IF NOT EXISTS current_node_label VARCHAR(255)`
      await this.postgres`ALTER TABLE builds ADD COLUMN IF NOT EXISTS nodes TEXT`
      await this.postgres`ALTER TABLE builds ADD COLUMN IF NOT EXISTS edges TEXT`
      await this.postgres`ALTER TABLE builds ADD COLUMN IF NOT EXISTS exit_code INTEGER`
      await this.postgres`ALTER TABLE builds ADD COLUMN IF NOT EXISTS error TEXT`
      await this.postgres`ALTER TABLE builds ADD COLUMN IF NOT EXISTS final_output TEXT`
      await this.postgres`ALTER TABLE builds ADD COLUMN IF NOT EXISTS can_retry_on_reconnect VARCHAR(10) DEFAULT 'false'`
      await this.postgres`ALTER TABLE builds ADD COLUMN IF NOT EXISTS parallel_branches_result TEXT`
      await this.postgres`ALTER TABLE builds ADD COLUMN IF NOT EXISTS parallel_matrix_result TEXT`
      await this.postgres`ALTER TABLE builds ADD COLUMN IF NOT EXISTS output_log TEXT`
      await this.postgres`ALTER TABLE builds ADD COLUMN IF NOT EXISTS last_sequence INTEGER DEFAULT 0`
      console.log('✅ Updated builds table with unified schema')
    } catch (error) {
      console.warn('⚠️ PostgreSQL migration warning (builds columns):', error.message)
    }

    // Add is_local column to agents table
    try {
      await this.postgres`ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_local VARCHAR(10) NOT NULL DEFAULT 'false'`
      console.log('✅ PostgreSQL migrations completed')
    } catch (error) {
      console.warn('⚠️ PostgreSQL migration warning:', error.message)
    }

    // Add LDAP support columns to users table
    try {
      await this.postgres`ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) NOT NULL DEFAULT 'local'`
      await this.postgres`ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id VARCHAR(255)`
      await this.postgres`ALTER TABLE users ADD COLUMN IF NOT EXISTS groups TEXT`
      await this.postgres`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TEXT`
      await this.postgres`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active VARCHAR(10) NOT NULL DEFAULT 'true'`
      await this.postgres`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`
      console.log('✅ Updated users table with LDAP support')
    } catch (error) {
      console.warn('⚠️ PostgreSQL migration warning (LDAP columns):', error.message)
    }

    // Add access control columns to items table
    try {
      await this.postgres`ALTER TABLE items ADD COLUMN IF NOT EXISTS access_policy VARCHAR(50) DEFAULT 'public'`
      await this.postgres`ALTER TABLE items ADD COLUMN IF NOT EXISTS allowed_groups TEXT`
      console.log('✅ Updated items table with access control support')
    } catch (error) {
      console.warn('⚠️ PostgreSQL migration warning (access control):', error.message)
    }
  }

  getDatabase() {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.db
  }
}

// Singleton instance
let dbManager = null

export async function getDB() {
  if (!dbManager) {
    dbManager = new DatabaseManager()
    await dbManager.initialize()
  }
  return dbManager.getDatabase()
}