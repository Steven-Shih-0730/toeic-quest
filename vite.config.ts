import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // host: true 讓同一個區網的手機可以連進來測試
  server: { host: true },
  // supabase-js 讓主程式超過預設 500 kB 提醒門檻；demo 不拆分，調高門檻即可
  build: { chunkSizeWarningLimit: 700 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
