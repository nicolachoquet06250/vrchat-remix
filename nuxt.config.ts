import vue from '@vitejs/plugin-vue'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@vite-pwa/nuxt', (_, nuxt) => {
    // @ts-ignore
    nuxt.hook('pwa:beforeBuildServiceWorker', options => {
      console.log('pwa:beforeBuildServiceWorker: ', options.base)
    })
  }, '@nuxtjs/mdc'],

  // @ts-ignore
  pwa: {
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    // @ts-ignore
    offlineReady: true,
    devOptions: {
      enabled: true
    },
    workbox: {
      clientsClaim: true,
      skipWaiting: true,
      globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      cleanupOutdatedCaches: true,
      sourcemap: true,
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api',
            networkTimeoutSeconds: 3,
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 },
          },
        },
        {
          urlPattern: ({ request }) => request.destination === 'image',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'images',
            expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
        {
          urlPattern: ({ url }) => !url.pathname.startsWith('/api/'),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages',
            expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
      ]
    },
    manifest: {
      name: 'VRC Remix',
      short_name: 'VRC R.',
      description: 'équivalent de la fonctionnalité remix de meta pour vrchat',
      theme_color: '#080f19',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      start_url: '/projects',
      display: 'fullscreen',
      lang: 'fr',
      categories: ['community', 'creation', 'vrchat'],
      orientation: 'portrait-primary'
    }
  },

  // Ensure runtime alias resolution aligns with TypeScript paths
  // Map '~/*' to 'src/*' while keeping explicit shortcuts for existing folders
  alias: {
    '#/*': './*',
    '~/*': './*'
  },

  runtimeConfig: {
    // Server-only
    databaseUrl: process.env.DB_CREDENTIALS_URL, // e.g. mysql://user:pass@localhost:3306/vrchat_remix
    jwtSecret: process.env.JWT_SECRET,
    // Token GitHub optionnel (augmente la limite de rate et permet l'accès privé si nécessaire)
    githubToken: process.env.GITHUB_TOKEN
  },

  app: {
    head: {
      meta: [
        {name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'}
      ],
      link: [
        {rel: 'manifest', href: '/manifest.webmanifest'}
      ]
    }
  },

  nitro: {
    rollupConfig: {
      plugins: [vue()]
    },

    routeRules: {
      '/manifest.webmanifest': {
        static: true
      }
    }
  }
})