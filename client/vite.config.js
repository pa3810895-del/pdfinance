import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('lucide')) return 'vendor-icons';
            if (id.includes('react')) return 'vendor-react';
            return 'vendor'; // El resto de las librerías
          }
        }
      }
    },
    // Subimos un poquito el límite de advertencia para que no moleste con cosas pequeñas
    chunkSizeWarningLimit: 600 
  }
})
