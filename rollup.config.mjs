import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";

export default defineConfig({
  input: "./src/server/index.ts",
  output: {
    dir: "dist",
    format: "esm",
    sourcemap: true,
    minifyInternal: true,
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
    }),
  ],
});
