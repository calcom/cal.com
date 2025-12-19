/// <reference types="wxt/vite" />

interface ImportMetaEnv {
  readonly EXPO_PUBLIC_CAL_API_KEY?: string;
  readonly EXPO_PUBLIC_COMPANION_DEV_URL?: string;
  readonly EXPO_PUBLIC_CALCOM_OAUTH_CLIENT_ID?: string;
  readonly EXPO_PUBLIC_CALCOM_OAUTH_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
