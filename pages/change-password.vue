<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Password Change Required
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          For security reasons, you must change your password before continuing.
        </p>
      </div>

      <!-- Password Change Form -->
      <UCard class="shadow-lg">
        <template #header>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Change Your Password
          </h2>
        </template>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <!-- Current Password (only show if not forced change) -->
            <UFormField
              v-if="!isDefaultPassword"
              label="Current Password"
              name="current-password"
              required
            >
              <UInput
                v-model="currentPassword"
                type="password"
                autocomplete="current-password"
                placeholder="Enter current password"
                size="lg"
                class="w-full"
                required
              />
            </UFormField>

            <!-- New Password -->
            <UFormField
              label="New Password"
              name="new-password"
              :error="showPasswordError"
              required
            >
              <UInput
                v-model="newPassword"
                type="password"
                autocomplete="new-password"
                placeholder="Enter new password (minimum 8 characters)"
                size="lg"
                required
                class="w-full"
                @input="validatePassword"
              />
            </UFormField>

            <!-- Confirm Password -->
            <UFormField
              label="Confirm New Password"
              name="confirm-password"
              :error="showConfirmError"
              required
            >
              <UInput
                v-model="confirmPassword"
                type="password"
                autocomplete="new-password"
                placeholder="Confirm new password"
                size="lg"
                required
                class="w-full"
                @input="validateConfirm"
              />
            </UFormField>
          </div>

          <!-- Password Requirements -->
          <UAlert
            color="blue"
            variant="soft"
            title="Password Requirements"
            icon="i-lucide-info"
          >
            <template #description>
              <ul class="list-disc list-inside space-y-1 text-sm">
                <li>Minimum 8 characters</li>
                <li>Cannot be same as current password</li>
                <li>Must match confirmation</li>
              </ul>
            </template>
          </UAlert>

          <!-- Error Message -->
          <UAlert
            v-if="error"
            color="red"
            variant="soft"
            :title="error"
            icon="i-lucide-triangle-alert"
          />

          <!-- Submit Button -->
          <UButton
            type="submit"
            color="primary"
            size="lg"
            block
            :loading="loading"
            :disabled="loading || !isValid"
          >
            {{ loading ? 'Changing Password...' : 'Change Password' }}
          </UButton>

          <!-- Logout Option -->
          <div class="text-center">
            <UButton
              color="neutral"
              variant="outline"
              size="lg"
              @click="handleLogout"
            >
              Logout instead
            </UButton>
          </div>
        </form>
      </UCard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

definePageMeta({
  middleware: 'auth',
  layout: false
})

const authStore = useAuthStore()
const router = useRouter()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

// Check if this is the default admin password scenario
const isDefaultPassword = computed(() => {
  return authStore.user?.passwordChangeRequired === true
})

// Computed properties for showing errors (only show when condition is met)
const showPasswordError = computed(() => {
  if (newPassword.value.length === 0) return undefined
  if (newPassword.value.length < 8) return 'Password must be at least 8 characters'
  return undefined
})

const showConfirmError = computed(() => {
  if (confirmPassword.value.length === 0) return undefined
  if (newPassword.value.length > 0 && confirmPassword.value !== newPassword.value) {
    return 'Passwords do not match'
  }
  return undefined
})

// Validate new password
const validatePassword = () => {
  // Validation is now handled by computed properties
  // This is just for triggering reactivity if needed
}

// Validate password confirmation
const validateConfirm = () => {
  // Validation is now handled by computed properties
  // This is just for triggering reactivity if needed
}

// Check if form is valid
const isValid = computed(() => {
  const passwordsMatch = newPassword.value === confirmPassword.value
  const passwordLongEnough = newPassword.value.length >= 8
  const hasCurrentPassword = isDefaultPassword.value || currentPassword.value.length > 0
  const confirmFilled = confirmPassword.value.length > 0
  
  return passwordsMatch && passwordLongEnough && hasCurrentPassword && confirmFilled
})

// Handle form submission
const handleSubmit = async () => {
  error.value = ''
  
  // Final validation
  if (!isValid.value) {
    error.value = 'Please fix the errors above'
    return
  }
  
  loading.value = true
  
  try {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentPassword: isDefaultPassword.value ? null : currentPassword.value,
        newPassword: newPassword.value
      })
    })
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.statusMessage || 'Failed to change password')
    }
    
    // Refresh auth state to clear passwordChangeRequired flag
    await authStore.initializeAuth()
    
    // Redirect to home page
    router.push('/')
  } catch (err) {
    error.value = err.message || 'An error occurred while changing your password'
  } finally {
    loading.value = false
  }
}

// Handle logout
const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>
