import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Accept connections from external hosts (needed when tunneling via ngrok)
    host: true,
    // Allow the specific ngrok host to access the dev server
    allowedHosts: [
      'preaxially-nonvitalized-billy.ngrok-free.dev', // optional but harmless
      'your-frontend.ngrok-free.app',                  // add your actual frontend ngrok domain here
    ],
    // Optional: if you need to force a specific port
    port: 5173,
    // Proxy Socket.io requests to the local signaling server so you need ONLY one ngrok (frontend)
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
