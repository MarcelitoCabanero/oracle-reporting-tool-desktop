/// <reference types="vite/client" />
/// <reference path="../../src/types/electron.d.ts" />

interface ImportMetaEnv {
  readonly VITE_AUTH_MODE?: 'mock' | 'backend'
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
