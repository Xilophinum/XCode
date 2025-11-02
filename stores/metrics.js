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
          '24h': 24 * 60 * 60 * 1000,
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
        '24h': '5m',
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
        '24h': 'Last 24 Hours',
        '7d': 'Last 7 Days',
        'custom': 'Custom Range'
      }
      return labels[state.timeRange] || 'Unknown'
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
        // Builds use longer intervals
        const interval = this.timeRange === '7d' ? '1d' : '1h'

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
