import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role'), // 'admin' or 'user' - nullable for backward compatibility
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'folder' or 'project'
  path: text('path').notNull(), // JSON array as string
  userId: text('user_id').notNull(),
  diagramData: text('diagram_data'), // JSON as string for project data
  status: text('status').notNull().default('active'), // 'active' or 'disabled' for projects
  
  // Build retention settings (for projects only)
  maxBuildsToKeep: integer('max_builds_to_keep').default(50), // How many builds to retain per project
  maxLogDays: integer('max_log_days').default(30), // How many days of logs to keep
  
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const envVariables = sqliteTable('env_variables', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  isSecret: text('is_secret').notNull().default('false'), // 'true' or 'false'
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const credentialVault = sqliteTable('credential_vault', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // User-friendly name for the credential
  type: text('type').notNull(), // 'password', 'user_pass', 'token', 'ssh_key', 'certificate', 'file', 'custom'
  description: text('description'),
  
  // Core credential fields (encrypted)
  username: text('username'), // For user_pass, ssh_key types
  password: text('password'), // For password, user_pass types
  token: text('token'), // For token type
  privateKey: text('private_key'), // For ssh_key type
  certificate: text('certificate'), // For certificate type
  fileData: text('file_data'), // For file type (base64 encoded)
  fileName: text('file_name'), // Original filename for file type
  fileMimeType: text('file_mime_type'), // MIME type for file type
  
  // Additional metadata
  url: text('url'), // Associated URL/service
  environment: text('environment'), // dev, staging, prod, etc.
  tags: text('tags'), // JSON array of tags
  customFields: text('custom_fields'), // JSON object for additional fields
  
  // Security and lifecycle
  expiresAt: text('expires_at'), // Optional expiration date
  lastUsed: text('last_used'), // Track usage
  isActive: text('is_active').notNull().default('true'), // Enable/disable
  
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// Legacy passwordVault table for backward compatibility
export const passwordVault = sqliteTable('password_vault', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  username: text('username'),
  password: text('password').notNull(), // Will be encrypted
  url: text('url'),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const systemSettings = sqliteTable('system_settings', {
  id: text('id').primaryKey(),
  category: text('category').notNull(), // 'general', 'security', 'branding', 'notifications', etc.
  key: text('key').notNull().unique(), // Unique identifier for the setting
  value: text('value'), // Current value (can be null for optional settings)
  defaultValue: text('default_value'), // Default value if not set
  type: text('type').notNull(), // 'text', 'textarea', 'select', 'boolean', 'file', 'number'
  options: text('options'), // JSON array for select types
  label: text('label').notNull(), // Human-readable label
  description: text('description'), // Help text for the setting
  required: text('required').notNull().default('false'), // 'true' or 'false'
  readonly: text('readonly').notNull().default('false'), // 'true' or 'false'
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // Human-readable agent name
  description: text('description'), // Optional description
  token: text('token').notNull().unique(), // Permanent token for agent authentication
  maxConcurrentJobs: integer('max_concurrent_jobs').notNull().default(1),
  
  // System information (populated when agent connects)
  hostname: text('hostname'), // Agent machine hostname (populated by agent)
  platform: text('platform'), // 'windows', 'linux', 'macos' (detected by agent)
  architecture: text('architecture'), // 'x64', 'arm64', etc. (detected by agent)
  capabilities: text('capabilities'), // JSON array of capabilities (detected by agent)
  version: text('version'), // Agent software version (reported by agent)
  systemInfo: text('system_info'), // JSON object with CPU, memory, etc. (reported by agent)
  
  // Runtime information
  status: text('status').notNull().default('offline'), // 'online', 'offline', 'busy', 'disconnected'
  currentJobs: integer('current_jobs').notNull().default(0),
  lastHeartbeat: text('last_heartbeat'), // ISO timestamp of last heartbeat
  ipAddress: text('ip_address'), // Agent IP address (detected on connection)
  firstConnectedAt: text('first_connected_at'), // When agent first connected
  totalBuilds: integer('total_builds').notNull().default(0), // Total builds executed
  
  // Optional metadata
  tags: text('tags'), // JSON array of tags for agent categorization
  notes: text('notes'), // Admin notes about this agent
  
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// Build execution tracking tables
export const builds = sqliteTable('builds', {
  id: text('id').primaryKey(), // Unique build ID
  projectId: text('project_id').notNull(), // Reference to project
  buildNumber: integer('build_number').notNull(), // Sequential build number per project
  agentId: text('agent_id'), // Agent that executed the build (null for local execution)
  agentName: text('agent_name'), // Human-readable agent name
  jobId: text('job_id'), // Job ID from the job manager system
  
  // Build metadata
  trigger: text('trigger').notNull(), // 'manual', 'cron', 'webhook', 'pipeline', etc.
  status: text('status').notNull(), // 'running', 'success', 'failure', 'cancelled', 'timeout'
  message: text('message'), // Build result message
  
  // Timing information
  startedAt: text('started_at').notNull(), // ISO timestamp when build started
  finishedAt: text('finished_at'), // ISO timestamp when build finished (null if still running)
  duration: integer('duration'), // Duration in milliseconds (calculated when finished)
  
  // Build context
  nodeCount: integer('node_count'), // Number of nodes in the workflow
  nodesExecuted: integer('nodes_executed'), // Number of nodes successfully executed
  gitBranch: text('git_branch'), // Git branch if applicable
  gitCommit: text('git_commit'), // Git commit hash if applicable
  
  // Metadata
  metadata: text('metadata'), // JSON object for additional build context
  
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const buildLogs = sqliteTable('build_logs', {
  id: text('id').primaryKey(),
  buildId: text('build_id').notNull(), // Reference to builds.id
  nodeId: text('node_id'), // Specific node that generated this log (null for system logs)

  // Log content
  level: text('level').notNull(), // 'info', 'warn', 'error', 'success', 'debug'
  message: text('message').notNull(), // Log message
  command: text('command'), // Command that was executed (if applicable)
  output: text('output'), // Command output (if applicable)

  // Timing
  timestamp: text('timestamp').notNull(), // ISO timestamp when log was created
  sequence: integer('sequence').notNull(), // Sequential order within the build

  // Context
  source: text('source').notNull().default('system'), // 'system', 'agent', 'node', 'user'
  metadata: text('metadata'), // JSON object for additional context

  createdAt: text('created_at').notNull(),
})

// Cron job scheduling table
export const cronJobs = sqliteTable('cron_jobs', {
  id: text('id').primaryKey(), // Unique cron job ID (jobId)
  projectId: text('project_id').notNull(), // Reference to project
  cronNodeId: text('cron_node_id').notNull(), // Node ID of the cron trigger
  cronNodeLabel: text('cron_node_label').notNull(), // User-friendly label
  cronExpression: text('cron_expression').notNull(), // Cron expression (e.g., "0 * * * *")
  enabled: text('enabled').notNull().default('true'), // 'true' or 'false'

  // Workflow data
  nodes: text('nodes').notNull(), // JSON array of workflow nodes
  edges: text('edges').notNull(), // JSON array of workflow edges

  // Tracking
  lastRun: text('last_run'), // ISO timestamp of last execution

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})