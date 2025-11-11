import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2'
import postgres from 'postgres'
import mysql from 'mysql2/promise'
import { createSchema } from './schema.js'
import { resolve } from 'path'
import { existsSync, mkdirSync } from 'fs'
import logger from './logger.js'

export class DatabaseManager {
  constructor() {
    this.db = null
    this.sqlite = null // Store raw SQLite instance
    this.postgres = null // Store raw PostgreSQL instance
    this.mysql = null // Store raw MySQL instance
    this.type = process.env.DATABASE_TYPE || 'sqlite'
    // Use absolute path to ensure database is created in the correct location
    this.url = process.env.DATABASE_URL || resolve(process.cwd(), 'data', 'flowforge.db')
  }

  async initialize() {
    switch (this.type) {
      case 'sqlite':
        await this.initializeSQLite()
        break
      case 'postgres':
        await this.initializePostgres()
        break
      case 'mysql':
        await this.initializeMySQL()
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

    logger.info('Connecting to PostgreSQL database...')
    this.postgres = postgres(connectionString)
    const schema = createSchema('postgres')
    this.db = drizzlePostgres(this.postgres, { schema })
    logger.info('PostgreSQL database connected successfully')
    await this.postgres`SET client_min_messages TO warning;`
    await this.postgres`SET log_min_messages TO warning;`
    await this.postgres`SET log_min_error_statement TO error;`
  }

  async initializeMySQL() {
    // Parse DATABASE_URL if individual variables aren't provided
    let connectionString = this.url

    if (!connectionString.startsWith('mysql://')) {
      throw new Error('Invalid MySQL connection string. Must start with mysql://')
    }

    logger.info('Connecting to MySQL database...')
    this.mysql = await mysql.createConnection(connectionString)
    const schema = createSchema('mysql')
    this.db = drizzleMysql(this.mysql, { schema, mode: 'default' })
    logger.info('MySQL database connected successfully')
  }



  async runMigrations() {
    if (this.type === 'sqlite') {
      await this.createSQLiteTables()
      await this.runSQLiteMigrations()
    } else if (this.type === 'postgres') {
      await this.createPostgresTables()
      await this.runPostgresMigrations()
    } else if (this.type === 'mysql') {
      await this.createMySQLTables()
      await this.runMySQLMigrations()
    }
  }

  async runSQLiteMigrations() {
    // Migration
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
          password_change_required TEXT NOT NULL DEFAULT 'false',
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
        CREATE TABLE IF NOT EXISTS env_variables (
          id TEXT PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          description TEXT,
          is_secret TEXT NOT NULL DEFAULT 'false',
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
          system_info TEXT,
          status TEXT NOT NULL DEFAULT 'offline',
          current_jobs INTEGER NOT NULL DEFAULT 0,
          last_heartbeat TEXT,
          ip_address TEXT,
          first_connected_at TEXT,
          total_builds INTEGER NOT NULL DEFAULT 0,
          tags TEXT,
          notes TEXT,
          agent_version TEXT,
          server_version_compatible TEXT,
          update_available TEXT DEFAULT 'false',
          last_version_check TEXT,
          auto_update TEXT DEFAULT 'false',
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
          node_execution_states TEXT,
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

      // Project Templates table
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS project_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          diagram_data TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users (id)
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

      // Notification Templates table
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS notification_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL,
          is_built_in INTEGER DEFAULT 0,
          email_subject TEXT,
          email_body TEXT,
          email_html INTEGER DEFAULT 0,
          slack_message TEXT,
          slack_blocks TEXT,
          slack_mode TEXT DEFAULT 'simple',
          webhook_method TEXT,
          webhook_headers TEXT,
          webhook_body TEXT,
          created_by TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // System Updates table
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS system_updates (
          id TEXT PRIMARY KEY,
          current_version TEXT NOT NULL,
          target_version TEXT NOT NULL,
          status TEXT NOT NULL,
          download_progress INTEGER DEFAULT 0,
          download_url TEXT,
          release_notes TEXT,
          error_message TEXT,
          started_by TEXT,
          started_by_name TEXT,
          wait_for_jobs TEXT DEFAULT 'false',
          started_at TEXT NOT NULL,
          completed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // Groups table
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          ldap_mappings TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // User Group Memberships table
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS user_group_memberships (
          user_id TEXT NOT NULL,
          group_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (user_id, group_id)
        )
      `)

      // Metrics table - Consolidated schema
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS metrics (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT,
          metrics TEXT NOT NULL,
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
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type)`)
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_system_updates_status ON system_updates(status)`)
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)`)
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_metrics_entity_type ON metrics(entity_type)`)
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_metrics_entity ON metrics(entity_type, entity_id)`)
      this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp_entity ON metrics(timestamp, entity_type, entity_id)`)

      // Insert built-in notification templates if they don't exist
      await this.insertBuiltInTemplates()

    } catch (error) {
      logger.error('Error creating tables:', error)
    }
  }

  async insertBuiltInTemplates() {
    try {
      const now = new Date().toISOString()

      const builtInTemplates = [
        {
          id: 'template_email_success',
          name: 'Email: Build Success',
          description: 'Default template for successful build notifications via email',
          type: 'email',
          is_built_in: 1,
          email_subject: '[$ProjectName] Build #$BuildNumber - Success',
          email_body: 'Build #$BuildNumber of $ProjectName completed successfully at $TimestampHuman.\n\nStatus: $Status\nExit Code: $ExitCode\n\nJob ID: $JobId',
          email_html: 0,
          slack_message: null,
          slack_blocks: null,
          slack_mode: null,
          webhook_method: null,
          webhook_headers: null,
          webhook_body: null,
          created_by: 'system',
          created_at: now,
          updated_at: now
        },
        {
          id: 'template_email_failure',
          name: 'Email: Build Failure',
          description: 'Default template for failed build notifications via email',
          type: 'email',
          is_built_in: 1,
          email_subject: '[$ProjectName] Build #$BuildNumber - FAILED',
          email_body: 'Build #$BuildNumber of $ProjectName failed at $TimestampHuman.\n\nFailed Node: $FailedNodeLabel\nStatus: $Status\nExit Code: $ExitCode\n\nOutput:\n$Output\n\nJob ID: $JobId',
          email_html: 0,
          slack_message: null,
          slack_blocks: null,
          slack_mode: null,
          webhook_method: null,
          webhook_headers: null,
          webhook_body: null,
          created_by: 'system',
          created_at: now,
          updated_at: now
        },
        {
          id: 'template_slack_success',
          name: 'Slack: Build Success',
          description: 'Default template for successful build notifications via Slack with Block Kit formatting',
          type: 'slack',
          is_built_in: 1,
          email_subject: null,
          email_body: null,
          email_html: 0,
          slack_message: ':white_check_mark: *$ProjectName* - Build #$BuildNumber Success\n*Time:* $TimestampHuman\n*Exit Code:* $ExitCode',
          slack_blocks: JSON.stringify([
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: 'Build #$BuildNumber Succeeded',
                emoji: true
              }
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: '*Project:*\n$ProjectName' },
                { type: 'mrkdwn', text: '*Status:*\n$Status' },
                { type: 'mrkdwn', text: '*Exit Code:*\n$ExitCode' },
                { type: 'mrkdwn', text: '*Time:*\n$TimestampHuman' }
              ]
            },
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: 'Job ID: `$JobId`' }
              ]
            }
          ]),
          slack_mode: 'blocks',
          webhook_method: null,
          webhook_headers: null,
          webhook_body: null,
          created_by: 'system',
          created_at: now,
          updated_at: now
        },
        {
          id: 'template_slack_failure',
          name: 'Slack: Build Failure',
          description: 'Default template for failed build notifications via Slack with Block Kit formatting',
          type: 'slack',
          is_built_in: 1,
          email_subject: null,
          email_body: null,
          email_html: 0,
          slack_message: ':x: *$ProjectName* - Build #$BuildNumber Failed\n*Failed Node:* $FailedNodeLabel\n*Time:* $TimestampHuman\n*Exit Code:* $ExitCode',
          slack_blocks: JSON.stringify([
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: 'Build #$BuildNumber Failed',
                emoji: true
              }
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: '*Project:*\n$ProjectName' },
                { type: 'mrkdwn', text: '*Status:*\n$Status' },
                { type: 'mrkdwn', text: '*Exit Code:*\n$ExitCode' },
                { type: 'mrkdwn', text: '*Time:*\n$TimestampHuman' }
              ]
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Failed Node:* $FailedNodeLabel'
              }
            },
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: 'Job ID: `$JobId`' }
              ]
            }
          ]),
          slack_mode: 'blocks',
          webhook_method: null,
          webhook_headers: null,
          webhook_body: null,
          created_by: 'system',
          created_at: now,
          updated_at: now
        },
        {
          id: 'template_webhook_generic',
          name: 'Webhook: Generic',
          description: 'Generic webhook template with all context variables',
          type: 'webhook',
          is_built_in: 1,
          email_subject: null,
          email_body: null,
          email_html: 0,
          slack_message: null,
          slack_blocks: null,
          slack_mode: null,
          webhook_method: 'POST',
          webhook_headers: '{"Content-Type": "application/json"}',
          webhook_body: '{\n  "event": "build_complete",\n  "project": "$ProjectName",\n  "projectId": "$ProjectId",\n  "buildNumber": "$BuildNumber",\n  "jobId": "$JobId",\n  "status": "$Status",\n  "exitCode": $ExitCode,\n  "failedNode": "$FailedNodeLabel",\n  "timestamp": "$Timestamp",\n  "timestampHuman": "$TimestampHuman"\n}',
          created_by: 'system',
          created_at: now,
          updated_at: now
        }
      ]

      // Insert templates only if they don't already exist
      for (const template of builtInTemplates) {
        const existing = this.sqlite.prepare('SELECT id FROM notification_templates WHERE id = ?').get(template.id)
        if (!existing) {
          this.sqlite.prepare(`
            INSERT INTO notification_templates (
              id, name, description, type, is_built_in, email_subject, email_body, email_html,
              slack_message, slack_blocks, slack_mode, webhook_method, webhook_headers, webhook_body,
              created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            template.id, template.name, template.description, template.type, template.is_built_in,
            template.email_subject, template.email_body, template.email_html, template.slack_message,
            template.slack_blocks, template.slack_mode,
            template.webhook_method, template.webhook_headers, template.webhook_body,
            template.created_by, template.created_at, template.updated_at
          )
        }
      }

      logger.info('Built-in notification templates ensured')
    } catch (error) {
      logger.error('Error inserting built-in templates:', error)
    }
  }



  async createPostgresTables() {
    try {
      logger.info('🔄 Creating PostgreSQL tables...')
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
          password_change_required VARCHAR(10) NOT NULL DEFAULT 'false',
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
          system_info TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'offline',
          current_jobs INTEGER NOT NULL DEFAULT 0,
          last_heartbeat TEXT,
          ip_address VARCHAR(45),
          first_connected_at TEXT,
          total_builds INTEGER NOT NULL DEFAULT 0,
          tags TEXT,
          notes TEXT,
          agent_version VARCHAR(50),
          server_version_compatible VARCHAR(50),
          update_available VARCHAR(10) DEFAULT 'false',
          last_version_check TEXT,
          auto_update VARCHAR(10) DEFAULT 'false',
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
          node_execution_states TEXT,
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
        CREATE TABLE IF NOT EXISTS project_templates (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          diagram_data TEXT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users (id)
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

      await this.postgres`
        CREATE TABLE IF NOT EXISTS notification_templates (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) NOT NULL,
          is_built_in BOOLEAN DEFAULT false,
          email_subject TEXT,
          email_body TEXT,
          email_html BOOLEAN DEFAULT false,
          slack_message TEXT,
          slack_blocks TEXT,
          slack_mode VARCHAR(20) DEFAULT 'simple',
          webhook_method VARCHAR(10),
          webhook_headers TEXT,
          webhook_body TEXT,
          created_by VARCHAR(255),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `

      await this.postgres`
        CREATE TABLE IF NOT EXISTS system_updates (
          id VARCHAR(255) PRIMARY KEY,
          current_version VARCHAR(50) NOT NULL,
          target_version VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          download_progress INTEGER DEFAULT 0,
          download_url TEXT,
          release_notes TEXT,
          error_message TEXT,
          started_by VARCHAR(255),
          started_by_name VARCHAR(255),
          wait_for_jobs VARCHAR(10) DEFAULT 'false',
          started_at TEXT NOT NULL,
          completed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `

      await this.postgres`
        CREATE TABLE IF NOT EXISTS groups (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          ldap_mappings TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `

      await this.postgres`
        CREATE TABLE IF NOT EXISTS user_group_memberships (
          user_id VARCHAR(255) NOT NULL,
          group_id VARCHAR(255) NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (user_id, group_id)
        )
      `

      await this.postgres`
        CREATE TABLE IF NOT EXISTS metrics (
          id VARCHAR(255) PRIMARY KEY,
          timestamp TEXT NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(255),
          metrics TEXT NOT NULL,
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
      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_updates_status ON system_updates(status)`
      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)`
      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_entity_type ON metrics(entity_type)`
      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_entity ON metrics(entity_type, entity_id)`
      await this.postgres`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_timestamp_entity ON metrics(timestamp, entity_type, entity_id)`

      logger.info('PostgreSQL tables created successfully')
    } catch (error) {
      logger.error('Error creating PostgreSQL tables:', error)
    }
  }

  async runPostgresMigrations() {
    // Migration
  }

  async createMySQLTables() {
    try {
      logger.info('🔄 Creating MySQL tables...')
      // Create tables using raw SQL for MySQL
      await this.mysql.query(`
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
          password_change_required VARCHAR(10) NOT NULL DEFAULT 'false',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      await this.mysql.query(`
        CREATE TABLE IF NOT EXISTS items (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) NOT NULL CHECK (type IN ('folder', 'project')),
          path TEXT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          diagram_data TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          max_builds_to_keep INT DEFAULT 50,
          max_log_days INT DEFAULT 30,
          access_policy VARCHAR(50) DEFAULT 'public',
          allowed_groups TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      await this.mysql.query(`
        CREATE TABLE IF NOT EXISTS env_variables (
          id VARCHAR(255) PRIMARY KEY,
          \`key\` VARCHAR(255) UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          is_secret VARCHAR(10) NOT NULL DEFAULT 'false',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      await this.mysql.query(`
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
      `)

      await this.mysql.query(`
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
      `)

      await this.mysql.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id VARCHAR(255) PRIMARY KEY,
          category VARCHAR(100) NOT NULL,
          \`key\` VARCHAR(255) UNIQUE NOT NULL,
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
      `)

      await this.mysql.query(`
        CREATE TABLE IF NOT EXISTS agents (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          token VARCHAR(255) UNIQUE NOT NULL,
          max_concurrent_jobs INT NOT NULL DEFAULT 1,
          is_local VARCHAR(10) NOT NULL DEFAULT 'false',
          hostname VARCHAR(255),
          platform VARCHAR(50),
          architecture VARCHAR(50),
          capabilities TEXT,
          system_info TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'offline',
          current_jobs INT NOT NULL DEFAULT 0,
          last_heartbeat TEXT,
          ip_address VARCHAR(45),
          first_connected_at TEXT,
          total_builds INT NOT NULL DEFAULT 0,
          tags TEXT,
          notes TEXT,
          agent_version VARCHAR(50),
          server_version_compatible VARCHAR(50),
          update_available VARCHAR(10) DEFAULT 'false',
          last_version_check TEXT,
          auto_update VARCHAR(10) DEFAULT 'false',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      await this.mysql.query(`
        CREATE TABLE IF NOT EXISTS builds (
          project_id VARCHAR(255) NOT NULL,
          project_name VARCHAR(255) NOT NULL,
          build_number INT NOT NULL,
          agent_id VARCHAR(255),
          agent_name VARCHAR(255),
          trigger VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          message TEXT,
          started_at TEXT NOT NULL,
          finished_at TEXT,
          duration INT,
          current_command_index INT,
          execution_commands TEXT,
          current_node_id VARCHAR(255),
          current_node_label VARCHAR(255),
          nodes TEXT,
          edges TEXT,
          node_count INT,
          nodes_executed INT,
          exit_code INT,
          error TEXT,
          final_output TEXT,
          can_retry_on_reconnect VARCHAR(10) DEFAULT 'false',
          parallel_branches_result TEXT,
          parallel_matrix_result TEXT,
          git_branch VARCHAR(255),
          git_commit VARCHAR(255),
          metadata TEXT,
          output_log TEXT,
          node_execution_states TEXT,
          last_sequence INT DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (project_id, build_number)
        )
      `)

      await this.mysql.query(`
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
      `)

      await this.mysql.query(`
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
      `)

      await this.mysql.query(`
        CREATE TABLE IF NOT EXISTS project_templates (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          diagram_data TEXT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `)

      await this.mysql.query(`
        CREATE TABLE IF NOT EXISTS project_snapshots (
          id VARCHAR(255) PRIMARY KEY,
          project_id VARCHAR(255) NOT NULL,
          project_name VARCHAR(255) NOT NULL,
          version INT NOT NULL,
          diagram_data TEXT NOT NULL,
          description TEXT,
          status VARCHAR(50) NOT NULL,
          max_builds_to_keep INT,
          max_log_days INT,
          created_by VARCHAR(255) NOT NULL,
          created_by_name VARCHAR(255) NOT NULL,
          snapshot_type VARCHAR(50) NOT NULL,
          created_at TEXT NOT NULL
        )
      `)

      await this.mysql.query(`
        CREATE TABLE IF NOT EXISTS notification_templates (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) NOT NULL,
          is_built_in BOOLEAN DEFAULT false,
          email_subject TEXT,
          email_body TEXT,
          email_html BOOLEAN DEFAULT false,
          slack_message TEXT,
          slack_blocks TEXT,
          slack_mode VARCHAR(20) DEFAULT 'simple',
          webhook_method VARCHAR(10),
          webhook_headers TEXT,
          webhook_body TEXT,
          created_by VARCHAR(255),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      await this.mysql.query(`
        CREATE TABLE IF NOT EXISTS system_updates (
          id VARCHAR(255) PRIMARY KEY,
          current_version VARCHAR(50) NOT NULL,
          target_version VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          download_progress INT DEFAULT 0,
          download_url TEXT,
          release_notes TEXT,
          error_message TEXT,
          started_by VARCHAR(255),
          started_by_name VARCHAR(255),
          wait_for_jobs VARCHAR(10) DEFAULT 'false',
          started_at TEXT NOT NULL,
          completed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      await this.mysql.query(`
        CREATE TABLE IF NOT EXISTS \`groups\` (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          ldap_mappings TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      await this.mysql.query(`
        CREATE TABLE IF NOT EXISTS user_group_memberships (
          user_id VARCHAR(255) NOT NULL,
          group_id VARCHAR(255) NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (user_id, group_id)
        )
      `)

      await this.mysql.query(`
        CREATE TABLE IF NOT EXISTS metrics (
          id VARCHAR(255) PRIMARY KEY,
          timestamp TEXT NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(255),
          metrics TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `)

      // Create indexes for better performance
      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_builds_project_id ON builds(project_id)`)
      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status)`)
      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_builds_started_at ON builds(started_at)`)

      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_cron_jobs_project_id ON cron_jobs(project_id)`)
      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_cron_jobs_enabled ON cron_jobs(enabled)`)

      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id)`)
      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type)`)
      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`)
      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`)
      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`)

      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_project_snapshots_project_id ON project_snapshots(project_id)`)
      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_project_snapshots_version ON project_snapshots(project_id, version)`)
      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_system_updates_status ON system_updates(status)`)
      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)`)
      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_metrics_entity_type ON metrics(entity_type)`)
      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_metrics_entity ON metrics(entity_type, entity_id)`)
      await this.mysql.query(`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp_entity ON metrics(timestamp, entity_type, entity_id)`)

      logger.info('MySQL tables created successfully')

      // Insert built-in notification templates
      await this.insertBuiltInTemplatesMySQL()
    } catch (error) {
      logger.error('Error creating MySQL tables:', error)
    }
  }

  async insertBuiltInTemplatesMySQL() {
    try {
      const now = new Date().toISOString()

      const builtInTemplates = [
        {
          id: 'template_email_success',
          name: 'Email: Build Success',
          description: 'Default template for successful build notifications via email',
          type: 'email',
          is_built_in: 1,
          email_subject: '[$ProjectName] Build #$BuildNumber - Success',
          email_body: 'Build #$BuildNumber of $ProjectName completed successfully at $TimestampHuman.\\n\\nStatus: $Status\\nExit Code: $ExitCode\\n\\nJob ID: $JobId',
          email_html: 0,
          slack_message: null,
          slack_blocks: null,
          slack_mode: null,
          webhook_method: null,
          webhook_headers: null,
          webhook_body: null,
          created_by: 'system',
          created_at: now,
          updated_at: now
        },
        {
          id: 'template_email_failure',
          name: 'Email: Build Failure',
          description: 'Default template for failed build notifications via email',
          type: 'email',
          is_built_in: 1,
          email_subject: '[$ProjectName] Build #$BuildNumber - FAILED',
          email_body: 'Build #$BuildNumber of $ProjectName failed at $TimestampHuman.\\n\\nFailed Node: $FailedNodeLabel\\nStatus: $Status\\nExit Code: $ExitCode\\n\\nOutput:\\n$Output\\n\\nJob ID: $JobId',
          email_html: 0,
          slack_message: null,
          slack_blocks: null,
          slack_mode: null,
          webhook_method: null,
          webhook_headers: null,
          webhook_body: null,
          created_by: 'system',
          created_at: now,
          updated_at: now
        },
        {
          id: 'template_slack_success',
          name: 'Slack: Build Success',
          description: 'Default template for successful build notifications via Slack with Block Kit formatting',
          type: 'slack',
          is_built_in: 1,
          email_subject: null,
          email_body: null,
          email_html: 0,
          slack_message: ':white_check_mark: *$ProjectName* - Build #$BuildNumber Success\\n*Time:* $TimestampHuman\\n*Exit Code:* $ExitCode',
          slack_blocks: JSON.stringify([
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: 'Build #$BuildNumber Succeeded',
                emoji: true
              }
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: '*Project:*\\n$ProjectName' },
                { type: 'mrkdwn', text: '*Status:*\\n$Status' },
                { type: 'mrkdwn', text: '*Exit Code:*\\n$ExitCode' },
                { type: 'mrkdwn', text: '*Time:*\\n$TimestampHuman' }
              ]
            },
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: 'Job ID: `$JobId`' }
              ]
            }
          ]),
          slack_mode: 'blocks',
          webhook_method: null,
          webhook_headers: null,
          webhook_body: null,
          created_by: 'system',
          created_at: now,
          updated_at: now
        },
        {
          id: 'template_slack_failure',
          name: 'Slack: Build Failure',
          description: 'Default template for failed build notifications via Slack with Block Kit formatting',
          type: 'slack',
          is_built_in: 1,
          email_subject: null,
          email_body: null,
          email_html: 0,
          slack_message: ':x: *$ProjectName* - Build #$BuildNumber Failed\\n*Failed Node:* $FailedNodeLabel\\n*Time:* $TimestampHuman\\n*Exit Code:* $ExitCode',
          slack_blocks: JSON.stringify([
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: 'Build #$BuildNumber Failed',
                emoji: true
              }
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: '*Project:*\\n$ProjectName' },
                { type: 'mrkdwn', text: '*Status:*\\n$Status' },
                { type: 'mrkdwn', text: '*Exit Code:*\\n$ExitCode' },
                { type: 'mrkdwn', text: '*Time:*\\n$TimestampHuman' }
              ]
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Failed Node:* $FailedNodeLabel'
              }
            },
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: 'Job ID: `$JobId`' }
              ]
            }
          ]),
          slack_mode: 'blocks',
          webhook_method: null,
          webhook_headers: null,
          webhook_body: null,
          created_by: 'system',
          created_at: now,
          updated_at: now
        },
        {
          id: 'template_webhook_generic',
          name: 'Webhook: Generic',
          description: 'Generic webhook template with all context variables',
          type: 'webhook',
          is_built_in: 1,
          email_subject: null,
          email_body: null,
          email_html: 0,
          slack_message: null,
          slack_blocks: null,
          slack_mode: null,
          webhook_method: 'POST',
          webhook_headers: '{"Content-Type": "application/json"}',
          webhook_body: '{\\n  "event": "build_complete",\\n  "project": "$ProjectName",\\n  "projectId": "$ProjectId",\\n  "buildNumber": "$BuildNumber",\\n  "jobId": "$JobId",\\n  "status": "$Status",\\n  "exitCode": $ExitCode,\\n  "failedNode": "$FailedNodeLabel",\\n  "timestamp": "$Timestamp",\\n  "timestampHuman": "$TimestampHuman"\\n}',
          created_by: 'system',
          created_at: now,
          updated_at: now
        }
      ]

      // Insert templates only if they don't already exist
      for (const template of builtInTemplates) {
        const [rows] = await this.mysql.query('SELECT id FROM notification_templates WHERE id = ?', [template.id])
        if (rows.length === 0) {
          await this.mysql.query(`
            INSERT INTO notification_templates (
              id, name, description, type, is_built_in, email_subject, email_body, email_html,
              slack_message, slack_blocks, slack_mode, webhook_method, webhook_headers, webhook_body,
              created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            template.id, template.name, template.description, template.type, template.is_built_in,
            template.email_subject, template.email_body, template.email_html, template.slack_message,
            template.slack_blocks, template.slack_mode,
            template.webhook_method, template.webhook_headers, template.webhook_body,
            template.created_by, template.created_at, template.updated_at
          ])
        }
      }

      logger.info('Built-in notification templates ensured for MySQL')
    } catch (error) {
      logger.error('Error inserting built-in templates for MySQL:', error)
    }
  }

  async runMySQLMigrations() {
    // Migration
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

// Export function to get raw database connection (SQLite, Postgres, or MySQL)
export async function getRawDB() {
  if (!dbManager) {
    dbManager = new DatabaseManager()
    await dbManager.initialize()
  }
  return {
    db: dbManager.sqlite || dbManager.postgres || dbManager.mysql,
    type: dbManager.type
  }
}

// Export schema tables for direct access
// These are initialized when getDB() is first called
const schema = createSchema(process.env.DATABASE_TYPE || 'sqlite')
export const { users, refreshTokens, items, envVariables, credentialVault, passwordVault, systemSettings, agents, builds, cronJobs, auditLogs, projectTemplates, projectSnapshots, systemUpdates, groups, userGroupMemberships, metrics } = schema