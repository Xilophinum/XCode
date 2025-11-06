/**
 * Unified Database Schema
 * Supports SQLite, PostgreSQL, and other database types
 *
 * Usage:
 * import { createSchema } from './schema.js'
 * const schema = createSchema('sqlite')  // or 'postgres', 'mysql', etc.
 */

import { pgTable, varchar as pgVarchar, text as pgText, integer as pgInteger, primaryKey as pgPrimaryKey, index as pgIndex } from 'drizzle-orm/pg-core'
import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core'
import { mysqlTable, varchar as mysqlVarchar, text as mysqlText, int as mysqlInt, primaryKey as mysqlPrimaryKey, index as mysqlIndex, boolean as mysqlBoolean } from 'drizzle-orm/mysql-core'

export function createSchema(dbType = 'sqlite') {
  if (dbType === 'postgres' || dbType === 'postgresql') {
    // ========================================================================
    // POSTGRESQL SCHEMA
    // ========================================================================
    return {
      users: pgTable('users', {
        id: pgVarchar('id', { length: 255 }).primaryKey(),
        name: pgVarchar('name', { length: 255 }).notNull(),
        email: pgVarchar('email', { length: 255 }).notNull().unique(),
        passwordHash: pgVarchar('password_hash', { length: 255 }),
        role: pgVarchar('role', { length: 50 }),
        userType: pgVarchar('user_type', { length: 50 }).notNull().default('local'),
        externalId: pgVarchar('external_id', { length: 255 }),
        lastLogin: pgText('last_login'),
        isActive: pgVarchar('is_active', { length: 10 }).notNull().default('true'),
        createdAt: pgText('created_at').notNull(),
        updatedAt: pgText('updated_at').notNull(),
      }),

      items: pgTable('items', {
        id: pgVarchar('id', { length: 255 }).primaryKey(),
        name: pgVarchar('name', { length: 255 }).notNull(),
        description: pgText('description'),
        type: pgVarchar('type', { length: 50 }).notNull(),
        path: pgText('path').notNull(),
        userId: pgVarchar('user_id', { length: 255 }).notNull(),
        diagramData: pgText('diagram_data'),
        status: pgVarchar('status', { length: 50 }).notNull().default('active'),
        accessPolicy: pgVarchar('access_policy', { length: 50 }).default('public'),
        allowedGroups: pgText('allowed_groups'),
        maxBuildsToKeep: pgInteger('max_builds_to_keep').default(50),
        maxLogDays: pgInteger('max_log_days').default(30),
        createdAt: pgText('created_at').notNull(),
        updatedAt: pgText('updated_at').notNull(),
      }),

      envVariables: pgTable('env_variables', {
        id: pgVarchar('id', { length: 255 }).primaryKey(),
        key: pgVarchar('key', { length: 255 }).notNull().unique(),
        value: pgText('value').notNull(),
        description: pgText('description'),
        isSecret: pgVarchar('is_secret', { length: 10 }).notNull().default('false'),
        createdAt: pgText('created_at').notNull(),
        updatedAt: pgText('updated_at').notNull(),
      }),

      credentialVault: pgTable('credential_vault', {
        id: pgVarchar('id', { length: 255 }).primaryKey(),
        name: pgVarchar('name', { length: 255 }).notNull(),
        type: pgVarchar('type', { length: 50 }).notNull(),
        description: pgText('description'),
        username: pgVarchar('username', { length: 255 }),
        password: pgText('password'),
        token: pgText('token'),
        privateKey: pgText('private_key'),
        certificate: pgText('certificate'),
        fileData: pgText('file_data'),
        fileName: pgVarchar('file_name', { length: 255 }),
        fileMimeType: pgVarchar('file_mime_type', { length: 100 }),
        url: pgVarchar('url', { length: 500 }),
        environment: pgVarchar('environment', { length: 50 }),
        tags: pgText('tags'),
        customFields: pgText('custom_fields'),
        expiresAt: pgText('expires_at'),
        lastUsed: pgText('last_used'),
        isActive: pgVarchar('is_active', { length: 10 }).notNull().default('true'),
        createdAt: pgText('created_at').notNull(),
        updatedAt: pgText('updated_at').notNull(),
      }),

      passwordVault: pgTable('password_vault', {
        id: pgVarchar('id', { length: 255 }).primaryKey(),
        name: pgVarchar('name', { length: 255 }).notNull(),
        username: pgVarchar('username', { length: 255 }),
        password: pgText('password').notNull(),
        url: pgVarchar('url', { length: 500 }),
        description: pgText('description'),
        createdAt: pgText('created_at').notNull(),
        updatedAt: pgText('updated_at').notNull(),
      }),

      systemSettings: pgTable('system_settings', {
        id: pgVarchar('id', { length: 255 }).primaryKey(),
        category: pgVarchar('category', { length: 100 }).notNull(),
        key: pgVarchar('key', { length: 255 }).notNull().unique(),
        value: pgText('value'),
        defaultValue: pgText('default_value'),
        type: pgVarchar('type', { length: 50 }).notNull(),
        options: pgText('options'),
        label: pgVarchar('label', { length: 255 }).notNull(),
        description: pgText('description'),
        required: pgVarchar('required', { length: 10 }).notNull().default('false'),
        readonly: pgVarchar('readonly', { length: 10 }).notNull().default('false'),
        createdAt: pgText('created_at').notNull(),
        updatedAt: pgText('updated_at').notNull(),
      }),

      agents: pgTable('agents', {
        id: pgVarchar('id', { length: 255 }).primaryKey(),
        name: pgVarchar('name', { length: 255 }).notNull(),
        description: pgText('description'),
        token: pgVarchar('token', { length: 255 }).notNull().unique(),
        maxConcurrentJobs: pgInteger('max_concurrent_jobs').notNull().default(1),
        isLocal: pgVarchar('is_local', { length: 10 }).notNull().default('false'),
        hostname: pgVarchar('hostname', { length: 255 }),
        platform: pgVarchar('platform', { length: 50 }),
        architecture: pgVarchar('architecture', { length: 50 }),
        capabilities: pgText('capabilities'),
        systemInfo: pgText('system_info'),
        status: pgVarchar('status', { length: 50 }).notNull().default('offline'),
        currentJobs: pgInteger('current_jobs').notNull().default(0),
        lastHeartbeat: pgText('last_heartbeat'),
        ipAddress: pgVarchar('ip_address', { length: 45 }),
        firstConnectedAt: pgText('first_connected_at'),
        totalBuilds: pgInteger('total_builds').notNull().default(0),
        tags: pgText('tags'),
        notes: pgText('notes'),
        agentVersion: pgVarchar('agent_version', { length: 50 }),
        serverVersionCompatible: pgVarchar('server_version_compatible', { length: 50 }),
        updateAvailable: pgVarchar('update_available', { length: 10 }).default('false'),
        lastVersionCheck: pgText('last_version_check'),
        autoUpdate: pgVarchar('auto_update', { length: 10 }).default('false'),
        createdAt: pgText('created_at').notNull(),
        updatedAt: pgText('updated_at').notNull(),
      }),

      builds: pgTable('builds', {
        projectId: pgVarchar('project_id', { length: 255 }).notNull(),
        projectName: pgVarchar('project_name', { length: 255 }).notNull(),
        buildNumber: pgInteger('build_number').notNull(),
        agentId: pgVarchar('agent_id', { length: 255 }),
        agentName: pgVarchar('agent_name', { length: 255 }),
        trigger: pgVarchar('trigger', { length: 50 }).notNull(),
        status: pgVarchar('status', { length: 50 }).notNull(),
        message: pgText('message'),
        startedAt: pgText('started_at').notNull(),
        finishedAt: pgText('finished_at'),
        duration: pgInteger('duration'),
        currentCommandIndex: pgInteger('current_command_index'),
        executionCommands: pgText('execution_commands'),
        currentNodeId: pgVarchar('current_node_id', { length: 255 }),
        currentNodeLabel: pgVarchar('current_node_label', { length: 255 }),
        nodes: pgText('nodes'),
        edges: pgText('edges'),
        nodeCount: pgInteger('node_count'),
        nodesExecuted: pgInteger('nodes_executed'),
        exitCode: pgInteger('exit_code'),
        error: pgText('error'),
        finalOutput: pgText('final_output'),
        canRetryOnReconnect: pgVarchar('can_retry_on_reconnect', { length: 10 }).default('false'),
        parallelBranchesResult: pgText('parallel_branches_result'),
        parallelMatrixResult: pgText('parallel_matrix_result'),
        gitBranch: pgVarchar('git_branch', { length: 255 }),
        gitCommit: pgVarchar('git_commit', { length: 255 }),
        metadata: pgText('metadata'),
        outputLog: pgText('output_log'),
        nodeExecutionStates: pgText('node_execution_states'),
        lastSequence: pgInteger('last_sequence').default(0),
        createdAt: pgText('created_at').notNull(),
        updatedAt: pgText('updated_at').notNull(),
      }, (table) => {
        return {
          pk: pgPrimaryKey({ columns: [table.projectId, table.buildNumber] }),
          statusIdx: pgIndex('idx_builds_status').on(table.status),
          startedAtIdx: pgIndex('idx_builds_started_at').on(table.startedAt),
        }
      }),

      cronJobs: pgTable('cron_jobs', {
        id: pgVarchar('id', { length: 255 }).primaryKey(),
        projectId: pgVarchar('project_id', { length: 255 }).notNull(),
        cronNodeId: pgVarchar('cron_node_id', { length: 255 }).notNull(),
        cronNodeLabel: pgVarchar('cron_node_label', { length: 255 }).notNull(),
        cronExpression: pgVarchar('cron_expression', { length: 100 }).notNull(),
        enabled: pgVarchar('enabled', { length: 10 }).notNull().default('true'),
        nodes: pgText('nodes').notNull(),
        edges: pgText('edges').notNull(),
        lastRun: pgText('last_run'),
        createdAt: pgText('created_at').notNull(),
        updatedAt: pgText('updated_at').notNull(),
      }),

      auditLogs: pgTable('audit_logs', {
        id: pgVarchar('id', { length: 255 }).primaryKey(),
        entityType: pgVarchar('entity_type', { length: 50 }).notNull(),
        entityId: pgVarchar('entity_id', { length: 255 }).notNull(),
        entityName: pgVarchar('entity_name', { length: 255 }).notNull(),
        action: pgVarchar('action', { length: 50 }).notNull(),
        userId: pgVarchar('user_id', { length: 255 }).notNull(),
        userName: pgVarchar('user_name', { length: 255 }).notNull(),
        changesSummary: pgText('changes_summary'),
        previousData: pgText('previous_data'),
        newData: pgText('new_data'),
        ipAddress: pgVarchar('ip_address', { length: 45 }),
        userAgent: pgText('user_agent'),
        createdAt: pgText('created_at').notNull(),
      }),

      projectTemplates: pgTable('project_templates', {
        id: pgVarchar('id', { length: 255 }).primaryKey(),
        name: pgVarchar('name', { length: 255 }).notNull(),
        description: pgText('description'),
        diagramData: pgText('diagram_data').notNull(),
        userId: pgVarchar('user_id', { length: 255 }).notNull(),
        createdAt: pgText('created_at').notNull(),
        updatedAt: pgText('updated_at').notNull(),
      }),

      projectSnapshots: pgTable('project_snapshots', {
        id: pgVarchar('id', { length: 255 }).primaryKey(),
        projectId: pgVarchar('project_id', { length: 255 }).notNull(),
        projectName: pgVarchar('project_name', { length: 255 }).notNull(),
        version: pgInteger('version').notNull(),
        diagramData: pgText('diagram_data').notNull(),
        description: pgText('description'),
        status: pgVarchar('status', { length: 50 }).notNull(),
        maxBuildsToKeep: pgInteger('max_builds_to_keep'),
        maxLogDays: pgInteger('max_log_days'),
        createdBy: pgVarchar('created_by', { length: 255 }).notNull(),
        createdByName: pgVarchar('created_by_name', { length: 255 }).notNull(),
        snapshotType: pgVarchar('snapshot_type', { length: 50 }).notNull(),
        createdAt: pgText('created_at').notNull(),
      }),

      systemUpdates: pgTable('system_updates', {
        id: pgVarchar('id', { length: 255 }).primaryKey(),
        currentVersion: pgVarchar('current_version', { length: 50 }).notNull(),
        targetVersion: pgVarchar('target_version', { length: 50 }).notNull(),
        status: pgVarchar('status', { length: 50 }).notNull(),
        downloadProgress: pgInteger('download_progress').default(0),
        downloadUrl: pgText('download_url'),
        releaseNotes: pgText('release_notes'),
        errorMessage: pgText('error_message'),
        startedBy: pgVarchar('started_by', { length: 255 }),
        startedByName: pgVarchar('started_by_name', { length: 255 }),
        waitForJobs: pgVarchar('wait_for_jobs', { length: 10 }).default('false'),
        startedAt: pgText('started_at').notNull(),
        completedAt: pgText('completed_at'),
        createdAt: pgText('created_at').notNull(),
        updatedAt: pgText('updated_at').notNull(),
      }),

      groups: pgTable('groups', {
        id: pgVarchar('id', { length: 255 }).primaryKey(),
        name: pgVarchar('name', { length: 255 }).notNull().unique(),
        description: pgText('description'),
        ldapMappings: pgText('ldap_mappings'), // JSON array of LDAP group CNs/DNs
        createdAt: pgText('created_at').notNull(),
        updatedAt: pgText('updated_at').notNull(),
      }),

      userGroupMemberships: pgTable('user_group_memberships', {
        userId: pgVarchar('user_id', { length: 255 }).notNull(),
        groupId: pgVarchar('group_id', { length: 255 }).notNull(),
        createdAt: pgText('created_at').notNull(),
      }, (table) => {
        return {
          pk: pgPrimaryKey({ columns: [table.userId, table.groupId] })
        }
      }),

      metrics: pgTable('metrics', {
        id: pgVarchar('id', { length: 255 }).primaryKey(),
        timestamp: pgText('timestamp').notNull(), // Rounded to minute
        entityType: pgVarchar('entity_type', { length: 50 }).notNull(), // 'agent', 'server', 'api', 'builds'
        entityId: pgVarchar('entity_id', { length: 255 }), // Agent ID, or null for global
        metrics: pgText('metrics').notNull(), // JSON blob with ALL metrics
        createdAt: pgText('created_at').notNull(),
      }, (table) => {
        return {
          timestampIdx: pgIndex('idx_metrics_timestamp').on(table.timestamp),
          entityTypeIdx: pgIndex('idx_metrics_entity_type').on(table.entityType),
          entityIdx: pgIndex('idx_metrics_entity').on(table.entityType, table.entityId),
          timestampEntityIdx: pgIndex('idx_metrics_timestamp_entity').on(table.timestamp, table.entityType, table.entityId),
        }
      })
    }
  }

  if (dbType === 'mysql') {
    // ========================================================================
    // MYSQL SCHEMA
    // ========================================================================
    return {
      users: mysqlTable('users', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        name: mysqlVarchar('name', { length: 255 }).notNull(),
        email: mysqlVarchar('email', { length: 255 }).notNull().unique(),
        passwordHash: mysqlVarchar('password_hash', { length: 255 }),
        role: mysqlVarchar('role', { length: 50 }),
        userType: mysqlVarchar('user_type', { length: 50 }).notNull().default('local'),
        externalId: mysqlVarchar('external_id', { length: 255 }),
        lastLogin: mysqlText('last_login'),
        isActive: mysqlVarchar('is_active', { length: 10 }).notNull().default('true'),
        createdAt: mysqlText('created_at').notNull(),
        updatedAt: mysqlText('updated_at').notNull(),
      }),

      items: mysqlTable('items', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        name: mysqlVarchar('name', { length: 255 }).notNull(),
        description: mysqlText('description'),
        type: mysqlVarchar('type', { length: 50 }).notNull(),
        path: mysqlText('path').notNull(),
        userId: mysqlVarchar('user_id', { length: 255 }).notNull(),
        diagramData: mysqlText('diagram_data'),
        status: mysqlVarchar('status', { length: 50 }).notNull().default('active'),
        accessPolicy: mysqlVarchar('access_policy', { length: 50 }).default('public'),
        allowedGroups: mysqlText('allowed_groups'),
        maxBuildsToKeep: mysqlInt('max_builds_to_keep').default(50),
        maxLogDays: mysqlInt('max_log_days').default(30),
        createdAt: mysqlText('created_at').notNull(),
        updatedAt: mysqlText('updated_at').notNull(),
      }),

      envVariables: mysqlTable('env_variables', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        key: mysqlVarchar('key', { length: 255 }).notNull().unique(),
        value: mysqlText('value').notNull(),
        description: mysqlText('description'),
        isSecret: mysqlVarchar('is_secret', { length: 10 }).notNull().default('false'),
        createdAt: mysqlText('created_at').notNull(),
        updatedAt: mysqlText('updated_at').notNull(),
      }),

      credentialVault: mysqlTable('credential_vault', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        name: mysqlVarchar('name', { length: 255 }).notNull(),
        type: mysqlVarchar('type', { length: 50 }).notNull(),
        description: mysqlText('description'),
        username: mysqlVarchar('username', { length: 255 }),
        password: mysqlText('password'),
        token: mysqlText('token'),
        privateKey: mysqlText('private_key'),
        certificate: mysqlText('certificate'),
        fileData: mysqlText('file_data'),
        fileName: mysqlVarchar('file_name', { length: 255 }),
        fileMimeType: mysqlVarchar('file_mime_type', { length: 100 }),
        url: mysqlVarchar('url', { length: 500 }),
        environment: mysqlVarchar('environment', { length: 50 }),
        tags: mysqlText('tags'),
        customFields: mysqlText('custom_fields'),
        expiresAt: mysqlText('expires_at'),
        lastUsed: mysqlText('last_used'),
        isActive: mysqlVarchar('is_active', { length: 10 }).notNull().default('true'),
        createdAt: mysqlText('created_at').notNull(),
        updatedAt: mysqlText('updated_at').notNull(),
      }),

      passwordVault: mysqlTable('password_vault', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        name: mysqlVarchar('name', { length: 255 }).notNull(),
        username: mysqlVarchar('username', { length: 255 }),
        password: mysqlText('password').notNull(),
        url: mysqlVarchar('url', { length: 500 }),
        description: mysqlText('description'),
        createdAt: mysqlText('created_at').notNull(),
        updatedAt: mysqlText('updated_at').notNull(),
      }),

      systemSettings: mysqlTable('system_settings', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        category: mysqlVarchar('category', { length: 100 }).notNull(),
        key: mysqlVarchar('key', { length: 255 }).notNull().unique(),
        value: mysqlText('value'),
        defaultValue: mysqlText('default_value'),
        type: mysqlVarchar('type', { length: 50 }).notNull(),
        options: mysqlText('options'),
        label: mysqlVarchar('label', { length: 255 }).notNull(),
        description: mysqlText('description'),
        required: mysqlVarchar('required', { length: 10 }).notNull().default('false'),
        readonly: mysqlVarchar('readonly', { length: 10 }).notNull().default('false'),
        createdAt: mysqlText('created_at').notNull(),
        updatedAt: mysqlText('updated_at').notNull(),
      }),

      agents: mysqlTable('agents', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        name: mysqlVarchar('name', { length: 255 }).notNull(),
        description: mysqlText('description'),
        token: mysqlVarchar('token', { length: 255 }).notNull().unique(),
        maxConcurrentJobs: mysqlInt('max_concurrent_jobs').notNull().default(1),
        isLocal: mysqlVarchar('is_local', { length: 10 }).notNull().default('false'),
        hostname: mysqlVarchar('hostname', { length: 255 }),
        platform: mysqlVarchar('platform', { length: 50 }),
        architecture: mysqlVarchar('architecture', { length: 50 }),
        capabilities: mysqlText('capabilities'),
        systemInfo: mysqlText('system_info'),
        status: mysqlVarchar('status', { length: 50 }).notNull().default('offline'),
        currentJobs: mysqlInt('current_jobs').notNull().default(0),
        lastHeartbeat: mysqlText('last_heartbeat'),
        ipAddress: mysqlVarchar('ip_address', { length: 45 }),
        firstConnectedAt: mysqlText('first_connected_at'),
        totalBuilds: mysqlInt('total_builds').notNull().default(0),
        tags: mysqlText('tags'),
        notes: mysqlText('notes'),
        agentVersion: mysqlVarchar('agent_version', { length: 50 }),
        serverVersionCompatible: mysqlVarchar('server_version_compatible', { length: 50 }),
        updateAvailable: mysqlVarchar('update_available', { length: 10 }).default('false'),
        lastVersionCheck: mysqlText('last_version_check'),
        autoUpdate: mysqlVarchar('auto_update', { length: 10 }).default('false'),
        createdAt: mysqlText('created_at').notNull(),
        updatedAt: mysqlText('updated_at').notNull(),
      }),

      builds: mysqlTable('builds', {
        projectId: mysqlVarchar('project_id', { length: 255 }).notNull(),
        projectName: mysqlVarchar('project_name', { length: 255 }).notNull(),
        buildNumber: mysqlInt('build_number').notNull(),
        agentId: mysqlVarchar('agent_id', { length: 255 }),
        agentName: mysqlVarchar('agent_name', { length: 255 }),
        trigger: mysqlVarchar('trigger', { length: 50 }).notNull(),
        status: mysqlVarchar('status', { length: 50 }).notNull(),
        message: mysqlText('message'),
        startedAt: mysqlText('started_at').notNull(),
        finishedAt: mysqlText('finished_at'),
        duration: mysqlInt('duration'),
        currentCommandIndex: mysqlInt('current_command_index'),
        executionCommands: mysqlText('execution_commands'),
        currentNodeId: mysqlVarchar('current_node_id', { length: 255 }),
        currentNodeLabel: mysqlVarchar('current_node_label', { length: 255 }),
        nodes: mysqlText('nodes'),
        edges: mysqlText('edges'),
        nodeCount: mysqlInt('node_count'),
        nodesExecuted: mysqlInt('nodes_executed'),
        exitCode: mysqlInt('exit_code'),
        error: mysqlText('error'),
        finalOutput: mysqlText('final_output'),
        canRetryOnReconnect: mysqlVarchar('can_retry_on_reconnect', { length: 10 }).default('false'),
        parallelBranchesResult: mysqlText('parallel_branches_result'),
        parallelMatrixResult: mysqlText('parallel_matrix_result'),
        gitBranch: mysqlVarchar('git_branch', { length: 255 }),
        gitCommit: mysqlVarchar('git_commit', { length: 255 }),
        metadata: mysqlText('metadata'),
        outputLog: mysqlText('output_log'),
        nodeExecutionStates: mysqlText('node_execution_states'),
        lastSequence: mysqlInt('last_sequence').default(0),
        createdAt: mysqlText('created_at').notNull(),
        updatedAt: mysqlText('updated_at').notNull(),
      }, (table) => {
        return {
          pk: mysqlPrimaryKey({ columns: [table.projectId, table.buildNumber] }),
          statusIdx: mysqlIndex('idx_builds_status').on(table.status),
          startedAtIdx: mysqlIndex('idx_builds_started_at').on(table.startedAt),
        }
      }),

      cronJobs: mysqlTable('cron_jobs', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        projectId: mysqlVarchar('project_id', { length: 255 }).notNull(),
        cronNodeId: mysqlVarchar('cron_node_id', { length: 255 }).notNull(),
        cronNodeLabel: mysqlVarchar('cron_node_label', { length: 255 }).notNull(),
        cronExpression: mysqlVarchar('cron_expression', { length: 100 }).notNull(),
        enabled: mysqlVarchar('enabled', { length: 10 }).notNull().default('true'),
        nodes: mysqlText('nodes').notNull(),
        edges: mysqlText('edges').notNull(),
        lastRun: mysqlText('last_run'),
        createdAt: mysqlText('created_at').notNull(),
        updatedAt: mysqlText('updated_at').notNull(),
      }),

      auditLogs: mysqlTable('audit_logs', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        entityType: mysqlVarchar('entity_type', { length: 50 }).notNull(),
        entityId: mysqlVarchar('entity_id', { length: 255 }).notNull(),
        entityName: mysqlVarchar('entity_name', { length: 255 }).notNull(),
        action: mysqlVarchar('action', { length: 50 }).notNull(),
        userId: mysqlVarchar('user_id', { length: 255 }).notNull(),
        userName: mysqlVarchar('user_name', { length: 255 }).notNull(),
        changesSummary: mysqlText('changes_summary'),
        previousData: mysqlText('previous_data'),
        newData: mysqlText('new_data'),
        ipAddress: mysqlVarchar('ip_address', { length: 45 }),
        userAgent: mysqlText('user_agent'),
        createdAt: mysqlText('created_at').notNull(),
      }),

      projectTemplates: mysqlTable('project_templates', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        name: mysqlVarchar('name', { length: 255 }).notNull(),
        description: mysqlText('description'),
        diagramData: mysqlText('diagram_data').notNull(),
        userId: mysqlVarchar('user_id', { length: 255 }).notNull(),
        createdAt: mysqlText('created_at').notNull(),
        updatedAt: mysqlText('updated_at').notNull(),
      }),

      projectSnapshots: mysqlTable('project_snapshots', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        projectId: mysqlVarchar('project_id', { length: 255 }).notNull(),
        projectName: mysqlVarchar('project_name', { length: 255 }).notNull(),
        version: mysqlInt('version').notNull(),
        diagramData: mysqlText('diagram_data').notNull(),
        description: mysqlText('description'),
        status: mysqlVarchar('status', { length: 50 }).notNull(),
        maxBuildsToKeep: mysqlInt('max_builds_to_keep'),
        maxLogDays: mysqlInt('max_log_days'),
        createdBy: mysqlVarchar('created_by', { length: 255 }).notNull(),
        createdByName: mysqlVarchar('created_by_name', { length: 255 }).notNull(),
        snapshotType: mysqlVarchar('snapshot_type', { length: 50 }).notNull(),
        createdAt: mysqlText('created_at').notNull(),
      }),

      notificationTemplates: mysqlTable('notification_templates', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        name: mysqlVarchar('name', { length: 255 }).notNull(),
        description: mysqlText('description'),
        type: mysqlVarchar('type', { length: 50 }).notNull(),
        isBuiltIn: mysqlBoolean('is_built_in').default(false),
        emailSubject: mysqlText('email_subject'),
        emailBody: mysqlText('email_body'),
        emailHtml: mysqlBoolean('email_html').default(false),
        slackMessage: mysqlText('slack_message'),
        slackBlocks: mysqlText('slack_blocks'),
        slackMode: mysqlVarchar('slack_mode', { length: 20 }).default('simple'),
        webhookMethod: mysqlVarchar('webhook_method', { length: 10 }),
        webhookHeaders: mysqlText('webhook_headers'),
        webhookBody: mysqlText('webhook_body'),
        createdBy: mysqlVarchar('created_by', { length: 255 }),
        createdAt: mysqlText('created_at').notNull(),
        updatedAt: mysqlText('updated_at').notNull(),
      }),

      systemUpdates: mysqlTable('system_updates', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        currentVersion: mysqlVarchar('current_version', { length: 50 }).notNull(),
        targetVersion: mysqlVarchar('target_version', { length: 50 }).notNull(),
        status: mysqlVarchar('status', { length: 50 }).notNull(),
        downloadProgress: mysqlInt('download_progress').default(0),
        downloadUrl: mysqlText('download_url'),
        releaseNotes: mysqlText('release_notes'),
        errorMessage: mysqlText('error_message'),
        startedBy: mysqlVarchar('started_by', { length: 255 }),
        startedByName: mysqlVarchar('started_by_name', { length: 255 }),
        waitForJobs: mysqlVarchar('wait_for_jobs', { length: 10 }).default('false'),
        startedAt: mysqlText('started_at').notNull(),
        completedAt: mysqlText('completed_at'),
        createdAt: mysqlText('created_at').notNull(),
        updatedAt: mysqlText('updated_at').notNull(),
      }),

      groups: mysqlTable('groups', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        name: mysqlVarchar('name', { length: 255 }).notNull().unique(),
        description: mysqlText('description'),
        ldapMappings: mysqlText('ldap_mappings'),
        createdAt: mysqlText('created_at').notNull(),
        updatedAt: mysqlText('updated_at').notNull(),
      }),

      userGroupMemberships: mysqlTable('user_group_memberships', {
        userId: mysqlVarchar('user_id', { length: 255 }).notNull(),
        groupId: mysqlVarchar('group_id', { length: 255 }).notNull(),
        createdAt: mysqlText('created_at').notNull(),
      }, (table) => {
        return {
          pk: mysqlPrimaryKey({ columns: [table.userId, table.groupId] })
        }
      }),

      metrics: mysqlTable('metrics', {
        id: mysqlVarchar('id', { length: 255 }).primaryKey(),
        timestamp: mysqlText('timestamp').notNull(),
        entityType: mysqlVarchar('entity_type', { length: 50 }).notNull(),
        entityId: mysqlVarchar('entity_id', { length: 255 }),
        metrics: mysqlText('metrics').notNull(),
        createdAt: mysqlText('created_at').notNull(),
      }, (table) => {
        return {
          timestampIdx: mysqlIndex('idx_metrics_timestamp').on(table.timestamp),
          entityTypeIdx: mysqlIndex('idx_metrics_entity_type').on(table.entityType),
          entityIdx: mysqlIndex('idx_metrics_entity').on(table.entityType, table.entityId),
          timestampEntityIdx: mysqlIndex('idx_metrics_timestamp_entity').on(table.timestamp, table.entityType, table.entityId),
        }
      })
    }
  }

  // ========================================================================
  // SQLITE SCHEMA (Default)
  // ========================================================================
  return {
    users: sqliteTable('users', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      email: text('email').notNull().unique(),
      passwordHash: text('password_hash'),
      role: text('role'),
      userType: text('user_type').notNull().default('local'),
      externalId: text('external_id'),
      lastLogin: text('last_login'),
      isActive: text('is_active').notNull().default('true'),
      createdAt: text('created_at').notNull(),
      updatedAt: text('updated_at').notNull(),
    }),

    items: sqliteTable('items', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      description: text('description'),
      type: text('type').notNull(),
      path: text('path').notNull(),
      userId: text('user_id').notNull(),
      diagramData: text('diagram_data'),
      status: text('status').notNull().default('active'),
      accessPolicy: text('access_policy').default('public'),
      allowedGroups: text('allowed_groups'),
      maxBuildsToKeep: integer('max_builds_to_keep').default(50),
      maxLogDays: integer('max_log_days').default(30),
      createdAt: text('created_at').notNull(),
      updatedAt: text('updated_at').notNull(),
    }),

    envVariables: sqliteTable('env_variables', {
      id: text('id').primaryKey(),
      key: text('key').notNull().unique(),
      value: text('value').notNull(),
      description: text('description'),
      isSecret: text('is_secret').notNull().default('false'),
      createdAt: text('created_at').notNull(),
      updatedAt: text('updated_at').notNull(),
    }),

    credentialVault: sqliteTable('credential_vault', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      type: text('type').notNull(),
      description: text('description'),
      username: text('username'),
      password: text('password'),
      token: text('token'),
      privateKey: text('private_key'),
      certificate: text('certificate'),
      fileData: text('file_data'),
      fileName: text('file_name'),
      fileMimeType: text('file_mime_type'),
      url: text('url'),
      environment: text('environment'),
      tags: text('tags'),
      customFields: text('custom_fields'),
      expiresAt: text('expires_at'),
      lastUsed: text('last_used'),
      isActive: text('is_active').notNull().default('true'),
      createdAt: text('created_at').notNull(),
      updatedAt: text('updated_at').notNull(),
    }),

    passwordVault: sqliteTable('password_vault', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      username: text('username'),
      password: text('password').notNull(),
      url: text('url'),
      description: text('description'),
      createdAt: text('created_at').notNull(),
      updatedAt: text('updated_at').notNull(),
    }),

    systemSettings: sqliteTable('system_settings', {
      id: text('id').primaryKey(),
      category: text('category').notNull(),
      key: text('key').notNull().unique(),
      value: text('value'),
      defaultValue: text('default_value'),
      type: text('type').notNull(),
      options: text('options'),
      label: text('label').notNull(),
      description: text('description'),
      required: text('required').notNull().default('false'),
      readonly: text('readonly').notNull().default('false'),
      createdAt: text('created_at').notNull(),
      updatedAt: text('updated_at').notNull(),
    }),

    agents: sqliteTable('agents', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      description: text('description'),
      token: text('token').notNull().unique(),
      maxConcurrentJobs: integer('max_concurrent_jobs').notNull().default(1),
      isLocal: text('is_local').notNull().default('false'),
      hostname: text('hostname'),
      platform: text('platform'),
      architecture: text('architecture'),
      capabilities: text('capabilities'),
      systemInfo: text('system_info'),
      status: text('status').notNull().default('offline'),
      currentJobs: integer('current_jobs').notNull().default(0),
      lastHeartbeat: text('last_heartbeat'),
      ipAddress: text('ip_address'),
      firstConnectedAt: text('first_connected_at'),
      totalBuilds: integer('total_builds').notNull().default(0),
      tags: text('tags'),
      notes: text('notes'),
      agentVersion: text('agent_version'),
      serverVersionCompatible: text('server_version_compatible'),
      updateAvailable: text('update_available').default('false'),
      lastVersionCheck: text('last_version_check'),
      autoUpdate: text('auto_update').default('false'),
      createdAt: text('created_at').notNull(),
      updatedAt: text('updated_at').notNull(),
    }),

    builds: sqliteTable('builds', {
      projectId: text('project_id').notNull(),
      projectName: text('project_name').notNull(),
      buildNumber: integer('build_number').notNull(),
      agentId: text('agent_id'),
      agentName: text('agent_name'),
      trigger: text('trigger').notNull(),
      status: text('status').notNull(),
      message: text('message'),
      startedAt: text('started_at').notNull(),
      finishedAt: text('finished_at'),
      duration: integer('duration'),
      currentCommandIndex: integer('current_command_index'),
      executionCommands: text('execution_commands'),
      currentNodeId: text('current_node_id'),
      currentNodeLabel: text('current_node_label'),
      nodes: text('nodes'),
      edges: text('edges'),
      nodeCount: integer('node_count'),
      nodesExecuted: integer('nodes_executed'),
      exitCode: integer('exit_code'),
      error: text('error'),
      finalOutput: text('final_output'),
      canRetryOnReconnect: text('can_retry_on_reconnect').default('false'),
      parallelBranchesResult: text('parallel_branches_result'),
      parallelMatrixResult: text('parallel_matrix_result'),
      gitBranch: text('git_branch'),
      gitCommit: text('git_commit'),
      metadata: text('metadata'),
      outputLog: text('output_log'),
      nodeExecutionStates: text('node_execution_states'),
      lastSequence: integer('last_sequence').default(0),
      createdAt: text('created_at').notNull(),
      updatedAt: text('updated_at').notNull(),
    }, (table) => {
      return {
        pk: primaryKey({ columns: [table.projectId, table.buildNumber] }),
        statusIdx: index('idx_builds_status').on(table.status),
        startedAtIdx: index('idx_builds_started_at').on(table.startedAt),
      }
    }),

    cronJobs: sqliteTable('cron_jobs', {
      id: text('id').primaryKey(),
      projectId: text('project_id').notNull(),
      cronNodeId: text('cron_node_id').notNull(),
      cronNodeLabel: text('cron_node_label').notNull(),
      cronExpression: text('cron_expression').notNull(),
      enabled: text('enabled').notNull().default('true'),
      nodes: text('nodes').notNull(),
      edges: text('edges').notNull(),
      lastRun: text('last_run'),
      createdAt: text('created_at').notNull(),
      updatedAt: text('updated_at').notNull(),
    }),

    auditLogs: sqliteTable('audit_logs', {
      id: text('id').primaryKey(),
      entityType: text('entity_type').notNull(),
      entityId: text('entity_id').notNull(),
      entityName: text('entity_name').notNull(),
      action: text('action').notNull(),
      userId: text('user_id').notNull(),
      userName: text('user_name').notNull(),
      changesSummary: text('changes_summary'),
      previousData: text('previous_data'),
      newData: text('new_data'),
      ipAddress: text('ip_address'),
      userAgent: text('user_agent'),
      createdAt: text('created_at').notNull(),
    }),

    projectTemplates: sqliteTable('project_templates', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      description: text('description'),
      diagramData: text('diagram_data').notNull(),
      userId: text('user_id').notNull(),
      createdAt: text('created_at').notNull(),
      updatedAt: text('updated_at').notNull(),
    }),

    projectSnapshots: sqliteTable('project_snapshots', {
      id: text('id').primaryKey(),
      projectId: text('project_id').notNull(),
      projectName: text('project_name').notNull(),
      version: integer('version').notNull(),
      diagramData: text('diagram_data').notNull(),
      description: text('description'),
      status: text('status').notNull(),
      maxBuildsToKeep: integer('max_builds_to_keep'),
      maxLogDays: integer('max_log_days'),
      createdBy: text('created_by').notNull(),
      createdByName: text('created_by_name').notNull(),
      snapshotType: text('snapshot_type').notNull(),
      createdAt: text('created_at').notNull(),
    }),

    systemUpdates: sqliteTable('system_updates', {
      id: text('id').primaryKey(),
      currentVersion: text('current_version').notNull(),
      targetVersion: text('target_version').notNull(),
      status: text('status').notNull(),
      downloadProgress: integer('download_progress').default(0),
      downloadUrl: text('download_url'),
      releaseNotes: text('release_notes'),
      errorMessage: text('error_message'),
      startedBy: text('started_by'),
      startedByName: text('started_by_name'),
      waitForJobs: text('wait_for_jobs').default('false'),
      startedAt: text('started_at').notNull(),
      completedAt: text('completed_at'),
      createdAt: text('created_at').notNull(),
      updatedAt: text('updated_at').notNull(),
    }),

    groups: sqliteTable('groups', {
      id: text('id').primaryKey(),
      name: text('name').notNull().unique(),
      description: text('description'),
      ldapMappings: text('ldap_mappings'), // JSON array of LDAP group CNs/DNs
      createdAt: text('created_at').notNull(),
      updatedAt: text('updated_at').notNull(),
    }),

    userGroupMemberships: sqliteTable('user_group_memberships', {
      userId: text('user_id').notNull(),
      groupId: text('group_id').notNull(),
      createdAt: text('created_at').notNull(),
    }, (table) => {
      return {
        pk: primaryKey({ columns: [table.userId, table.groupId] })
      }
    }),

    metrics: sqliteTable('metrics', {
      id: text('id').primaryKey(),
      timestamp: text('timestamp').notNull(), // Rounded to minute
      entityType: text('entity_type').notNull(), // 'agent', 'server', 'api', 'builds'
      entityId: text('entity_id'), // Agent ID, or null for global
      metrics: text('metrics').notNull(), // JSON blob with ALL metrics
      createdAt: text('created_at').notNull(),
    }, (table) => {
      return {
        timestampIdx: index('idx_metrics_timestamp').on(table.timestamp),
        entityTypeIdx: index('idx_metrics_entity_type').on(table.entityType),
        entityIdx: index('idx_metrics_entity').on(table.entityType, table.entityId),
        timestampEntityIdx: index('idx_metrics_timestamp_entity').on(table.timestamp, table.entityType, table.entityId),
      }
    })
  }
}
