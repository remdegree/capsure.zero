import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        react: resolve(__dirname, "src/react.ts")
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => {
        if (format === "es") {
          return `${entryName}.js`;
        }

        return `${entryName}.cjs`;
      }
    },

    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ]
    },

    emptyOutDir: true
  }
});