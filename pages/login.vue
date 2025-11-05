<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome to FlowForge
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Sign in to access your automation platform
        </p>
      </div>

      <!-- Login Form -->
      <UCard v-if="isLoginMode" class="shadow-lg">
        <template #header>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Sign In
          </h2>
        </template>

        <form class="space-y-6" @submit.prevent="handleLogin">
          <div class="space-y-4">
            <UFormField label="Email/Username" name="email" required class="text-center">
              <UInput
                v-model="loginForm.email"
                type="text"
                autocomplete="email"
                placeholder="Enter your email or username"
                size="lg"
                class="mx-auto w-full"
                required
              />
            </UFormField>
            <UFormField label="Password" name="password" required class="text-center">
              <UInput
                v-model="loginForm.password"
                type="password"
                autocomplete="current-password"
                placeholder="Enter your password"
                size="lg"
                class="mx-auto w-full"
                required
              />
            </UFormField>
          </div>

          <UAlert
            v-if="error"
            color="red"
            variant="soft"
            :title="error"
            icon="i-lucide-triangle-alert"
            class="mb-4"
          />

          <UButton
            type="submit"
            color="primary"
            size="lg"
            block
            :loading="authStore.isLoading"
            :disabled="authStore.isLoading"
          >
            {{ authStore.isLoading ? 'Signing in...' : 'Sign in' }}
          </UButton>
        </form>

        <template #footer v-if="userRegistrationEnabled">
          <div class="text-center text-sm">
            <span class="text-gray-600 dark:text-gray-400">Don't have an account? </span>
            <UButton
              variant="link"
              color="primary"
              size="sm"
              @click="isLoginMode = false"
            >
              Create one
            </UButton>
          </div>
        </template>
      </UCard>

      <!-- Register Form -->
      <UCard v-if="!isLoginMode && userRegistrationEnabled" class="shadow-lg">
        <template #header>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Create Account
          </h2>
        </template>

        <form class="space-y-6" @submit.prevent="handleRegister">
          <div class="space-y-4">
            <UFormField label="Full name" name="name" required class="text-center">
              <UInput
                v-model="registerForm.name"
                type="text"
                autocomplete="name"
                placeholder="Enter your full name"
                size="lg"
                class="mx-auto w-full"
                required
              />
            </UFormField>

            <UFormField label="Email address" name="email" required class="text-center">
              <UInput
                v-model="registerForm.email"
                type="email"
                autocomplete="email"
                placeholder="Enter your email address"
                size="lg"
                class="mx-auto w-full"
                required
              />
            </UFormField>

            <UFormField label="Password" name="password" required class="text-center">
              <UInput
                v-model="registerForm.password"
                type="password"
                autocomplete="new-password"
                placeholder="Create a password"
                size="lg"
                class="mx-auto w-full"
                required
              />
            </UFormField>
          </div>

          <UAlert
            v-if="error"
            color="red"
            variant="soft"
            :title="error"
            icon="i-lucide-triangle-alert"
            class="mb-4"
          />

          <UButton
            type="submit"
            color="primary"
            size="lg"
            block
            :loading="authStore.isLoading"
            :disabled="authStore.isLoading"
          >
            {{ authStore.isLoading ? 'Creating account...' : 'Create account' }}
          </UButton>
        </form>

        <template #footer>
          <div class="text-center text-sm">
            <span class="text-gray-600 dark:text-gray-400">Already have an account? </span>
            <UButton
              variant="link"
              color="primary"
              size="sm"
              @click="isLoginMode = true"
            >
              Sign in
            </UButton>
          </div>
        </template>
      </UCard>

      <!-- Demo Credentials -->
      <UCard variant="outline" class="shadow-sm">
        <template #header>
          <h3 class="text-sm font-medium text-gray-900 dark:text-white text-center">
            Demo Credentials
          </h3>
        </template>

        <div class="text-center space-y-2">
          <div class="text-sm text-gray-600 dark:text-gray-400">
            <div class="font-medium">Email:</div>
            <div class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">admin@example.com</div>
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            <div class="font-medium">Password:</div>
            <div class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">password</div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'guest',
  layout: false
})

const authStore = useAuthStore()

const isLoginMode = ref(true)
const error = ref('')
const userRegistrationEnabled = ref(false) // Default to false for security

const loginForm = reactive({
  email: '',
  password: ''
})

const registerForm = reactive({
  name: '',
  email: '',
  password: ''
})

const handleLogin = async () => {
  error.value = ''

  const result = await authStore.login(loginForm.email, loginForm.password)

  if (result.success) {
    await navigateTo('/')
  } else {
    error.value = result.error || 'Login failed'
  }
}

const handleRegister = async () => {
  error.value = ''

  // Double-check if registration is still enabled
  if (!userRegistrationEnabled.value) {
    error.value = 'User registration is currently disabled'
    return
  }

  const result = await authStore.register(registerForm.email, registerForm.password, registerForm.name)
  console.log('Registration result:', result)
  if (result.success) {
    await navigateTo('/')
  } else {
    error.value = result.error || 'Registration failed'
  }
}

// Load user registration setting
const loadUserRegistrationSetting = async () => {
  try {
    const response = await $fetch('/api/public/system-settings/enable_registration')
    userRegistrationEnabled.value = response?.value === 'true' || response?.value === true
  } catch (error) {
    // If setting doesn't exist or there's an error, default to false for security
    console.info('User registration setting not found, defaulting to disabled')
    userRegistrationEnabled.value = false
  }
}

// Initialize auth on page load
onMounted(async () => {
  authStore.initializeAuth()
  await loadUserRegistrationSetting()
})
</script>
