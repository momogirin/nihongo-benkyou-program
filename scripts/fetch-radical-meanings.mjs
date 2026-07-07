// Fetches ko.wiktionary.org's {{ko-hanja|사전형|훈|음}} template for the 92
// Kangxi radicals that aren't also a jouyou kanji (so build-radical-data.mjs
// falls back to an unverified "generated-uncertain" meaningKr).
// Read-only: writes a cache, does not touch data/radicals.json.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const outDir = resolve(root, 'data/cache')
const out = resolve(outDir, 'radical-meanings-wiktionary.json')

const radicals = JSON.parse(await readFile(resolve(root, 'data/radicals.json'), 'utf-8'))
const kanji = JSON.parse(await readFile(resolve(root, 'data/kanji.json'), 'utf-8'))
const kunKrByChar = new Set(kanji.map((k) => k.kanji))
const targets = radicals.filter((r) => !kunKrByChar.has(r.radical))

// splits a template's inner "a|b|c" content on top-level `|` only — a naive
// split breaks when an argument itself contains a piped wikilink like
// [[어질다|어진]], since that `|` isn't a template-argument separator
function splitTemplateArgs(inner) {
  const args = []
  let depth = 0
  let current = ''
  for (let i = 0; i < inner.length; i++) {
    if (inner.startsWith('[[', i)) {
      depth++
      current += '[['
      i++
    } else if (inner.startsWith(']]', i)) {
      depth--
      current += ']]'
      i++
    } else if (inner[i] === '|' && depth === 0) {
      args.push(current)
      current = ''
    } else {
      current += inner[i]
    }
  }
  args.push(current)
  return args
}

// takes the first of multiple senses — separated by "·", "," or numbered
// markers ("1. ... 2. ... 3. ...") that can appear anywhere in the string,
// not just at the start — and resolves [[target|display]] wiki links to
// their display text (or the target itself when unpiped)
function firstSense(raw) {
  const numbered = raw
    .split(/\d+\.\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
  const first = (numbered[0] ?? raw).split('·')[0].split(',')[0]
  return first
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, display) => display ?? target)
    .trim()
}

// two different templates show up depending on the page: {{한자풀이|훈=..|음=..}}
// directly under a "==한자==" heading (same template data/raw/README.md says
// the original kanji.json kunKr values came from), or {{ko-hanja|훈|음}} /
// {{ko-hanja|사전형|훈|음}} under "==한국어== / ===한자==="
function parseWikitext(wikitext) {
  const hanjapuri = wikitext.match(/\{\{한자풀이\|([\s\S]*?)\}\}/)
  if (hanjapuri) {
    // template args are one-per-line in some pages (each prefixed by its own
    // leading `|`), so trim each before matching/slicing off the `key=`
    const args = splitTemplateArgs(hanjapuri[1]).map((a) => a.trim())
    const get = (key) => args.find((a) => a.startsWith(`${key}=`))?.slice(key.length + 1).trim()

    // 부수풀이=(훈 음) is the character's meaning specifically *as a radical*
    // (can differ from its everyday 훈/음 — e.g. 屮's 훈/음 is "왼손 좌" as a
    // word, but as a radical it's glossed "싹날 철"), so prefer it when present
    const hun = get('훈')
    const eum = get('음')

    // 부수풀이's own "(...)" often already ends with the reading (e.g. 屮 ->
    // "왼손 좌"), but sometimes only has the meaning (e.g. 韋 -> "무두질한
    // 가죽", missing "위") — append 음= when it looks left out
    const busuPuri = get('부수풀이')?.match(/\(([^)]+)\)/)?.[1]?.trim()
    if (busuPuri) {
      const eumFirst = eum && firstSense(eum)
      const meaningKr = eumFirst && !busuPuri.includes(eumFirst) ? `${busuPuri} ${eumFirst}` : busuPuri
      return [{ meaningKr, template: '한자풀이(부수풀이)' }]
    }

    if (hun && eum)
      return [{ meaningKr: `${firstSense(hun)} ${firstSense(eum)}`, template: '한자풀이' }]
  }
  const matches = [...wikitext.matchAll(/\{\{ko-hanja\|([\s\S]*?)\}\}/g)]
  return matches.map((m) => {
    const [a, b, c] = splitTemplateArgs(m[1])
    return {
      meaningKr: `${firstSense(c ? b : a)} ${firstSense(c ? c : b)}`,
      template: 'ko-hanja',
    }
  })
}

const results = []
for (const r of targets) {
  const url = `https://ko.wiktionary.org/w/index.php?title=${encodeURIComponent(r.radical)}&action=raw`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      results.push({ radical: r.radical, number: r.number, status: `http_${res.status}` })
      continue
    }
    const wikitext = await res.text()
    const senses = parseWikitext(wikitext)
    results.push({
      radical: r.radical,
      number: r.number,
      status: senses.length ? 'ok' : 'no_template_match',
      senses,
    })
  } catch (err) {
    results.push({ radical: r.radical, number: r.number, status: 'fetch_error', error: String(err) })
  }
  // be polite to wiktionary's servers
  await new Promise((r2) => setTimeout(r2, 300))
}

await mkdir(outDir, { recursive: true })
await writeFile(out, JSON.stringify(results, null, 2), 'utf-8')
const ok = results.filter((r) => r.status === 'ok').length
console.log(`fetched ${results.length} radicals -> data/cache/radical-meanings-wiktionary.json (${ok} with a ko-hanja template)`)
