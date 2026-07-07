// Adds a `level` field to each radical in data/radicals.json, derived from
// the lowest JLPT level among jouyou kanji that use it as their classical
// radical (kanjidic2-sourced) — radicals with no jouyou match (rare/archaic,
// e.g. 龍/龜's old forms) default to N1.
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const radicalsPath = resolve(root, 'data/radicals.json')

const radicals = JSON.parse(await readFile(radicalsPath, 'utf-8'))
const kanji = JSON.parse(await readFile(resolve(root, 'data/kanji.json'), 'utf-8'))
const kanjidic2 = JSON.parse(
  await readFile(resolve(root, 'data/cache/kanjidic2-parsed.json'), 'utf-8')
)

const radicalNumberByChar = new Map(kanjidic2.map((e) => [e.literal, e.radicalNumber]))
const LEVEL_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1']

const minLevelByRadicalNumber = new Map()
for (const k of kanji) {
  const radicalNumber = radicalNumberByChar.get(k.kanji)
  if (radicalNumber == null) continue
  const current = minLevelByRadicalNumber.get(radicalNumber)
  if (!current || LEVEL_ORDER.indexOf(k.level) < LEVEL_ORDER.indexOf(current)) {
    minLevelByRadicalNumber.set(radicalNumber, k.level)
  }
}

let defaulted = 0
for (const r of radicals) {
  const level = minLevelByRadicalNumber.get(r.number)
  if (!level) defaulted++
  r.level = level ?? 'N1'
}

const body = radicals.map((r) => '  ' + JSON.stringify(r)).join(',\n')
await writeFile(radicalsPath, `[\n${body}\n]\n`, 'utf-8')
console.log(`added level to ${radicals.length} radicals (${defaulted} defaulted to N1, no jouyou match)`)
