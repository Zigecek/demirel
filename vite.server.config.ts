import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "./src/server/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    minify: true,
    sourcemap: true,
    rollupOptions: {
      external: ["fsevents", "mqtt"],
    },
  },
});
