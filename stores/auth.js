import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false
  }),

  getters: {
    getCurrentUser: (state) => state.user,
    isLoggedIn: (state) => state.isAuthenticated && state.user !== null
  },

  actions: {
    async login(email, password) {
      this.isLoading = true
      try {
        await $fetch('/api/auth/login', {
          method: 'POST',
          body: { email, password }
        })
        
        // After successful login, initialize auth state to ensure consistency
        await this.initializeAuth()
        
        return { success: true }
      } catch (error) {
        logger.error('Login error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Login failed' }
      } finally {
        this.isLoading = false
      }
    },

    async logout() {
      try {
        // Call logout endpoint to clear server-side session
        await $fetch('/api/auth/logout', {
          method: 'POST'
        })
      } catch (error) {
        logger.error('Logout API error:', error)
      } finally {
        // Clear client-side state regardless of API result
        this.user = null
        this.isAuthenticated = false
        
        // Redirect to login
        await navigateTo('/login')
      }
    },

    async initializeAuth() {
      try {
        // Check if user has a valid session with the server
        const userData = await $fetch('/api/auth/me', {
          method: 'GET'
        })
        
        if (userData) {
          this.user = userData
          this.isAuthenticated = true
        }
      } catch (error) {
        // No valid session - user needs to login
        this.user = null
        this.isAuthenticated = false
      }
    },

    async register(email, password, name) {
      this.isLoading = true
      try {
        const user = await $fetch('/api/auth/register', {
          method: 'POST',
          body: { email, password, name }
        })
        
        // After successful registration, initialize auth state to ensure consistency
        await this.initializeAuth()
        
        return { success: true }
      } catch (error) {
        logger.error('Registration error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Registration failed' }
      } finally {
        this.isLoading = false
      }
    }
  }
})