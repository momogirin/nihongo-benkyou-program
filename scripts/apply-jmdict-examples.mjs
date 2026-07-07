// Fills exampleKanji/exampleJp (only where currently null) from
// data/cache/jmdict-examples.json onto data/kanji.json. exampleKr stays
// null — JMdict only has English glosses, and translating them would be
// exactly the "AI generates the data" pattern this pipeline avoids.
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const kanjiPath = resolve(root, 'data/kanji.json')

const kanji = JSON.parse(await readFile(kanjiPath, 'utf-8'))
const examples = JSON.parse(
  await readFile(resolve(root, 'data/cache/jmdict-examples.json'), 'utf-8')
)

let filled = 0
for (const k of kanji) {
  if (k.exampleKanji) continue
  const candidate = examples[k.kanji]
  if (!candidate) continue
  k.exampleKanji = candidate.exampleKanji
  k.exampleJp = candidate.exampleJp
  filled++
}

await writeFile(kanjiPath, JSON.stringify(kanji, null, 2) + '\n', 'utf-8')
console.log(`filled exampleKanji/exampleJp for ${filled} / ${kanji.length} entries in data/kanji.json`)
