import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// BASE_PATH lets the same build serve from a sub-path, e.g. GitHub Pages project sites.
export default defineConfig({
  base: (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.BASE_PATH || "/",
  plugins: [react(), tailwindcss()],
  server: { host: "127.0.0.1", port: 5173 },
});
