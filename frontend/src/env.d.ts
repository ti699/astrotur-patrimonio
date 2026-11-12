/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HUB_URL?: string;
  readonly VITE_HUB_SSO_URL?: string;
  readonly VITE_HUB_LOGIN_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
