import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // Faster builds, smaller output
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'router':     ['react-router-dom'],
          'supabase':   ['@supabase/supabase-js'],
        }
      }
    }
  },

  // Faster dev server
  server: {
    hmr: true,
  },

  // Pre-bundle dependencies for faster loads
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js']
  }
})
