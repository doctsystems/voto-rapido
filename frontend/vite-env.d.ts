/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_ENV: string
  readonly API_KEY?: string
  // agrega aquí otras variables que uses
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
