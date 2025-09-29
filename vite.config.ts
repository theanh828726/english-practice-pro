import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // FIX: Replace process.cwd() with a relative path to avoid TypeScript type errors
  // in environments where Node.js 'process' types might not be fully available.
  const env = loadEnv(mode, './', '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})
