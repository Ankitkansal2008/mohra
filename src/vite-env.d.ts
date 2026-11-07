/// <reference types="vite/client" />

declare const __APP_VERSION__: string | undefined;
declare const __BUILD_DATE__: string | undefined;

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
  readonly VITE_UMAMI_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

