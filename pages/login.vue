<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-950 dark:text-white">
          Sign in to your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-300" v-if="userRegistrationEnabled">
          Or
          <button 
            @click="isLoginMode = false"
            class="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
            type="button"
          >
            create a new account
          </button>
        </p>
      </div>
      
      <!-- Login Form -->
      <form v-if="isLoginMode" class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="email" class="sr-only">Email or username</label>
            <input
              id="email"
              v-model="loginForm.email"
              name="email"
              type="text"
              autocomplete="email"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-950 dark:text-white bg-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Email or username"
            >
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              v-model="loginForm.password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-950 dark:text-white bg-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Password"
            >
          </div>
        </div>

        <div v-if="error" class="text-red-600 dark:text-red-400 text-sm text-center">
          {{ error }}
        </div>

        <div>
          <button
            type="submit"
            :disabled="authStore.isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="authStore.isLoading">Signing in...</span>
            <span v-else>Sign in</span>
          </button>
        </div>
      </form>

      <!-- Register Form -->
      <form v-if="!isLoginMode && userRegistrationEnabled" class="mt-8 space-y-6" @submit.prevent="handleRegister">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="name" class="sr-only">Full name</label>
            <input
              id="name"
              v-model="registerForm.name"
              name="name"
              type="text"
              autocomplete="name"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-950 dark:text-white bg-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Full name"
            >
          </div>
          <div>
            <label for="register-email" class="sr-only">Email address</label>
            <input
              id="register-email"
              v-model="registerForm.email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-950 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
            >
          </div>
          <div>
            <label for="register-password" class="sr-only">Password</label>
            <input
              id="register-password"
              v-model="registerForm.password"
              name="password"
              type="password"
              autocomplete="new-password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-950 dark:text-white bg-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Password"
            >
          </div>
        </div>

        <div v-if="error" class="text-red-600 dark:text-red-400 text-sm text-center">
          {{ error }}
        </div>

        <div>
          <button
            type="submit"
            :disabled="authStore.isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="authStore.isLoading">Creating account...</span>
            <span v-else>Create account</span>
          </button>
        </div>

        <div class="text-center" v-if="userRegistrationEnabled">
          <button 
            @click="isLoginMode = true"
            class="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
            type="button"
          >
            Already have an account? Sign in
          </button>
        </div>
      </form>

      <!-- Demo Credentials -->
      <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-md">
        <p class="text-sm text-blue-700 dark:text-blue-300 font-medium">Demo Credentials:</p>
        <p class="text-sm text-blue-600 dark:text-blue-400">Email: admin@example.com</p>
        <p class="text-sm text-blue-600 dark:text-blue-400">Password: password</p>
      </div>
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
    logger.info('User registration setting not found, defaulting to disabled')
    userRegistrationEnabled.value = false
  }
}

// Initialize auth on page load
onMounted(async () => {
  authStore.initializeAuth()
  await loadUserRegistrationSetting()
})
</script>