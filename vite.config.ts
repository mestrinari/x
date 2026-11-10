import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.API_PROXY_TARGET || env.VITE_API_URL || 'http://localhost:5081';
  const proxy = {
    '/api': { target: proxyTarget, changeOrigin: true, secure: false, ws: true },
    '/hub': { target: proxyTarget, changeOrigin: true, secure: false, ws: true },
  };
  return {
    plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
    server: { port: 8443, host: true, proxy },
    preview: { port: 8443, host: true, proxy },
  };
})

  