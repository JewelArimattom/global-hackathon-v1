import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env': {}
  },
  server: {
    proxy: {
      // This setting tells Vite to forward any request that starts with '/api'
      // to your backend server running on http://localhost:5000
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true, // Recommended for virtual hosts
        secure: false,      // Recommended for development with http
      },
    }
  }
})
