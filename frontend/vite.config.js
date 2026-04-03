import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const versionPath = path.resolve(__dirname, '../VERSION.md')
const version = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, 'utf-8').trim() : 'Unknown'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from the monorepo root
  const env = loadEnv(mode, path.resolve(__dirname, '../'), '')
  return {
    plugins: [react()],
    define: {
      '__APP_VERSION__': JSON.stringify(version)
    },
    server: {
      port: parseInt(env.FRONTEND_PORT) || 5173
    }
  }
})