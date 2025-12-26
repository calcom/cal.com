/// <reference types="wxt/vite" />

interface ImportMetaEnv {
  readonly EXPO_PUBLIC_CAL_API_KEY?: string;
  readonly EXPO_PUBLIC_COMPANION_DEV_URL?: string;

  // Default OAuth config (Chrome/Brave)
  readonly EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID?: string;
  readonly EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI?: string;

  // Firefox-specific OAuth config
  readonly EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_FIREFOX?: string;
  readonly EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_FIREFOX?: string;

  // Safari-specific OAuth config
  readonly EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_SAFARI?: string;
  readonly EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_SAFARI?: string;

  // Edge-specific OAuth config
  readonly EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID_EDGE?: string;
  readonly EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI_EDGE?: string;

  // Browser target set during build
  readonly BROWSER_TARGET?: "chrome" | "firefox" | "safari" | "edge";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
