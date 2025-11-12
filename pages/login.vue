<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
    <!-- Language Switcher -->
    <div class="absolute top-4 right-4">
      <LanguageSwitcher />
    </div>
    
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{$t('auth.welcometo')}} FlowForge
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ $t('auth.signintoaccess') }}
        </p>
      </div>

      <!-- Login Form -->
      <UCard v-if="isLoginMode" class="shadow-lg">
        <form class="space-y-6" @submit.prevent="handleLogin">
          <div class="space-y-4">
            <UFormField :label="$t('auth.email')" name="email" required class="text-center">
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
            <UFormField :label="$t('auth.password')" name="password" required class="text-center">
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
            {{ authStore.isLoading ? $t('common.loading') : $t('auth.loginButton') }}
          </UButton>

          <!-- OAuth Providers -->
          <div v-if="hasOAuthProviders" class="mt-6">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                  {{ $t('auth.orcontinuewith') }}
                </span>
              </div>
            </div>

            <div class="mt-6 grid gap-3">
              <!-- GitHub -->
              <UButton
                v-if="oauthProviders.github"
                color="secondary"
                variant="outline"
                size="lg"
                block
                @click="loginWithOAuth('github')"
              >
                <template #leading>
                  <Icon name="i-lucide-github" class="w-5 h-5" />
                </template>
                {{ $t('auth.github') }}
              </UButton>

              <!-- Google -->
              <UButton
                v-if="oauthProviders.google"
                color="secondary"
                variant="outline"
                size="lg"
                block
                @click="loginWithOAuth('google')"
              >
                <template #leading>
                  <svg class="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </template>
                {{ $t('auth.google') }}
              </UButton>

              <!-- Microsoft -->
              <UButton
                v-if="oauthProviders.microsoft"
                color="secondary"
                variant="outline"
                size="lg"
                block
                @click="loginWithOAuth('microsoft')"
              >
                <template #leading>
                  <svg class="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#f25022" d="M11.4 11.4H2V2h9.4z"/>
                    <path fill="#00a4ef" d="M22 11.4h-9.4V2H22z"/>
                    <path fill="#7fba00" d="M11.4 22H2v-9.4h9.4z"/>
                    <path fill="#ffb900" d="M22 22h-9.4v-9.4H22z"/>
                  </svg>
                </template>
                {{ $t('auth.microsoft') }}
              </UButton>
            </div>
          </div>
        </form>

        <template #footer v-if="userRegistrationEnabled">
          <div class="text-center text-sm">
            <span class="text-gray-600 dark:text-gray-400">{{ $t('auth.donthaveanaccount') }}</span>
            <UButton
              variant="link"
              color="primary"
              size="sm"
              @click="isLoginMode = false"
            >
              {{ $t('auth.createone') }}
            </UButton>
          </div>
        </template>
      </UCard>

      <!-- Register Form -->
      <UCard v-if="!isLoginMode && userRegistrationEnabled" class="shadow-lg">
        <template #header>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ $t('auth.register') }}
          </h2>
        </template>

        <form class="space-y-6" @submit.prevent="handleRegister">
          <div class="space-y-4">
            <UFormField :label="$t('auth.fullname')" name="name" required class="text-center">
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

            <UFormField :label="$t('auth.email')" name="email" required class="text-center">
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

            <UFormField :label="$t('auth.password')" name="password" required class="text-center">
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
            <span class="text-gray-600 dark:text-gray-400">{{ $t('auth.alreadyhaveanaccount') }}</span>
            <UButton
              variant="link"
              color="primary"
              size="sm"
              @click="isLoginMode = true"
            >
              {{ $t('auth.signin') }}
            </UButton>
          </div>
        </template>
      </UCard>

      <!-- Demo Credentials -->
      <UCard variant="outline" class="shadow-sm border-amber-200 dark:border-amber-800">
        <template #header>
          <div class="flex items-center justify-center gap-2">
            <svg class="h-4 w-4 text-amber-600 dark:text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
            </svg>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">
              {{ $t('auth.demoCredentials') }}
            </h3>
          </div>
        </template>

        <div class="text-center space-y-3">
          <div class="text-sm text-gray-600 dark:text-gray-400">
            <div class="font-medium">{{ $t('auth.email') }}:</div>
            <div class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">admin@example.com</div>
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            <div class="font-medium">{{ $t('auth.password') }}:</div>
            <div class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">password</div>
          </div>
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p class="text-xs text-amber-700 dark:text-amber-300 font-medium">
              {{ $t('auth.demoCredentialsWarning') }}
            </p>
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
const { t } = useI18n()

const isLoginMode = ref(true)
const error = ref('')
const userRegistrationEnabled = ref(false) // Default to false for security

// OAuth providers configuration
const oauthProviders = ref({
  github: false,
  google: false,
  microsoft: false
})

const hasOAuthProviders = computed(() => {
  return oauthProviders.value.github || oauthProviders.value.google || oauthProviders.value.microsoft
})

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
    error.value = result.error || t('auth.loginError')
  }
}

const handleRegister = async () => {
  error.value = ''

  // Double-check if registration is still enabled
  if (!userRegistrationEnabled.value) {
    error.value = t('auth.userRegistrationDisabled')
    return
  }

  const result = await authStore.register(registerForm.email, registerForm.password, registerForm.name)
  console.log('Registration result:', result)
  if (result.success) {
    await navigateTo('/')
  } else {
    error.value = result.error || t('auth.registrationFailed')
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

// Check which OAuth providers are configured
const checkOAuthProviders = async () => {
  try {
    const response = await $fetch('/api/public/oauth/providers')
    oauthProviders.value = response
  } catch (error) {
    console.info('Failed to check OAuth providers, assuming none configured')
  }
}

// OAuth login handler
const loginWithOAuth = (provider) => {
  // Redirect to OAuth callback endpoint
  // nuxt-auth-utils handles the rest automatically
  window.location.href = `/auth/${provider}`
}

// Initialize auth on page load
onMounted(async () => {
  authStore.initializeAuth()
  await loadUserRegistrationSetting()
  await checkOAuthProviders()
})
</script>
