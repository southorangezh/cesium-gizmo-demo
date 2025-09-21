import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 4173,
    host: "0.0.0.0"
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        main: "index.html"
      }
    }
  }
});
