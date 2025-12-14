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
    permissions: ["activeTab", "storage", "identity"],
    host_permissions: [
      "https://companion.cal.com/*",
      "https://api.cal.com/*",
      "https://app.cal.com/*",
      "https://mail.google.com/*",
    ],
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'self'; frame-src 'self' https://companion.cal.com",
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
      // Expose environment variables to the extension
      "import.meta.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID": JSON.stringify(
        process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID
      ),
      "import.meta.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI": JSON.stringify(
        process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI
      ),
      // Cache configuration environment variables
      "import.meta.env.EXPO_PUBLIC_CACHE_STALE_TIME_MINUTES": JSON.stringify(
        process.env.EXPO_PUBLIC_CACHE_STALE_TIME_MINUTES
      ),
      "import.meta.env.EXPO_PUBLIC_CACHE_GC_TIME_MINUTES": JSON.stringify(
        process.env.EXPO_PUBLIC_CACHE_GC_TIME_MINUTES
      ),
      "import.meta.env.EXPO_PUBLIC_BOOKINGS_CACHE_STALE_TIME_MINUTES": JSON.stringify(
        process.env.EXPO_PUBLIC_BOOKINGS_CACHE_STALE_TIME_MINUTES
      ),
      "import.meta.env.EXPO_PUBLIC_EVENT_TYPES_CACHE_STALE_TIME_MINUTES": JSON.stringify(
        process.env.EXPO_PUBLIC_EVENT_TYPES_CACHE_STALE_TIME_MINUTES
      ),
      "import.meta.env.EXPO_PUBLIC_SCHEDULES_CACHE_STALE_TIME_MINUTES": JSON.stringify(
        process.env.EXPO_PUBLIC_SCHEDULES_CACHE_STALE_TIME_MINUTES
      ),
      "import.meta.env.EXPO_PUBLIC_USER_PROFILE_CACHE_STALE_TIME_MINUTES": JSON.stringify(
        process.env.EXPO_PUBLIC_USER_PROFILE_CACHE_STALE_TIME_MINUTES
      ),
      // DEV ONLY: API Key for testing - only included in development builds
      ...(process.env.NODE_ENV !== "production" && process.env.EXPO_PUBLIC_CAL_API_KEY
        ? {
            "import.meta.env.EXPO_PUBLIC_CAL_API_KEY": JSON.stringify(
              process.env.EXPO_PUBLIC_CAL_API_KEY
            ),
          }
        : {}),
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
