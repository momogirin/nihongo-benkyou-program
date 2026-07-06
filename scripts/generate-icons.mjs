// Rasterizes src/assets/icon-source.svg into the PWA/favicon PNGs under public/.
// Rerun with `npm run icons:generate` whenever icon-source.svg changes.
import { mkdir, copyFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const source = resolve(root, 'src/assets/icon-source.svg')
const outDir = resolve(root, 'public/icons')

const sizes = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'maskable-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon-48x48.png', size: 48 },
]

await mkdir(outDir, { recursive: true })

for (const { file, size } of sizes) {
  await sharp(source, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(resolve(outDir, file))
  console.log('generated', file)
}

await copyFile(source, resolve(root, 'public/favicon.svg'))
console.log('copied favicon.svg')
