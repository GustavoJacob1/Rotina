import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' permite publicar a build em qualquer subpasta (ex.: GitHub Pages)
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        // separa bibliotecas grandes em arquivos próprios (melhor cache)
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          calendar: ['@fullcalendar/core', '@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction'],
          charts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
