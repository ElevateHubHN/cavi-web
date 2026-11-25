import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// nginx sirve el build en /panel/ y pasa /api al backend; en desarrollo el proxy hace lo mismo.
export default defineConfig({
  base: '/panel/',
  plugins: [react()],
  server: {
    port: 3252,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3250', changeOrigin: true },
    },
  },
});
