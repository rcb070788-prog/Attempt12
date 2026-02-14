import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import netlify from '@netlify/vite-plugin';

// Netlify plugin required for production deploys. For local dev, use npm run dev (may have plugin issues).
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), netlify()],
  define: {
    'process.env.SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  },
  server: {
    host: '0.0.0.0', // Allow access from network devices (mobile)
    port: 5173, // Default Vite port
    strictPort: false, // Try next available port if 5173 is taken
  },
});
