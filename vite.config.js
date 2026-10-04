import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    // The client calls the API at a relative "/api" path, so in dev the request
    // stays on the Vite origin and is proxied to Express. That keeps it
    // same-origin, which means no CORS preflight and no way for a missing
    // Access-Control-Allow-Origin header to block document loading.
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
