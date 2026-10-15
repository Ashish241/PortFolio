import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  define: { "import.meta.env.VITE_SPIDEY_DIAGNOSTICS": JSON.stringify(loadEnv("production", ".", "").VERCEL_ENV === "preview" ? "enabled" : "disabled") },
  plugins: [react()],
  resolve: { preserveSymlinks: true },
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
  build: {
    rollupOptions: {
      output: { manualChunks: { react: ["react", "react-dom"] } },
    },
  },
});
