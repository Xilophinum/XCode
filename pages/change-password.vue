<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ $t('changePassword.title') }}
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ $t('changePassword.subtitle') }}
        </p>
      </div>

      <!-- Password Change Form -->
      <UCard class="shadow-lg">
        <template #header>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ $t('changePassword.formTitle') }}
          </h2>
        </template>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <!-- Current Password (only show if not forced change) -->
            <UFormField
              v-if="!isDefaultPassword"
              :label="$t('changePassword.currentPassword')"
              name="current-password"
              required
            >
              <UInput
                v-model="currentPassword"
                type="password"
                autocomplete="current-password"
                :placeholder="$t('changePassword.currentPasswordPlaceholder')"
                size="lg"
                class="w-full"
                required
              />
            </UFormField>

            <!-- New Password -->
            <UFormField
              :label="$t('changePassword.newPassword')"
              name="new-password"
              :error="showPasswordError"
              required
            >
              <UInput
                v-model="newPassword"
                type="password"
                autocomplete="new-password"
                :placeholder="$t('changePassword.newPasswordPlaceholder')"
                size="lg"
                required
                class="w-full"
              />
            </UFormField>

            <!-- Confirm Password -->
            <UFormField
              :label="$t('changePassword.confirmPassword')"
              name="confirm-password"
              :error="showConfirmError"
              required
            >
              <UInput
                v-model="confirmPassword"
                type="password"
                autocomplete="new-password"
                :placeholder="$t('changePassword.confirmPasswordPlaceholder')"
                size="lg"
                required
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Password Requirements -->
          <UAlert
            color="blue"
            variant="soft"
            :title="$t('changePassword.requirementsTitle')"
            icon="i-lucide-info"
          >
            <template #description>
              <ul class="list-disc list-inside space-y-1 text-sm">
                <li>{{ $t('changePassword.requirement1') }}</li>
                <li>{{ $t('changePassword.requirement2') }}</li>
                <li>{{ $t('changePassword.requirement3') }}</li>
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
            {{ loading ? $t('changePassword.changingButton') : $t('changePassword.changeButton') }}
          </UButton>

          <!-- Logout Option -->
          <div class="text-center">
            <UButton
              color="neutral"
              variant="outline"
              size="lg"
              @click="handleLogout"
            >
              {{ $t('changePassword.logoutInstead') }}
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

const { t } = useI18n()

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
  if (newPassword.value.length < 8) return t('changePassword.passwordTooShort')
  return undefined
})

const showConfirmError = computed(() => {
  if (confirmPassword.value.length === 0) return undefined
  if (newPassword.value.length > 0 && confirmPassword.value !== newPassword.value) {
    return t('changePassword.passwordsNoMatch')
  }
  return undefined
})

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
    error.value = t('changePassword.fixErrors')
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
