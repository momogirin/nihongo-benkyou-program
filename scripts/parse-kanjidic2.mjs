// Parses data-source/japanese/kanjidic2.xml into a slim JSON cache
// (literal, radicalNumber, onJp, kunJp) for diffing against data/*.json.
// Read-only: does not touch data/kanji.json or data/study-n5.json.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const source = resolve(root, 'data-source/japanese/kanjidic2.xml')
const outDir = resolve(root, 'data/cache')
const out = resolve(outDir, 'kanjidic2-parsed.json')

const xml = await readFile(source, 'utf-8')

// KANJIDIC2 has no custom XML entities, so a per-<character> block regex
// scan is enough — no need for a full XML parser dependency.
function normalizeReading(raw) {
  const bound = raw.startsWith('-') || raw.endsWith('-')
  const stripped = raw.replace(/^-|-$/g, '')
  const stem = stripped.split('.')[0]
  return { raw, stem, bound }
}

const characterBlocks = xml.match(/<character>[\s\S]*?<\/character>/g) ?? []
const entries = []

for (const block of characterBlocks) {
  const literal = block.match(/<literal>(.+?)<\/literal>/)?.[1]
  if (!literal) continue

  const radicalNumber = Number(
    block.match(/<rad_value rad_type="classical">(\d+)<\/rad_value>/)?.[1] ?? NaN
  )

  const onReadings = [...block.matchAll(/<reading r_type="ja_on">(.+?)<\/reading>/g)].map(
    (m) => normalizeReading(m[1])
  )
  const kunReadings = [...block.matchAll(/<reading r_type="ja_kun">(.+?)<\/reading>/g)].map(
    (m) => normalizeReading(m[1])
  )

  const dedupStems = (readings) => [...new Set(readings.map((r) => r.stem))].join('・')

  entries.push({
    literal,
    radicalNumber: Number.isNaN(radicalNumber) ? null : radicalNumber,
    onJp: dedupStems(onReadings),
    kunJpAll: dedupStems(kunReadings),
    kunJpFreeOnly: dedupStems(kunReadings.filter((r) => !r.bound)),
  })
}

await mkdir(outDir, { recursive: true })
await writeFile(out, JSON.stringify(entries, null, 2), 'utf-8')
console.log(`parsed ${entries.length} characters -> data/cache/kanjidic2-parsed.json`)
