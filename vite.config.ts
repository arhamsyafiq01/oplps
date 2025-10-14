import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";
import manifestJson from "./public/manifest.json";
import type { ManifestOptions } from "vite-plugin-pwa";
//import fs from "fs";

export default defineConfig({
  plugins: [
    react(),
    svgr(),
    VitePWA({
      registerType: "autoUpdate", // Automatically updates service worker
      manifest: manifestJson as Partial<ManifestOptions>,
      includeAssets: [
        "favicon.svg",
        "robots.txt",
        "Icon-192.png",
        "Icon-512.png",
        "screenshot-dekstop-1.png",
        "screenshot-mobile-1.png",
      ],
      workbox: {
        navigateFallback: "index.html", // important for client-side routing
      },
    }),
  ],
  server: {
    allowedHosts: true,
  },
  base: "/",
  define: {
    "process.env": {
      REACT_APP_API_URL: JSON.stringify(process.env.REACT_APP_API_URL),
    },
  },
});
