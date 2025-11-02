// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
  },
  // Disable TypeScript
  typescript: {
    typeCheck: false
  },
  imports: {
    dirs: []
  },
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    'nuxt-monaco-editor'
  ],
  icon: {
    provider: 'lucide'
  },
  nitro: {
    experimental: {
      websocket: true
    }
  },
  css: ['~/assets/css/main.css'],
  vite: {
      plugins: [
        tailwindcss()
      ],
      server: {
        https: {
          rejectUnauthorized: false
        }
      }
  },
  runtimeConfig: {
    // Private keys (only available on server-side)
    jwtSecret: 'your-secret-key',
    // Public keys (exposed to client-side)
    public: {
      apiBase: '/api'
    }
  }
})