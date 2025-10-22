import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { createSchema } from './schema.js'
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
    // Migration: Update builds table to use composite primary key
    try {
      // Check if builds table has old schema with id column
      const tableInfo = this.sqlite.prepare("PRAGMA table_info(builds)").all()
      const hasIdColumn = tableInfo.some(col => col.name === 'id')
      
      if (hasIdColumn) {
        console.log('🔄 Migrating builds table to new schema...')
        
        // Backup existing data
        const existingBuilds = this.sqlite.prepare("SELECT * FROM builds").all()
        
        // Drop old table
        this.sqlite.exec("DROP TABLE builds")
        
        // Recreate with new schema
        this.sqlite.exec(`
          CREATE TABLE builds (
            project_id TEXT NOT NULL,
            project_name TEXT NOT NULL,
            build_number INTEGER NOT NULL,
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
            updated_at TEXT NOT NULL,
            PRIMARY KEY (project_id, build_number)
          )
        `)
        
        // Restore data (excluding id column)
        if (existingBuilds.length > 0) {
          const insertStmt = this.sqlite.prepare(`
            INSERT INTO builds (
              project_id, project_name, build_number, agent_id, agent_name,
              trigger, status, message, started_at, finished_at, duration,
              current_command_index, execution_commands, current_node_id,
              current_node_label, nodes, edges, node_count, nodes_executed,
              exit_code, error, final_output, can_retry_on_reconnect,
              parallel_branches_result, parallel_matrix_result, git_branch,
              git_commit, metadata, output_log, last_sequence, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          
          for (const build of existingBuilds) {
            insertStmt.run(
              build.project_id, build.project_name, build.build_number,
              build.agent_id, build.agent_name, build.trigger, build.status,
              build.message, build.started_at, build.finished_at, build.duration,
              build.current_command_index, build.execution_commands,
              build.current_node_id, build.current_node_label, build.nodes,
              build.edges, build.node_count, build.nodes_executed, build.exit_code,
              build.error, build.final_output, build.can_retry_on_reconnect,
              build.parallel_branches_result, build.parallel_matrix_result,
              build.git_branch, build.git_commit, build.metadata, build.output_log,
              build.last_sequence, build.created_at, build.updated_at
            )
          }
        }
        
        console.log(`✅ Migrated builds table with ${existingBuilds.length} records`)
      }
    } catch (error) {
      console.error('Error migrating builds table:', error)
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
          project_id TEXT NOT NULL,
          project_name TEXT NOT NULL,
          build_number INTEGER NOT NULL,
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
          updated_at TEXT NOT NULL,
          PRIMARY KEY (project_id, build_number)
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
          project_id VARCHAR(255) NOT NULL,
          project_name VARCHAR(255) NOT NULL,
          build_number INTEGER NOT NULL,
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
          updated_at TEXT NOT NULL,
          PRIMARY KEY (project_id, build_number)
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
    // Migration: Update builds table to use composite primary key
    try {
      // Check if builds table has old schema with id column
      const idColumnCheck = await this.postgres`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'builds' AND column_name = 'id'
      `
      
      if (idColumnCheck.length > 0) {
        console.log('🔄 Migrating builds table to new schema...')
        
        // Backup existing data
        const existingBuilds = await this.postgres`SELECT * FROM builds`
        
        // Drop old table
        await this.postgres`DROP TABLE builds`
        
        // Recreate with new schema
        await this.postgres`
          CREATE TABLE builds (
            project_id VARCHAR(255) NOT NULL,
            project_name VARCHAR(255) NOT NULL,
            build_number INTEGER NOT NULL,
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
            updated_at TEXT NOT NULL,
            PRIMARY KEY (project_id, build_number)
          )
        `
        
        // Restore data (excluding id column)
        if (existingBuilds.length > 0) {
          for (const build of existingBuilds) {
            await this.postgres`
              INSERT INTO builds (
                project_id, project_name, build_number, agent_id, agent_name,
                trigger, status, message, started_at, finished_at, duration,
                current_command_index, execution_commands, current_node_id,
                current_node_label, nodes, edges, node_count, nodes_executed,
                exit_code, error, final_output, can_retry_on_reconnect,
                parallel_branches_result, parallel_matrix_result, git_branch,
                git_commit, metadata, output_log, last_sequence, created_at, updated_at
              ) VALUES (
                ${build.project_id}, ${build.project_name}, ${build.build_number},
                ${build.agent_id}, ${build.agent_name}, ${build.trigger}, ${build.status},
                ${build.message}, ${build.started_at}, ${build.finished_at}, ${build.duration},
                ${build.current_command_index}, ${build.execution_commands},
                ${build.current_node_id}, ${build.current_node_label}, ${build.nodes},
                ${build.edges}, ${build.node_count}, ${build.nodes_executed}, ${build.exit_code},
                ${build.error}, ${build.final_output}, ${build.can_retry_on_reconnect},
                ${build.parallel_branches_result}, ${build.parallel_matrix_result},
                ${build.git_branch}, ${build.git_commit}, ${build.metadata}, ${build.output_log},
                ${build.last_sequence}, ${build.created_at}, ${build.updated_at}
              )
            `
          }
        }
        
        console.log(`✅ Migrated builds table with ${existingBuilds.length} records`)
      }
    } catch (error) {
      console.error('Error migrating builds table:', error)
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

// Export schema tables for direct access
// These are initialized when getDB() is first called
const schema = createSchema(process.env.DATABASE_TYPE || 'sqlite')
export const { users, items, envVariables, credentialVault, passwordVault, systemSettings, agents, builds, cronJobs, auditLogs, projectSnapshots } = schema