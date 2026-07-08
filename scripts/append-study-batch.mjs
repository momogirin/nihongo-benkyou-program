// Appends a batch of {kanjiId, etymology} entries to data/study-{level}.json,
// auto-filling radicalNumber from the cached KANJIDIC2 data (data/cache/kanjidic2-parsed.json).
// Usage: node scripts/append-study-batch.mjs <level> <batch-file.json>
// batch-file.json: [{"kanjiId": "N4-1", "etymology": "..."}, ...]
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const [, , level, batchFile] = process.argv
if (!level || !batchFile) {
  console.error('Usage: node scripts/append-study-batch.mjs <level> <batch-file.json>')
  process.exit(1)
}

const kanjiList = JSON.parse(await readFile(resolve(root, 'data/kanji.json'), 'utf-8'))
const kanjidic2 = JSON.parse(await readFile(resolve(root, 'data/cache/kanjidic2-parsed.json'), 'utf-8'))
const radicalByLiteral = Object.fromEntries(kanjidic2.map((k) => [k.literal, k.radicalNumber]))
const kanjiById = Object.fromEntries(kanjiList.map((k) => [k.id, k]))

const batch = JSON.parse(await readFile(resolve(root, batchFile), 'utf-8'))

const outPath = resolve(root, `data/study-${level.toLowerCase()}.json`)
let existing = []
try {
  existing = JSON.parse(await readFile(outPath, 'utf-8'))
} catch {
  // file doesn't exist yet for this level
}
const existingIds = new Set(existing.map((e) => e.kanjiId))

const newEntries = []
for (const { kanjiId, etymology } of batch) {
  const kanji = kanjiById[kanjiId]
  if (!kanji) {
    console.error(`unknown kanjiId: ${kanjiId}`)
    process.exit(1)
  }
  const radicalNumber = radicalByLiteral[kanji.kanji]
  if (typeof radicalNumber !== 'number') {
    console.error(`no radicalNumber found for ${kanjiId} (${kanji.kanji})`)
    process.exit(1)
  }
  if (existingIds.has(kanjiId)) {
    console.error(`duplicate kanjiId already in ${outPath}: ${kanjiId}`)
    process.exit(1)
  }
  newEntries.push({ kanjiId, radicalNumber, etymology })
}

const merged = existing.concat(newEntries)
await writeFile(outPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8')
console.log(`wrote ${merged.length} total entries (added ${newEntries.length}) to data/study-${level.toLowerCase()}.json`)
