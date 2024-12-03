import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/server/index.ts"], // hlavní vstupní soubor
  format: ["esm"], // formát výstupu
  outDir: "dist", // výstupní složka
  minify: true, // minifikace kódu
  splitting: false, // vypnutí kódu splittingu, pokud není potřeba
  sourcemap: true, // pokud chcete zdrojové mapy
});
