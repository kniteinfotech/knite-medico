import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  base: './',
  build: {
    sourcemap: false, // Prevent code inspection / reverse-engineering
    minify: 'esbuild',
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-core';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide-icons';
          }
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas') || id.includes('node_modules/xlsx')) {
            return 'export-libs';
          }
        }
      }
    }
  },
  esbuild: {
    // Strip console.log and debugger statements in production
    drop: process.env.NODE_ENV === 'production' ? ['debugger'] : []
  }
});
