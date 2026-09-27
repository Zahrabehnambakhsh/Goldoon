import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

// Deploy target. Defaults to a plain Node.js server (`node .output/server/index.mjs`).
// Override with NITRO_PRESET, e.g. NITRO_PRESET=vercel or NITRO_PRESET=cloudflare-module.
const preset = process.env.NITRO_PRESET || "node-server";

export default defineConfig({
  server: { host: "::", port: 8080 },
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // src/server.ts wraps the bundled server entry with SSR error handling.
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    nitro({ preset }),
    viteReact(),
  ],
});
