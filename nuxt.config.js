// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' }
      ]
    }
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
    'nuxt-monaco-editor',
    'nuxt-auth-utils'
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