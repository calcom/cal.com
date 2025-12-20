import { defineConfig } from "wxt";

// BUILD_FOR_STORE=true is set by ext:build-prod, ext:zip-prod, etc.
// Forces production URL (https://companion.cal.com) and excludes localhost permissions
const isBuildForStore = process.env.BUILD_FOR_STORE === "true";

// BROWSER_TARGET is set during build to determine which OAuth credentials to use
// Values: "chrome" (default), "firefox", "safari", "edge"
const browserTarget = process.env.BROWSER_TARGET || "chrome";

/**
 * Get browser-specific OAuth configuration.
 * Falls back to default (Chrome) config if browser-specific config is not set.
 */
function getOAuthConfig() {
  const defaultClientId = process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID || "";
  const defaultRedirectUri = process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI || "";

  switch (browserTarget) {
    case "firefox":
      return {
        clientId: process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_FIREFOX || defaultClientId,
        redirectUri:
          process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_FIREFOX || defaultRedirectUri,
      };
    case "safari":
      return {
        clientId: process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_SAFARI || defaultClientId,
        redirectUri: process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_SAFARI || defaultRedirectUri,
      };
    case "edge":
      return {
        clientId: process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_EDGE || defaultClientId,
        redirectUri: process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_EDGE || defaultRedirectUri,
      };
    case "chrome":
    default:
      return {
        clientId: defaultClientId,
        redirectUri: defaultRedirectUri,
      };
  }
}

export default defineConfig({
  hooks: {
    "build:manifestGenerated": (_wxt, manifest) => {
      manifest.browser_specific_settings ??= {};
      manifest.browser_specific_settings.gecko ??= {};
      manifest.browser_specific_settings.gecko.data_collection_permissions = {
        required: ["none"],
      };
    },
  },
  srcDir: "extension",
  entrypointsDir: "entrypoints",
  publicDir: "extension/public",
  outDir: ".output",
  manifest: {
    name: "Cal.com Companion",
    version: "1.7.4",
    description: "Your calendar companion for quick booking and scheduling",
    permissions: ["activeTab", "storage", "identity"],
    host_permissions: [
      "https://companion.cal.com/*",
      "https://api.cal.com/*",
      "https://app.cal.com/*",
      "https://mail.google.com/*",
      // Include localhost permission for dev builds (needed for iframe to load)
      ...(!isBuildForStore ? ["http://localhost:*/*"] : []),
    ],
    content_security_policy: {
      extension_pages: !isBuildForStore
        ? "script-src 'self'; object-src 'self'; frame-src 'self' https://companion.cal.com http://localhost:*"
        : "script-src 'self'; object-src 'self'; frame-src 'self' https://companion.cal.com",
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
  vite: () => {
    // Determine companion URL based on build type
    const devUrl = isBuildForStore ? "" : process.env.EXPO_PUBLIC_COMPANION_DEV_URL || "";
    const isLocalDev = Boolean(devUrl && devUrl.includes("localhost"));

    // Get OAuth config for the target browser
    const oauthConfig = getOAuthConfig();

    // Log build mode for clarity
    if (isBuildForStore) {
      console.log("\n🏪 STORE BUILD: Using https://companion.cal.com\n");
    } else if (isLocalDev) {
      console.log(`\n🔧 DEV BUILD: Using ${devUrl}\n`);
    }
    console.log(`🌐 Browser Target: ${browserTarget}\n`);

    return {
      resolve: {
        alias: {
          "react-native": "react-native-web",
        },
      },
      define: {
        global: "globalThis",
        __DEV__: JSON.stringify(false),

        // Browser target for runtime detection
        "import.meta.env.BROWSER_TARGET": JSON.stringify(browserTarget),

        // Default OAuth config (Chrome/Brave) - always available for fallback
        "import.meta.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID": JSON.stringify(
          process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID
        ),
        "import.meta.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI": JSON.stringify(
          process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI
        ),

        // Browser-specific OAuth config (resolved based on BROWSER_TARGET)
        "import.meta.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_FIREFOX": JSON.stringify(
          process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_FIREFOX
        ),
        "import.meta.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_FIREFOX": JSON.stringify(
          process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_FIREFOX
        ),
        "import.meta.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_SAFARI": JSON.stringify(
          process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_SAFARI
        ),
        "import.meta.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_SAFARI": JSON.stringify(
          process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_SAFARI
        ),
        "import.meta.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_EDGE": JSON.stringify(
          process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_EDGE
        ),
        "import.meta.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_EDGE": JSON.stringify(
          process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_EDGE
        ),

        // Pre-resolved OAuth config for the build target (for convenience)
        "process.env.EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID": JSON.stringify(oauthConfig.clientId),
        "process.env.EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI": JSON.stringify(
          oauthConfig.redirectUri
        ),

        // Use devUrl which respects BUILD_FOR_STORE flag
        "import.meta.env.EXPO_PUBLIC_COMPANION_DEV_URL": JSON.stringify(devUrl),
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
    };
  },
});
