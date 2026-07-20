/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ENABLE_OFFLINE_SYNC?: 'true' | 'false';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
