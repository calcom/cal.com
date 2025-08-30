/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly EMBED_PUBLIC_WEBAPP_URL: string;
  readonly EMBED_PUBLIC_VERCEL_URL: string;
  readonly EMBED_PUBLIC_EMBED_LIB_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
