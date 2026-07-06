import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base must match the GitHub Pages repo name (https://<user>.github.io/<repo>/)
export default defineConfig({
  base: '/nihongo-benkyou-program/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '한자 학습',
        short_name: '한자 학습',
        description: 'JLPT N5-N3 한자·부수 학습 앱',
        lang: 'ko',
        start_url: '.',
        display: 'standalone',
        background_color: '#FAF8F3',
        theme_color: '#B24F1E',
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
      },
    }),
  ],
})
