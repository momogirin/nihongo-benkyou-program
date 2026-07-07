// Applies the wiktionary-sourced meaningKr from
// data/cache/radical-meanings-wiktionary.json onto data/radicals.json,
// replacing only entries whose value actually differs (see
// scripts/fetch-radical-meanings.mjs for how the cache was built).
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const radicalsPath = resolve(root, 'data/radicals.json')

const radicals = JSON.parse(await readFile(radicalsPath, 'utf-8'))
const wiktionaryResults = JSON.parse(
  await readFile(resolve(root, 'data/cache/radical-meanings-wiktionary.json'), 'utf-8')
)
const proposedByRadical = new Map(
  wiktionaryResults.filter((r) => r.status === 'ok').map((r) => [r.radical, r.senses[0].meaningKr])
)

// every 'ok' match is now wiktionary-cross-verified, whether or not its value
// actually changed — only entries with no match (e.g. 尸) stay unverified
let changed = 0
for (const r of radicals) {
  const proposed = proposedByRadical.get(r.radical)
  if (!proposed) continue
  if (proposed !== r.meaningKr) {
    r.meaningKr = proposed
    changed++
  }
  r.meaningKrSource = 'wiktionary'
}

// matches the source file's existing style: one compact object per line
const body = radicals.map((r) => '  ' + JSON.stringify(r)).join(',\n')
await writeFile(radicalsPath, `[\n${body}\n]\n`, 'utf-8')
console.log(`updated meaningKr for ${changed} / ${radicals.length} radicals in data/radicals.json`)
