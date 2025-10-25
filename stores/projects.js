import { defineStore } from 'pinia'

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    items: [], // All items (folders and projects) with path information
    currentProject: null,
    isLoading: false
  }),

  getters: {
    // Get all items
    allItems: (state) => state.items || [],
    
    // Get all items at a specific path (folder path)
    getItemsAtPath: (state) => (pathArray = []) => {
      if (!Array.isArray(state.items)) {
        logger.warn('Items is not an array:', state.items)
        return []
      }
      return state.items.filter(item => {
        if (pathArray.length === 0) {
          return item.path.length === 0 // Root level items
        }
        return item.path.length === pathArray.length && 
               item.path.every((segment, index) => segment === pathArray[index])
      })
    },

    // Get folders only at a specific path
    getFoldersAtPath: (state) => (pathArray = []) => {
      if (!Array.isArray(state.items)) {
        logger.warn('Items is not an array:', state.items)
        return []
      }
      return state.items.filter(item => 
        item.type === 'folder' &&
        (pathArray.length === 0 ? item.path.length === 0 : 
         item.path.length === pathArray.length && 
         item.path.every((segment, index) => segment === pathArray[index]))
      )
    },

    // Get projects only at a specific path
    getProjectsAtPath: (state) => (pathArray = []) => {
      if (!Array.isArray(state.items)) {
        logger.warn('Items is not an array:', state.items)
        return []
      }
      return state.items.filter(item => 
        item.type === 'project' &&
        (pathArray.length === 0 ? item.path.length === 0 : 
         item.path.length === pathArray.length && 
         item.path.every((segment, index) => segment === pathArray[index]))
      ).sort((a, b) => a.name.localeCompare(b.name))
    },

    // Get a specific item by its complete path including name
    getItemByFullPath: (state) => (fullPath) => {
      if (!Array.isArray(state.items)) {
        logger.warn('Items is not an array:', state.items)
        return null
      }
      
      const pathArray = Array.isArray(fullPath) ? fullPath : fullPath.split('/').filter(Boolean)
      if (pathArray.length === 0) return null
      
      const itemName = pathArray[pathArray.length - 1]
      const itemPath = pathArray.slice(0, -1)
      
      return state.items.find(item => {
        // Check if item name matches
        if (item.name !== itemName) return false
        
        // Handle both path formats: array of strings vs single string with slashes
        if (item.path.length === 1 && typeof item.path[0] === 'string' && item.path[0].includes('/')) {
          // Handle legacy format: ["Web Applications/Another folder"]
          const legacyPath = item.path[0].split('/')
          return legacyPath.length === itemPath.length &&
                 legacyPath.every((segment, index) => segment === itemPath[index])
        } else {
          // Handle correct format: ["Web Applications", "Another folder"]
          return item.path.length === itemPath.length &&
                 item.path.every((segment, index) => segment === itemPath[index])
        }
      })
    },

    // Get project by ID (for backward compatibility)
    getProjectById: (state) => (id) => {
      if (!Array.isArray(state.items)) {
        logger.warn('Items is not an array:', state.items)
        return null
      }
      return state.items.find(item => item.type === 'project' && item.id === id)
    },

    // Get all projects (for dashboard recent projects, etc.)
    getAllProjects: (state) => Array.isArray(state.items) ? state.items.filter(item => item.type === 'project') : [],
    
    // Get active projects only
    getActiveProjects: (state) => Array.isArray(state.items) ? state.items.filter(item => 
      item.type === 'project' && (item.status === 'active' || !item.status) // Default to active if status is missing
    ) : [],
    
    // Get disabled projects only
    getDisabledProjects: (state) => Array.isArray(state.items) ? state.items.filter(item => 
      item.type === 'project' && item.status === 'disabled'
    ) : [],
    
    // Get projects at path with status filtering
    getActiveProjectsAtPath: (state) => (pathArray = []) => {
      if (!Array.isArray(state.items)) {
        logger.warn('Items is not an array:', state.items)
        return []
      }
      return state.items.filter(item => 
        item.type === 'project' &&
        (item.status === 'active' || !item.status) &&
        (pathArray.length === 0 ? item.path.length === 0 : 
         item.path.length === pathArray.length && 
         item.path.every((segment, index) => segment === pathArray[index]))
      )
    },
    
    // Get all folders
    getAllFolders: (state) => Array.isArray(state.items) ? state.items.filter(item => item.type === 'folder') : []
  },

  actions: {
    async loadData() {
      this.isLoading = true
      try {
        const authStore = useAuthStore()
        if (!authStore.user) {
          logger.warn('No authenticated user, cannot load data')
          this.items = [] // Ensure items is always an array
          this.isLoading = false
          return
        }
        
        // JWT-based authentication - no need to pass userId
        const items = await $fetch('/api/items', {
          timeout: 30000
        })
        
        // Ensure items is always an array and parse dates
        const rawItems = Array.isArray(items) ? items : []
        this.items = rawItems.map(item => this.parseItemDates(item))
      } catch (error) {
        logger.error('Failed to load data:', error)
        this.items = [] // Ensure items is always an array even on error
      } finally {
        this.isLoading = false
      }
    },

    // Create a folder at a specific path
    async createFolder(name, description, pathArray = []) {
      const authStore = useAuthStore()
      if (!authStore.user) return { success: false, error: 'User not authenticated' }

      try {
        const newFolder = await $fetch('/api/items', {
          method: 'POST',
          timeout: 30000,
          body: {
            name,
            description: description || '',
            type: 'folder',
            path: [...pathArray] // Copy the path array
            // userId will be set by the server from JWT
          }
        })
        
        // Ensure dates are properly parsed
        const parsedFolder = this.parseItemDates(newFolder)
        this.items.push(parsedFolder)
        return { success: true, folder: parsedFolder }
      } catch (error) {
        logger.error('Error creating folder:', error)
        return { success: false, error: error.message }
      }
    },

    // Edit a folder
    async editFolder(folderId, name, description) {
      try {
        const updatedFolder = await $fetch(`/api/items/${folderId}`, {
          method: 'PUT',
          body: {
            name,
            description: description || ''
          }
        })
        
        // Update the folder in the store
        const index = this.items.findIndex(item => item.id === folderId)
        if (index !== -1) {
          this.items[index] = this.parseItemDates(updatedFolder)
        }
        
        return { success: true, folder: updatedFolder }
      } catch (error) {
        logger.error('Error editing folder:', error)
        return { success: false, error: error.message }
      }
    },

    // Delete a folder (with cascade delete)
    async deleteFolder(folderId) {
      try {
        await $fetch(`/api/items/${folderId}`, {
          method: 'DELETE'
        })
        
        // Remove the folder and any children from the store
        // The server handles cascade deletion, so we need to reload data
        // to ensure our local state is consistent
        await this.loadData()
        
        return { success: true }
      } catch (error) {
        logger.error('Error deleting folder:', error)
        return { success: false, error: error.message }
      }
    },

    // Create a project at a specific path
    async createProject(name, description, pathArray = []) {
      const authStore = useAuthStore()
      if (!authStore.user) return { success: false, error: 'User not authenticated' }

      try {
        const newProject = await $fetch('/api/items', {
          method: 'POST',
          timeout: 10000,
          body: {
            name,
            description: description || '',
            type: 'project',
            path: [...pathArray], // Copy the path array
            diagramData: { nodes: [], edges: [] }
            // userId will be set by the server from JWT
          }
        })
        
        this.items.push(newProject)
        return { success: true, project: newProject }
      } catch (error) {
        logger.error('Error creating project:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create project' }
      }
    },

    // Update an existing project
    async updateProject(projectId, updates) {
      try {
        const updatedProject = await $fetch(`/api/items/${projectId}`, {
          method: 'PUT',
          body: updates
        })
        
        // Update the project in the local state
        const index = this.items.findIndex(item => item.id === projectId)
        if (index !== -1) {
          this.items[index] = this.parseItemDates(updatedProject)
        }
        
        // Update currentProject if it's the one being updated
        if (this.currentProject?.id === projectId) {
          this.currentProject = this.parseItemDates(updatedProject)
        }
        
        return { success: true, project: updatedProject }
      } catch (error) {
        logger.error('Error updating project:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update project' }
      }
    },

    // Update an existing item
    async updateItem(itemId, updates) {
      try {
        const updatedItem = await $fetch(`/api/items/${itemId}`, {
          method: 'PUT',
          body: updates
        })
        
        // Update the item in the local state
        const index = this.items.findIndex(item => item.id === itemId)
        if (index !== -1) {
          this.items[index] = updatedItem
        }
        
        return { success: true, item: updatedItem }
      } catch (error) {
        logger.error('Error updating item:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update item' }
      }
    },

    // Delete an item and all its children
    async deleteItem(itemId) {
      try {
        const item = this.items.find(i => i.id === itemId)
        if (!item) return { success: false, error: 'Item not found' }

        // Build the path that would be used by children of this item
        const childPath = [...item.path, item.name]
        
        // Find all items to delete (the item itself and all its children)
        const itemsToDelete = this.items.filter(i => {
          // Include the target item
          if (i.id === itemId) return true
          
          // Include items that have this item in their path
          return i.path.length >= childPath.length && 
                 i.path.slice(0, childPath.length).every((segment, index) => segment === childPath[index])
        })

        // Delete all items from database via API
        for (const itemToDelete of itemsToDelete) {
          await $fetch(`/api/items/${itemToDelete.id}`, {
            method: 'DELETE'
          })
        }
        
        // Remove from local state
        this.items = this.items.filter(i => !itemsToDelete.some(deleted => deleted.id === i.id))
        
        return { success: true }
      } catch (error) {
        logger.error('Error deleting item:', error)
        return { success: false, error: error.message }
      }
    },

    // Move an item to a new location
    async moveItem(itemId, newPath) {
      try {
        const item = this.items.find(i => i.id === itemId)
        if (!item) return { success: false, error: 'Item not found' }

        const oldPath = item.path
        const childPath = [...oldPath, item.name]
        
        // Find all items that need to be moved (the item itself and all its children)
        const itemsToMove = this.items.filter(i => {
          // Include the target item
          if (i.id === itemId) return true
          
          // Include items that have this item in their path
          return i.path.length >= childPath.length && 
                 i.path.slice(0, childPath.length).every((segment, index) => segment === childPath[index])
        })

        // Update paths for all affected items
        for (const itemToMove of itemsToMove) {
          let updatedPath
          
          if (itemToMove.id === itemId) {
            // This is the target item - move it to the new path
            updatedPath = newPath
          } else {
            // This is a child item - update its path to reflect the new parent location
            const relativePath = itemToMove.path.slice(childPath.length)
            updatedPath = [...newPath, item.name, ...relativePath]
          }
          
          // Update item in database
          await $fetch(`/api/items/${itemToMove.id}`, {
            method: 'PUT',
            body: {
              path: updatedPath
            }
          })
          
          // Update local state
          const index = this.items.findIndex(i => i.id === itemToMove.id)
          if (index !== -1) {
            this.items[index] = {
              ...this.items[index],
              path: updatedPath
            }
          }
        }
        
        return { success: true }
      } catch (error) {
        logger.error('Error moving item:', error)
        return { success: false, error: error.message }
      }
    },

    setCurrentProject(project) {
      this.currentProject = project
    },

    // Toggle project status between active and disabled
    async toggleProjectStatus(projectId) {
      const project = this.items.find(item => item.id === projectId)
      if (!project || project.type !== 'project') {
        return { success: false, error: 'Project not found' }
      }

      const newStatus = project.status === 'disabled' ? 'active' : 'disabled'
      
      try {
        const result = await this.updateProject(projectId, { 
          status: newStatus,
          updatedAt: new Date()
        })
        
        // If disabling the project, cancel any running cron jobs
        if (newStatus === 'disabled') {
          try {
            await $fetch(`/api/projects/${projectId}/cron`, {
              method: 'DELETE'
            })
            logger.info(`🛑 Disabled cron jobs for project ${project.name}`)
          } catch (cronError) {
            logger.warn('Failed to disable cron jobs:', cronError)
          }
        }
        
        return { 
          success: true, 
          status: newStatus,
          message: `Project ${newStatus === 'disabled' ? 'disabled' : 'enabled'} successfully`
        }
      } catch (error) {
        logger.error('Error toggling project status:', error)
        return { success: false, error: error.message }
      }
    },

    // Helper to get full path string for URLs
    getPathString(pathArray) {
      return pathArray.length > 0 ? pathArray.join('/') : ''
    },

    // Helper to parse path string to array
    parsePathString(pathString) {
      return pathString ? pathString.split('/').filter(Boolean) : []
    },

    // Helper to ensure dates are properly parsed from API responses
    parseItemDates(item) {
      if (!item) return item
      
      return {
        ...item,
        createdAt: item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt),
        updatedAt: item.updatedAt instanceof Date ? item.updatedAt : new Date(item.updatedAt),
      }
    }
  }
})