import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // MapLibre 6 loads a sibling worker module that Vite's dep optimizer can drop.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  server: { port: 5173 },
});
