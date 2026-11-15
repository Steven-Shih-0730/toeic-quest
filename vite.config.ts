import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // PWA（CLAUDE.md 第 7 節）：可安裝到主畫面，離線可玩單人模式
    VitePWA({
      registerType: 'autoUpdate', // 新版部署後自動更新，不跳詢問
      injectRegister: 'auto',
      includeAssets: ['icons/apple-touch-icon-180.png'],
      manifest: {
        name: '多益打怪 TOEIC Quest',
        short_name: '多益打怪',
        description: '把答錯的題目、快忘的單字，變成每天 5 分鐘的闖關遊戲。作者：施定宇 (Steven Shih)',
        lang: 'zh-Hant',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0f1b3d',
        background_color: '#0f1b3d',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 程式、樣式、圖示全部預先快取，離線也能打開
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        // 主程式約 500 kB，在 Workbox 預設的單檔 2 MB 上限內；放寬到 3 MB 預留空間
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            // Google Fonts：樣式表與字型檔都 cache-first，離線時沿用快取
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false }, // 開發模式不啟用 service worker
    }),
  ],
  // host: true 讓同一個區網的手機可以連進來測試
  server: { host: true },
  // supabase-js 讓主程式超過預設 500 kB 提醒門檻；demo 不拆分，調高門檻即可
  build: { chunkSizeWarningLimit: 700 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
