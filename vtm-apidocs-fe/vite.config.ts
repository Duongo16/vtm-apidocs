// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/admin": { target: "http://localhost:8081", changeOrigin: true },
      "/api": { target: "http://localhost:8081", changeOrigin: true },
    },
  },
});
