/**
 * Metrics Store
 * Manages metrics data, time ranges, and real-time updates
 */

import { defineStore } from 'pinia'

export const useMetricsStore = defineStore('metrics', {
  state: () => ({
    // Time range selection
    timeRange: '24h', // '1h', '24h', '7d', 'custom'
    customFrom: null,
    customTo: null,
    interval: '5m',

    // Summary data (real-time snapshot)
    summary: null,
    summaryLoading: false,
    summaryError: null,

    // Server metrics
    serverMetrics: null,
    serverLoading: false,
    serverError: null,

    // Agent metrics
    agentMetrics: null,
    agentLoading: false,
    agentError: null,

    // Build metrics
    buildMetrics: null,
    buildLoading: false,
    buildError: null,

    // API performance metrics
    apiMetrics: null,
    apiLoading: false,
    apiError: null,

    // Auto-refresh
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    lastRefresh: null
  }),

  getters: {
    /**
     * Get time range bounds for API requests
     */
    timeRangeBounds: (state) => {
      const now = new Date()
      let from, to = now

      if (state.timeRange === 'custom') {
        from = state.customFrom ? new Date(state.customFrom) : new Date(now.getTime() - 24 * 60 * 60 * 1000)
        to = state.customTo ? new Date(state.customTo) : now
      } else {
        const ranges = {
          '1h': 60 * 60 * 1000,
          '8h': 8 * 60 * 60 * 1000,
          '24h': 24 * 60 * 60 * 1000,
          '3d': 3 * 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000
        }
        from = new Date(now.getTime() - (ranges[state.timeRange] || ranges['24h']))
      }

      return {
        from: from.toISOString(),
        to: to.toISOString()
      }
    },

    /**
     * Get appropriate interval based on time range
     */
    autoInterval: (state) => {
      const intervals = {
        '1h': '1m',
        '8h': '5m',
        '24h': '5m',
        '3d': '30m',
        '7d': '1h'
      }
      return intervals[state.timeRange] || state.interval
    },

    /**
     * Check if data is stale (older than refresh interval)
     */
    isStale: (state) => {
      if (!state.lastRefresh) return true
      const age = Date.now() - state.lastRefresh
      return age > state.refreshInterval
    },

    /**
     * Get formatted time range label
     */
    timeRangeLabel: (state) => {
      const labels = {
        '1h': 'Last Hour',
        '8h': 'Last 8 Hours',
        '24h': 'Last 24 Hours',
        '3d': 'Last 3 Days',
        '7d': 'Last 7 Days',
        'custom': 'Custom Range'
      }
      return labels[state.timeRange] || 'Unknown'
    },

    /**
     * Get short time range label (for display in components)
     */
    timeRangeShortLabel: (state) => {
      const labels = {
        '1h': '1h',
        '8h': '8h',
        '24h': '24h',
        '3d': '3d',
        '7d': '7d',
        'custom': 'Custom'
      }
      return labels[state.timeRange] || state.timeRange
    }
  },

  actions: {
    /**
     * Fetch summary metrics (real-time snapshot)
     */
    async fetchSummary() {
      this.summaryLoading = true
      this.summaryError = null

      try {
        const response = await $fetch('/api/admin/metrics/summary')

        if (response.success) {
          this.summary = response.data
          this.lastRefresh = Date.now()
        } else {
          this.summaryError = response.error || 'Failed to fetch summary'
        }
      } catch (error) {
        console.error('Error fetching metrics summary:', error)
        this.summaryError = error.message || 'Network error'
      } finally {
        this.summaryLoading = false
      }
    },

    /**
     * Fetch server metrics
     */
    async fetchServerMetrics() {
      this.serverLoading = true
      this.serverError = null

      try {
        const { from, to } = this.timeRangeBounds
        const interval = this.autoInterval

        const response = await $fetch('/api/admin/metrics/server', {
          params: { from, to, interval }
        })

        if (response.success) {
          this.serverMetrics = response.data
          this.lastRefresh = Date.now()
        } else {
          this.serverError = response.error || 'Failed to fetch server metrics'
        }
      } catch (error) {
        console.error('Error fetching server metrics:', error)
        this.serverError = error.message || 'Network error'
      } finally {
        this.serverLoading = false
      }
    },

    /**
     * Fetch agent metrics
     */
    async fetchAgentMetrics(agentId = null) {
      this.agentLoading = true
      this.agentError = null

      try {
        const { from, to } = this.timeRangeBounds
        const interval = this.autoInterval

        const params = { from, to, interval }
        if (agentId) params.agentId = agentId

        const response = await $fetch('/api/admin/metrics/agents', { params })

        if (response.success) {
          this.agentMetrics = response.data
          this.lastRefresh = Date.now()
        } else {
          this.agentError = response.error || 'Failed to fetch agent metrics'
        }
      } catch (error) {
        console.error('Error fetching agent metrics:', error)
        this.agentError = error.message || 'Network error'
      } finally {
        this.agentLoading = false
      }
    },

    /**
     * Fetch build metrics
     */
    async fetchBuildMetrics() {
      this.buildLoading = true
      this.buildError = null

      try {
        const { from, to } = this.timeRangeBounds
        // Builds use longer intervals based on time range
        const intervalMap = {
          '1h': '5m',
          '8h': '30m',
          '24h': '1h',
          '3d': '6h',
          '7d': '1d'
        }
        const interval = intervalMap[this.timeRange] || '1h'

        const response = await $fetch('/api/admin/metrics/builds', {
          params: { from, to, interval }
        })

        if (response.success) {
          this.buildMetrics = response.data
          this.lastRefresh = Date.now()
        } else {
          this.buildError = response.error || 'Failed to fetch build metrics'
        }
      } catch (error) {
        console.error('Error fetching build metrics:', error)
        this.buildError = error.message || 'Network error'
      } finally {
        this.buildLoading = false
      }
    },

    /**
     * Fetch API performance metrics
     */
    async fetchAPIMetrics() {
      this.apiLoading = true
      this.apiError = null

      try {
        const { from, to } = this.timeRangeBounds
        const interval = this.autoInterval

        const response = await $fetch('/api/admin/metrics/api-performance', {
          params: { from, to, interval }
        })

        if (response.success) {
          this.apiMetrics = response.data
          this.lastRefresh = Date.now()
        } else {
          this.apiError = response.error || 'Failed to fetch API metrics'
        }
      } catch (error) {
        console.error('Error fetching API metrics:', error)
        this.apiError = error.message || 'Network error'
      } finally {
        this.apiLoading = false
      }
    },

    /**
     * Fetch all metrics
     */
    async fetchAll() {
      await Promise.all([
        this.fetchSummary(),
        this.fetchServerMetrics(),
        this.fetchAgentMetrics(),
        this.fetchBuildMetrics(),
        this.fetchAPIMetrics()
      ])
    },

    /**
     * Set time range
     */
    setTimeRange(range) {
      this.timeRange = range
      this.fetchAll()
    },

    /**
     * Set custom time range
     */
    setCustomTimeRange(from, to) {
      this.customFrom = from
      this.customTo = to
      this.timeRange = 'custom'
      this.fetchAll()
    },

    /**
     * Toggle auto-refresh
     */
    toggleAutoRefresh() {
      this.autoRefresh = !this.autoRefresh
    },

    /**
     * Set refresh interval
     */
    setRefreshInterval(interval) {
      this.refreshInterval = interval
    },

    /**
     * Handle real-time metrics update from WebSocket
     */
    handleRealtimeUpdate(data) {
      if (!data || !data.summary) return

      // Update summary with latest values
      if (this.summary) {
        // Merge real-time data with existing summary
        Object.assign(this.summary, data.summary)
      }
    },

    /**
     * Handle real-time agent metrics update from WebSocket
     */
    handleAgentMetricsUpdate(data) {
      if (!data || !data.agentId || !data.metrics) return

      const { agentId, agentName, timestamp, metrics } = data
      const { status, currentJobs, systemMetrics, systemInfo, lastHeartbeat } = metrics

      // Use $patch for optimal reactivity - batches all changes
      this.$patch((state) => {
        // Initialize agentMetrics if not present
        if (!state.agentMetrics) {
          state.agentMetrics = {}
        }
        // Initialize agent entry if not present
        if (!state.agentMetrics[agentId]) {
          state.agentMetrics[agentId] = {
            agent_status: [],
            agent_jobs: [],
            agent_cpu: [],
            agent_memory: [],
            agent_disk: [],
            agent_network: [],
            agent_heartbeat: []
          }
        }

        const agent = state.agentMetrics[agentId]
        const timestampMs = new Date(timestamp).getTime()

        // Helper to add data point and keep only recent entries (last 100 points)
        const addDataPoint = (array, point) => {
          array.push(point)
          // Keep only the last 100 data points to prevent memory issues
          if (array.length > 100) {
            array.shift()
          }
        }

      // Update agent status
      addDataPoint(agent.agent_status, {
        timestamp,
        agentName: agentName,
        platform: systemInfo?.platform || 'Unknown',
        uptime: systemInfo?.uptime || 0,
        status: status,
        isOnline: status === 'online'
      })

      // Update agent jobs
      addDataPoint(agent.agent_jobs, {
        timestamp,
        agentName: agentName,
        current: currentJobs || 0,
        max: systemInfo?.maxConcurrentJobs || 1
      })

      // Update CPU if available
      if (systemMetrics?.cpuUsage !== undefined) {
        addDataPoint(agent.agent_cpu, {
          timestamp,
          agentName: agentName,
          percent: systemMetrics.cpuUsage
        })
      }

      // Update memory if available
      if (systemMetrics?.memoryUsage !== undefined) {
        addDataPoint(agent.agent_memory, {
          timestamp,
          agentName: agentName,
          percent: systemMetrics.memoryUsage,
          used: systemMetrics.usedMemory || 0,
          total: systemMetrics.totalMemory || 0
        })
      }

      // Update disk if available
      if (systemMetrics?.diskUsage !== undefined) {
        addDataPoint(agent.agent_disk, {
          timestamp,
          agentName: agentName,
          percent: systemMetrics.diskUsage,
          used: systemMetrics.diskUsed || 0,
          total: systemMetrics.diskTotal || 0,
          free: systemMetrics.diskFree || 0
        })
      }

      // Update network if available
      if (systemMetrics?.interfaceCount !== undefined) {
        addDataPoint(agent.agent_network, {
          timestamp,
          agentName: agentName,
          interfaceCount: systemMetrics.interfaceCount,
          activeInterfaces: systemMetrics.activeInterfaces || [],
          ipv4Count: systemMetrics.ipv4Count || 0,
          ipv6Count: systemMetrics.ipv6Count || 0,
          ipv4Addresses: systemMetrics.ipv4Addresses || [],
          ipv6Addresses: systemMetrics.ipv6Addresses || []
        })
      }

      // Update heartbeat
      if (lastHeartbeat) {
        const lastHeartbeatMs = new Date(lastHeartbeat).getTime()
        const ageMs = timestampMs - lastHeartbeatMs

        addDataPoint(agent.agent_heartbeat, {
          timestamp,
          agentName: agentName,
          ageMs,
          lastHeartbeat
        })
      }
      }) // End $patch
    },

    /**
     * Reset all metrics
     */
    reset() {
      this.summary = null
      this.serverMetrics = null
      this.agentMetrics = null
      this.buildMetrics = null
      this.apiMetrics = null
      this.lastRefresh = null
    }
  }
})
