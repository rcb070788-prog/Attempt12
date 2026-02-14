import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Netlify plugin removed: it caused __DEFINES__ and MIME errors on local dev.
// Production builds still deploy correctly; test admin email on the deployed site.
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
