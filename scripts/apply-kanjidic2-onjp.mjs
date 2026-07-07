// Replaces data/kanji.json's onJp field with the KANJIDIC2-derived value
// from data/cache/kanjidic2-parsed.json (built by parse-kanjidic2.mjs).
// kunJp/radicalNumber are intentionally left untouched — see
// data/cache/kanjidic2-parsed.json's diff (scripts/diff-kanjidic2.mjs) for why.
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const kanjiPath = resolve(root, 'data/kanji.json')

const kanji = JSON.parse(await readFile(kanjiPath, 'utf-8'))
const kanjidic2 = JSON.parse(
  await readFile(resolve(root, 'data/cache/kanjidic2-parsed.json'), 'utf-8')
)
const byLiteral = new Map(kanjidic2.map((e) => [e.literal, e]))

let changed = 0
for (const k of kanji) {
  const ref = byLiteral.get(k.kanji)
  if (ref && k.onJp !== ref.onJp) {
    k.onJp = ref.onJp
    changed++
  }
}

await writeFile(kanjiPath, JSON.stringify(kanji, null, 2) + '\n', 'utf-8')
console.log(`updated onJp for ${changed} / ${kanji.length} entries in data/kanji.json`)
