import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching irrelevant/large directories
      ignored: [
        "**/src-tauri/**",
        "**/node_modules/**",
        "**/dist/**",
        "**/.git/**",
        "**/proposal/**",
        "**/temp/**",
        "**/tests/**",
        "**/.agents/**"
      ],
    },
  },
  optimizeDeps: {
    include: ["lucide-react", "react", "react-dom", "@tauri-apps/api/core"],
    // Fix: prevent Vite from scanning thousands of Rust doc HTML files in src-tauri/target
    entries: ["index.html"],
  },
}));
