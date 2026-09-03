import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Allow intranet domain and reverse proxy hosts
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Always ignore database files to prevent writes from triggering client page reloads or server restarts.
      watch: {
        ignored: [
          '**/ssi_db.json',
          '**/ssi_db.json.tmp',
          '**/node_modules/**',
          '**/dist/**'
        ]
      },
    },
  };
});
