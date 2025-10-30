import { ref, reactive } from 'vue'

const notifications = ref([])
let notificationId = 0

export const useNotifications = () => {
  const addNotification = (options) => {
    const id = ++notificationId
    const notification = {
      id,
      type: options.type || 'info', // success, error, warning, info
      title: options.title,
      message: options.message,
      duration: options.duration || 5000,
      persistent: options.persistent || false,
      actions: options.actions || []
    }

    notifications.value.push(notification)

    // Auto-remove after duration (unless persistent)
    if (!notification.persistent && notification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, notification.duration)
    }

    return id
  }

  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clearAll = () => {
    notifications.value.splice(0)
  }

  // Convenience methods
  const success = (message, options = {}) => {
    return addNotification({
      type: 'success',
      message,
      ...options
    })
  }

  const error = (message, options = {}) => {
    return addNotification({
      type: 'error',
      message,
      duration: 8000, // Errors stay longer
      ...options
    })
  }

  const warning = (message, options = {}) => {
    return addNotification({
      type: 'warning',
      message,
      ...options
    })
  }

  const info = (message, options = {}) => {
    return addNotification({
      type: 'info',
      message,
      ...options
    })
  }

  const confirm = (message, options = {}) => {
    return new Promise((resolve) => {
      const id = addNotification({
        type: 'confirm',
        message,
        title: options.title || 'Confirm',
        persistent: true,
        actions: [
          {
            label: options.cancelLabel || 'Cancel',
            handler: () => {
              removeNotification(id)
              resolve(false)
            }
          },
          {
            label: options.confirmLabel || 'Confirm',
            primary: true,
            handler: () => {
              removeNotification(id)
              resolve(true)
            }
          }
        ],
        ...options
      })
    })
  }

  return {
    notifications: readonly(notifications),
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info,
    confirm
  }
}