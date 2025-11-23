import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "extension",
  entrypointsDir: "entrypoints",
  publicDir: "extension/public",
  outDir: ".output",
  manifest: {
    name: "Cal.com Companion",
    version: "1.7.0",
    description: "Your calendar companion for quick booking and scheduling",
    permissions: ["activeTab", "storage"],
    host_permissions: [
      "http://localhost:8081/*",
      "https://api.cal.com/*",
      "https://mail.google.com/*",
    ],
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'self'; frame-src 'self' http://localhost:8081;",
    },
    action: {
      default_title: "Cal.com Companion",
      default_icon: {
        "16": "icon-16.png",
        "48": "icon-48.png",
        "128": "icon-128.png",
      },
    },
    icons: {
      "16": "icon-16.png",
      "48": "icon-48.png",
      "128": "icon-128.png",
    },
  },
  vite: () => ({
    resolve: {
      alias: {
        "react-native": "react-native-web",
      },
    },
    define: {
      global: "globalThis",
      __DEV__: JSON.stringify(false),
      // Expose EXPO_PUBLIC_CAL_API_KEY to the extension
      "import.meta.env.EXPO_PUBLIC_CAL_API_KEY": JSON.stringify(
        process.env.EXPO_PUBLIC_CAL_API_KEY
      ),
    },
    optimizeDeps: {
      include: ["react-native-web"],
      esbuildOptions: {
        loader: {
          ".js": "jsx",
        },
      },
    },
  }),
});
