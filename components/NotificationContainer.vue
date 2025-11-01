<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <TransitionGroup
        name="notification"
        tag="div"
        class="space-y-2"
      >
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'rounded-lg shadow-lg border p-4 backdrop-blur-sm',
            getNotificationClasses(notification.type)
          ]"
        >
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <Icon :name="getIconName(notification.type)" class="h-5 w-5" />
            </div>
            <div class="ml-3 flex-1">
              <h4 v-if="notification.title" class="text-sm font-medium mb-1">
                {{ notification.title }}
              </h4>
              <p class="text-sm">
                {{ notification.message }}
              </p>
              <div v-if="notification.actions?.length" class="mt-3 flex space-x-2">
                <button
                  v-for="action in notification.actions"
                  :key="action.label"
                  @click="action.handler"
                  :class="[
                    'text-xs px-2 py-1 rounded font-medium',
                    action.primary 
                      ? 'bg-white/20 hover:bg-white/30' 
                      : 'hover:bg-white/10'
                  ]"
                >
                  {{ action.label }}
                </button>
              </div>
            </div>
            <div class="ml-4 flex-shrink-0">
              <button
                @click="removeNotification(notification.id)"
                class="rounded-md hover:bg-white/10 p-1 transition-colors"
              >
                <Icon name="close" class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import Icon from '~/components/Icon.vue'
const { notifications, removeNotification } = useNotifications()

const getNotificationClasses = (type) => {
  const classes = {
    success: 'bg-green-500/90 text-white border-green-400',
    error: 'bg-red-500/90 text-white border-red-400',
    warning: 'bg-yellow-500/90 text-white border-yellow-400',
    info: 'bg-blue-500/90 text-white border-blue-400',
    confirm: 'bg-gray-800/90 text-white border-gray-600'
  }
  return classes[type] || classes.info
}

const getIconName = (type) => {
  const iconNames = {
    success: 'checkCircle',
    error: 'alertCircle',
    warning: 'alertTriangle',
    info: 'info',
    confirm: 'helpCircle'
  }
  return iconNames[type] || iconNames.info
}
</script>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>