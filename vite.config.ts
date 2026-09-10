import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/.netlify/functions/news': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        // When netlify-cli isn't running, fall through — client handles empty news
        bypass() {
          return undefined
        },
      },
    },
  },
})
