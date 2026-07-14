import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base must match the GitHub Pages repo name (https://<user>.github.io/<repo>/)
// — "모모링고" 개명에 맞춰 리포지토리 이름도 나중에 momolingo로 바꿀 예정.
// 하지만 리포지토리 이름이 실제로 바뀌기 전까지는 이 값을 절대 먼저 바꾸면
// 안 됨(바꾸면 다음 배포에서 GitHub Pages가 깨진 화면을 보여줌) — 리포지토리
// 이름을 바꾼 "직후" 이 값도 '/momolingo/'로 같이 바꿀 것(HANDOFF.md 참고).
export default defineConfig({
  base: '/nihongo-benkyou-program/',
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
