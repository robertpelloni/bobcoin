import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

const versionPath = path.resolve(__dirname, '../VERSION.md')
const version = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, 'utf-8').trim() : 'Unknown'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from the monorepo root
  const env = loadEnv(mode, path.resolve(__dirname, '../'), '')
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'Lattice Arcade Sovereign Wallet',
          short_name: 'Lattice Arcade',
          description: 'The native Asynchronous Block Lattice wallet and decentralized storage oracle.',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          icons: [
            {
              src: 'vite.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'vite.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      '__APP_VERSION__': JSON.stringify(version)
    },
    server: {
      port: parseInt(env.FRONTEND_PORT) || 5173
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('node-seal')) return 'vendor-seal'
            if (id.includes('@react-three') || id.includes('/three/')) return 'vendor-three'
            if (id.includes('react-router-dom')) return 'vendor-router'
            if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react'
            if (id.includes('tweetnacl') || id.includes('bs58')) return 'vendor-crypto'
          }
        }
      }
    }
  }
})
