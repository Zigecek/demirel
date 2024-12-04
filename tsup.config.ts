import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/server/index.ts"],
  format: ["esm"],
  outDir: "dist",
  minify: true,
  splitting: true,
  sourcemap: true,
  platform: "neutral",
});
