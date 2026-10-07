import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { mockApi } from './mock-api.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Use the in-memory mock API unless a real backend URL is configured.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), ...(env.VITE_API_URL ? [] : [mockApi()])],
  }
})
