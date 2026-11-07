import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mockApi } from './mock-api.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // `npm run dev` serves the mock API as middleware. `npm run dev:prod` (`vite --mode prod`) leaves it off,
  // and createApi() in src/api.ts sends requests to Flask instead.
  plugins: [react(), ...(mode === 'prod' ? [] : [mockApi()])],
}))
