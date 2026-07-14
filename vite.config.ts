import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base must match the GitHub Pages repo name (https://<user>.github.io/<repo>/)
// — 2026-07-14 "모모링고" 개명에 맞춰 리포지토리 이름도 momolingo로 바꿀
// 예정이라 여기 미리 맞춰뒀음. GitHub에서 실제 리포지토리 이름을 바꾸기
// 전까지는 배포 URL이 이 값과 달라서 GitHub Pages가 깨진 화면(빈 페이지)을
// 보여줄 수 있음 — 리포지토리 이름을 정확히 이 문자열로 바꾼 뒤에 배포할 것.
export default defineConfig({
  base: '/momolingo/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '모모링고',
        short_name: '모모링고',
        description: 'JLPT·TOEIC 등 시험 준비를 위한 다국어 학습 앱',
        lang: 'ko',
        start_url: '.',
        display: 'standalone',
        background_color: '#F5F5F7',
        theme_color: '#0577C2',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
})
