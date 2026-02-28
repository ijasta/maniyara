import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'router':     ['react-router-dom'],
          'supabase':   ['@supabase/supabase-js'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
  }
})
