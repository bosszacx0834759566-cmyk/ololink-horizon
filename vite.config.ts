// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

// The dev devtools plugin injects `data-tsd-source` attributes into every JSX
// element. react-three-fiber treats dashed props as nested three.js property
// paths and throws on them, so strip the attribute from 3D scene modules.
function stripSourceTagsFromR3F(): Plugin {
  return {
    name: "strip-tsd-source-r3f",
    enforce: "post",
    transform(code, id) {
      if (!/src\/components\/mission\/Globe3D\.tsx/.test(id)) return null;
      if (!code.includes("data-tsd-source")) return null;
      return {
        code: code.replace(/"data-tsd-source":\s*"[^"]*",?/g, ""),
        map: null,
      };
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [stripSourceTagsFromR3F()],
  },
});
