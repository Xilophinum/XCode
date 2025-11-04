/**
 * Timezone Composable
 * Provides timezone conversion utilities based on system cron_timezone setting
 */

import { ref, computed } from 'vue'

// Global timezone state (shared across all components)
const cronTimezone = ref('America/New_York') // Default fallback
const timezoneLoaded = ref(false)

export const useTimezone = () => {
  /**
   * Fetch the cron timezone from system settings
   */
  const fetchTimezone = async () => {
    if (timezoneLoaded.value) return

    try {
      const response = await $fetch('/api/admin/settings')
      if (response.success && response.data) {
        const tzSetting = response.data.find(s => s.key === 'cron_timezone')
        if (tzSetting) {
          cronTimezone.value = tzSetting.value
          timezoneLoaded.value = true
        }
      }
    } catch (error) {
      console.warn('Failed to fetch timezone setting, using default:', error)
      timezoneLoaded.value = true // Mark as loaded to prevent retry loops
    }
  }

  /**
   * Convert UTC timestamp to local timezone string
   * @param {string|Date} utcTimestamp - UTC timestamp (ISO string or Date object)
   * @param {object} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date string in configured timezone
   */
  const toLocalTime = (utcTimestamp, options = {}) => {
    if (!utcTimestamp) return ''

    try {
      const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp

      const defaultOptions = {
        timeZone: cronTimezone.value,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }

      const formatOptions = { ...defaultOptions, ...options }
      return new Intl.DateTimeFormat('en-US', formatOptions).format(date)
    } catch (error) {
      console.error('Error converting timestamp:', error)
      return utcTimestamp.toString()
    }
  }

  /**
   * Convert UTC timestamp to short local time (HH:mm:ss)
   * @param {string|Date} utcTimestamp - UTC timestamp
   * @returns {string} Formatted time string (HH:mm:ss)
   */
  const toShortTime = (utcTimestamp) => {
    return toLocalTime(utcTimestamp, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  /**
   * Convert UTC timestamp to date only (MM/DD/YYYY)
   * @param {string|Date} utcTimestamp - UTC timestamp
   * @returns {string} Formatted date string
   */
  const toLocalDate = (utcTimestamp) => {
    return toLocalTime(utcTimestamp, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  /**
   * Convert UTC timestamp to datetime with timezone abbreviation
   * @param {string|Date} utcTimestamp - UTC timestamp
   * @returns {string} Formatted datetime with timezone
   */
  const toLocalTimeWithZone = (utcTimestamp) => {
    if (!utcTimestamp) return ''

    try {
      const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp

      const formatted = new Intl.DateTimeFormat('en-US', {
        timeZone: cronTimezone.value,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short'
      }).format(date)

      return formatted
    } catch (error) {
      console.error('Error converting timestamp:', error)
      return utcTimestamp.toString()
    }
  }

  /**
   * Get relative time string (e.g., "2 hours ago")
   * Time differences are calculated in UTC and displayed relatively
   * @param {string|Date} utcTimestamp - UTC timestamp
   * @returns {string} Relative time string
   */
  const getRelativeTime = (utcTimestamp) => {
    if (!utcTimestamp) return 'Never'

    try {
      const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp
      const now = new Date()
      const diffInSeconds = Math.floor((now - date) / 1000)

      if (diffInSeconds < 5) return 'Just now'
      if (diffInSeconds < 60) return `${diffInSeconds}s ago`
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

      // For older dates, show actual date in local timezone
      return toLocalDate(date)
    } catch (error) {
      console.error('Error calculating relative time:', error)
      return 'Unknown'
    }
  }

  /**
   * Format timestamp for ApexCharts (milliseconds since epoch)
   * Charts work with UTC timestamps, no conversion needed
   * @param {string|Date} utcTimestamp - UTC timestamp
   * @returns {number} Milliseconds since epoch
   */
  const toChartTime = (utcTimestamp) => {
    if (!utcTimestamp) return 0
    const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp
    return date.getTime()
  }

  return {
    // State
    cronTimezone: computed(() => cronTimezone.value),
    timezoneLoaded: computed(() => timezoneLoaded.value),

    // Methods
    fetchTimezone,
    toLocalTime,
    toShortTime,
    toLocalDate,
    toLocalTimeWithZone,
    getRelativeTime,
    toChartTime
  }
}
