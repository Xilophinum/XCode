/**
 * PM2 Ecosystem Configuration for FlowForge
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 restart flowforge
 *   pm2 stop flowforge
 *   pm2 logs flowforge
 *   pm2 monit
 */

module.exports = {
  apps: [
    {
      name: 'FlowForge',
      script: '.output/server/index.mjs',

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Process management
      instances: 1, // Single instance (can be changed to 'max' for clustering)
      exec_mode: 'fork', // Use 'cluster' for multiple instances

      // Auto-restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // Resource limits
      max_memory_restart: '500M',

      // Graceful shutdown
      kill_timeout: 30000, // 30 seconds for graceful shutdown
      wait_ready: true, // Wait for app to send 'ready' signal
      listen_timeout: 10000, // 10 seconds to listen for ready signal

      // Logging
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Advanced features
      watch: false, // Set to true for development auto-reload
      ignore_watch: ['node_modules', 'logs', 'data', 'temp-update'],

      // Update-related environment variables
      env_update: {
        FLOWFORGE_UPDATING: 'true'
      }
    }
  ]
}
