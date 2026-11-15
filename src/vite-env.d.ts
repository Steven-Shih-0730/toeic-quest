/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SHOW_DEMO_PANEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
