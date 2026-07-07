// Diffs data/kanji.json (onJp/kunJp) and data/study-n5.json (radicalNumber)
// against the KANJIDIC2 cache built by parse-kanjidic2.mjs.
// Read-only: prints a summary + samples, writes nothing.
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const kanji = JSON.parse(await readFile(resolve(root, 'data/kanji.json'), 'utf-8'))
const studyN5 = JSON.parse(await readFile(resolve(root, 'data/study-n5.json'), 'utf-8'))
const kanjidic2 = JSON.parse(
  await readFile(resolve(root, 'data/cache/kanjidic2-parsed.json'), 'utf-8')
)
const byLiteral = new Map(kanjidic2.map((e) => [e.literal, e]))

const SAMPLE_LIMIT = 15

function report(label, total, mismatches) {
  console.log(`\n=== ${label} ===`)
  console.log(`total: ${total}, match: ${total - mismatches.length}, mismatch: ${mismatches.length}`)
  for (const m of mismatches.slice(0, SAMPLE_LIMIT)) console.log(`  ${m}`)
  if (mismatches.length > SAMPLE_LIMIT) console.log(`  ... and ${mismatches.length - SAMPLE_LIMIT} more`)
}

const notFound = []
const onJpMismatch = []
const kunJpAllMismatch = []
const kunJpFreeOnlyMismatch = []

for (const k of kanji) {
  const ref = byLiteral.get(k.kanji)
  if (!ref) {
    notFound.push(k.kanji)
    continue
  }
  if (k.onJp !== ref.onJp) onJpMismatch.push(`${k.kanji}: "${k.onJp}" vs "${ref.onJp}"`)
  if (k.kunJp !== ref.kunJpAll) kunJpAllMismatch.push(`${k.kanji}: "${k.kunJp}" vs "${ref.kunJpAll}"`)
  if (k.kunJp !== ref.kunJpFreeOnly)
    kunJpFreeOnlyMismatch.push(`${k.kanji}: "${k.kunJp}" vs "${ref.kunJpFreeOnly}"`)
}

console.log(`data/kanji.json entries: ${kanji.length}, not found in kanjidic2: ${notFound.length}`)
if (notFound.length) console.log(`  ${notFound.slice(0, SAMPLE_LIMIT).join(' ')}`)

report('onJp (kanji.json vs kanjidic2)', kanji.length - notFound.length, onJpMismatch)
report('kunJp vs kunJpAll (모든 훈독)', kanji.length - notFound.length, kunJpAllMismatch)
report('kunJp vs kunJpFreeOnly (독립형 훈독만)', kanji.length - notFound.length, kunJpFreeOnlyMismatch)

// radicalNumber: study-n5.json (kanjiId) -> kanji.json (kanji.id -> literal) -> kanjidic2
const kanjiById = new Map(kanji.map((k) => [k.id, k.kanji]))
const radicalMismatch = []
let radicalChecked = 0
let radicalNotFound = 0

for (const s of studyN5) {
  const literal = kanjiById.get(s.kanjiId)
  const ref = literal ? byLiteral.get(literal) : undefined
  if (!ref) {
    radicalNotFound++
    continue
  }
  radicalChecked++
  if (s.radicalNumber !== ref.radicalNumber)
    radicalMismatch.push(`${literal} (${s.kanjiId}): ${s.radicalNumber} vs ${ref.radicalNumber}`)
}

console.log(`\nstudy-n5.json entries: ${studyN5.length}, not matched to kanjidic2: ${radicalNotFound}`)
report('radicalNumber (study-n5.json vs kanjidic2)', radicalChecked, radicalMismatch)
