import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/Release_Module/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7071',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // Enable source maps for production debugging (optional — remove if not needed)
    sourcemap: false,
    // Split vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/canvas-confetti')) {
            return 'animation-vendor';
          }
        },
      },
    },
    // Increase chunk warning limit (Lottie player is large)
    chunkSizeWarningLimit: 600,
  },
})
