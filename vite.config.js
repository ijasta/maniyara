export default defineConfig({
  plugins: [react()],
  build: {
    // Split chunks so initial load is smaller
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'router':     ['react-router-dom'],
          'supabase':   ['@supabase/supabase-js'],
        }
      }
    },
    // Compress output
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // remove console.log in production
        drop_debugger: true,
      }
    },
    // Smaller chunk warning limit
    chunkSizeWarningLimit: 600,
  },
  // Faster dev server
  server: {
    hmr: { overlay: true }
  }
})
