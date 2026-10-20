// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [VitePWA({
      strategies: "generateSW",
      filename: "sw.js",
      injectRegister: null,
      registerType: "autoUpdate",
      manifest: false,
      devOptions: { enabled: false },
      includeAssets: ["offline.html", "favicon.png", "manifest.webmanifest", "icons/*.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,woff2,png,webp}"],
        cleanupOutdatedCaches: true,
        navigateFallback: "/offline.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/~oauth/, /^\/_server/],
        runtimeCaching: [
          { urlPattern: ({ request, url }) => request.mode === "navigate" && !/^\/(api\/|~oauth|_server)/.test(url.pathname), handler: "NetworkFirst", options: { cacheName: "mca-navigation", networkTimeoutSeconds: 5, expiration: { maxEntries: 12, maxAgeSeconds: 86400 } } },
          { urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/.*[-.][\w-]{8,}\.(js|css|woff2|png|webp)$/.test(url.pathname), handler: "CacheFirst", options: { cacheName: "mca-assets", expiration: { maxEntries: 100, maxAgeSeconds: 2592000 } } },
        ],
      },
    })],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
