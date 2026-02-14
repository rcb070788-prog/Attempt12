import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import netlify from '@netlify/vite-plugin';

// Netlify plugin required for production deploys. Applied only during build to avoid dev-server interference (__DEFINES__/MIME errors).
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    { ...netlify(), apply: 'build' },
  ],
  server: {
    host: '0.0.0.0', // Allow access from network devices (mobile)
    port: 5173, // Default Vite port
    strictPort: false, // Try next available port if 5173 is taken
  },
});
