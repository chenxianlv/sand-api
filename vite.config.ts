import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import pkg from "./package.json";

const external = [
  ...Object.keys((pkg as any)?.dependencies ?? {}),
  ...Object.keys((pkg as any)?.peerDependencies ?? {}),
];

export default defineConfig({
  build: {
    outDir: "dist",
    target: "esnext",
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external,
    },
  },
  plugins: [dts()],
});
