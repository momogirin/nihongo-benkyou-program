// Scans data-source/japanese/JMdict.xml for the best example word per
// jouyou kanji (data/kanji.json), so exampleKanji/exampleJp can be filled
// for the ~1340 kanji that currently have none. Read-only: writes a cache,
// does not touch data/kanji.json.
//
// "Best" = most common per JMdict's priority tags (ichi1/news1/spec1 >
// gai1 > nfXX, ranked by XX > any other "2"-tier tag > untagged), then
// closest to a 2-character compound (matches the existing curated style,
// e.g. 日 -> 毎日) — single-character "words" (the kanji alone) are excluded.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const source = resolve(root, 'data-source/japanese/JMdict.xml')
const outDir = resolve(root, 'data/cache')
const out = resolve(outDir, 'jmdict-examples.json')

const kanji = JSON.parse(await readFile(resolve(root, 'data/kanji.json'), 'utf-8'))
const kanjiChars = new Set(kanji.map((k) => k.kanji))

function priorityScore(tags) {
  if (tags.some((t) => t === 'ichi1' || t === 'news1' || t === 'spec1')) return 0
  if (tags.includes('gai1')) return 1
  const nf = tags.map((t) => /^nf(\d+)$/.exec(t)?.[1]).filter(Boolean).map(Number)
  if (nf.length) return 2 + Math.min(...nf) / 100
  if (tags.some((t) => /2$/.test(t))) return 3
  return 99
}

console.log('reading JMdict.xml...')
const xml = await readFile(source, 'utf-8')
console.log(`parsing ${(xml.length / 1e6).toFixed(0)}M chars...`)

const bestByChar = new Map()
const entryRe = /<entry>([\s\S]*?)<\/entry>/g
let entryCount = 0
let match
while ((match = entryRe.exec(xml))) {
  entryCount++
  const entry = match[1]
  const keb = entry.match(/<keb>([^<]+)<\/keb>/)?.[1]
  if (!keb || keb.length < 2) continue
  const reb = entry.match(/<reb>([^<]+)<\/reb>/)?.[1]
  if (!reb) continue
  const tags = [...entry.matchAll(/<(?:ke_pri|re_pri)>([^<]+)<\/(?:ke_pri|re_pri)>/g)].map((m) => m[1])
  const score = priorityScore(tags) + Math.abs(keb.length - 2) * 0.01

  const seenChars = new Set(keb)
  for (const ch of seenChars) {
    if (!kanjiChars.has(ch)) continue
    const current = bestByChar.get(ch)
    if (!current || score < current.score) {
      bestByChar.set(ch, { exampleKanji: keb, exampleJp: reb, score })
    }
  }
}

const result = Object.fromEntries(bestByChar)
await mkdir(outDir, { recursive: true })
await writeFile(out, JSON.stringify(result, null, 2), 'utf-8')

const withCandidate = kanji.filter((k) => bestByChar.has(k.kanji)).length
const missingBefore = kanji.filter((k) => !k.exampleKanji).length
const missingWithCandidate = kanji.filter((k) => !k.exampleKanji && bestByChar.has(k.kanji)).length
console.log(`scanned ${entryCount} JMdict entries`)
console.log(`${withCandidate} / ${kanji.length} kanji have a candidate example`)
console.log(`of ${missingBefore} kanji with no exampleKanji today, ${missingWithCandidate} now have a candidate`)
