import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Use 127.0.0.1 so the dev server is reachable on all Windows setups
    host: '127.0.0.1',
    port: 5173,
    // Forward /api/* requests to the FastAPI backend during development.
    // The browser only talks to 5173, so no CORS changes are needed yet.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
