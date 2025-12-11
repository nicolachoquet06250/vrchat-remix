// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
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
    // Public (exposed to client)
    public: {}
  }
})
