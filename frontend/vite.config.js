import { defineConfig, loadEnv } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, frontendRoot, "");
  const apiUrl = process.env.VITE_API_URL || env.VITE_API_URL;

  if (mode === "production") {
    let parsedApiUrl;
    try {
      parsedApiUrl = new URL(apiUrl);
    } catch {
      throw new Error(
        "Set VITE_API_URL to the deployed backend URL ending in /api before building the frontend.",
      );
    }
    if (
      parsedApiUrl.protocol !== "https:" ||
      /^(localhost|127\.0\.0\.1)$/i.test(parsedApiUrl.hostname) ||
      !parsedApiUrl.pathname.replace(/\/+$/, "").endsWith("/api")
    ) {
      throw new Error(
        "Production VITE_API_URL must be an HTTPS backend URL ending in /api.",
      );
    }
  }

  return {
    root: frontendRoot,
    envDir: frontendRoot,
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
  };
});
