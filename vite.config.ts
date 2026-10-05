import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/afgoals/',
  plugins: [react()],
  server: {
    allowedHosts: ['.trycloudflare.com'],
  },
})
