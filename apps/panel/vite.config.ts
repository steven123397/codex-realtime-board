import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@codex-realtime-board/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
    }
  }
});
