import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    // ENOSPC (inotify limit) — polling; ARGOS_VITE_POLL=0 ile native watch
    watch: {
      usePolling: process.env.ARGOS_VITE_POLL !== "0",
      interval: 1000,
      ignored: ["**/node_modules/**", "**/.git/**", "**/.venv/**", "**/dist/**"],
    },
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/ws": { target: "ws://localhost:8000", ws: true },
    },
  },
});
