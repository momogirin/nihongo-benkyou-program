// 한자의 음독(onJp)별 대표 단어 인덱스. 신규 데이터 없이 기존 vocabList의
// word/reading만으로 "이 음독을 실제로 어디에 쓰는가"를 자동 매칭한다.
// kanjiWordIndex.ts(한자 → 단어 역인덱스)와 같은 방향이지만, 단어 하나를
// 음독별로 더 세분화한다는 점이 다르다.
import { vocabList, type VocabWord } from '../data/vocab'
import type { Kanji, KanjiLevel } from '../data/kanji'

const KANJI_CHAR_RE = /[一-龯々]/

const LEVEL_ORDER: Record<KanjiLevel, number> = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 }

function kataToHira(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

interface Run {
  text: string
  isKanji: boolean
}

// word를 한자런/비한자런(오쿠리가나)으로 분리 — 「食べる」→ [食](한자)+[べる](비한자)
function segmentWord(word: string): Run[] {
  const runs: Run[] = []
  let cur = ''
  let curIsKanji: boolean | null = null
  for (const ch of word) {
    const isK = KANJI_CHAR_RE.test(ch)
    if (curIsKanji === null || isK === curIsKanji) {
      cur += ch
      curIsKanji = isK
    } else {
      runs.push({ text: cur, isKanji: curIsKanji })
      cur = ch
      curIsKanji = isK
    }
  }
  if (cur) runs.push({ text: cur, isKanji: curIsKanji as boolean })
  return runs
}

// word의 오쿠리가나(비한자런)를 reading에서 순서대로 찾아, 그 사이사이가
// 각 한자런의 읽기라고 역산한다. 오쿠리가나가 reading 안에서 그대로 안
// 찾아지면(활용형 등으로 어긋난 경우) 매칭을 포기한다 — 추측해서 오탐을
// 만들지 않는다는 원칙(vocabQuizGenerator.ts의 blankSentence와 동일 정신).
function kanjiRunReadings(runs: Run[], reading: string): string[] | null {
  let remaining = reading
  const result: string[] = []
  for (const r of runs) {
    if (r.isKanji) continue
    const idx = remaining.indexOf(r.text)
    if (idx < 0) return null
    result.push(remaining.slice(0, idx))
    remaining = remaining.slice(idx + r.text.length)
  }
  if (runs.length > 0 && runs[runs.length - 1].isKanji) result.push(remaining)
  const kanjiRunCount = runs.filter((r) => r.isKanji).length
  if (result.length !== kanjiRunCount) return null
  return result
}

// 대상 한자가 포함된 한자런의 읽기가 onHira로 시작하는지 확인. 런에 한자가
// 하나뿐이면 그 런 읽기 전체로 판정하고, 여러 한자가 붙은 런(熟語)은 대상
// 한자가 런의 첫 글자일 때만 판정한다(중간/끝 글자는 위치를 정확히 잘라낼
// 방법이 없어 포기 — 오탐 방지가 커버리지보다 우선).
function matchesOnReading(word: VocabWord, kanjiChar: string, onHira: string): boolean {
  const runs = segmentWord(word.word)
  const readings = kanjiRunReadings(runs, word.reading)
  if (!readings) return false

  let ki = 0
  for (const r of runs) {
    if (!r.isKanji) continue
    if (r.text.includes(kanjiChar)) {
      const runReading = readings[ki]
      const posInRun = r.text.indexOf(kanjiChar)
      if (r.text.length === 1 || posInRun === 0) return runReading.startsWith(onHira)
      return false
    }
    ki++
  }
  return false
}

// KanjiListPage가 실제로 쓰는 필드만 담은 얕은 타입 — vocabList에서 자동
// 매칭된 VocabWord와, 사람이 직접 채운 onReadingOverride 항목을 같은
// shape으로 다루기 위함(override 단어는 vocabList에 없을 수도 있어 id가
// 없으므로 `${kanji}-${on}-${word}`로 합성).
export interface OnReadingWord {
  id: string
  word: string
  reading: string
  meaningKr: string
}

export interface OnReadingExample {
  on: string
  words: OnReadingWord[]
}

const cache = new Map<string, OnReadingExample[]>()

// 한자별 음독마다 대표 단어(최대 limit개, 급수·번호순)를 반환. vocabList
// 자동 매칭이 못 찾은 음독은 kanji.onReadingOverride(사람이 직접 채운 것)로
// 보완하고, 그마저 없으면 결과에서 제외한다(추측 금지 원칙).
export function onReadingExamples(kanji: Kanji, limit = 3): OnReadingExample[] {
  const cached = cache.get(kanji.kanji)
  if (cached) return cached

  const onList = kanji.onJp ? kanji.onJp.split('・').filter(Boolean) : []
  const wordsWithChar = vocabList.filter((w) => w.word.includes(kanji.kanji))

  // 짧은 음독이 긴 음독의 접두여인 경우(分: ブン/ブ처럼 ぶん이 ぶ로 시작함)
  // 긴 쪽부터 먼저 배정해서, 한 단어가 여러 음독에 중복 매칭되지 않게 한다.
  const onsByLength = [...onList].sort((a, b) => kataToHira(b).length - kataToHira(a).length)
  const claimed = new Set<string>()
  const matchesByOn = new Map<string, VocabWord[]>()
  for (const on of onsByLength) {
    const onHira = kataToHira(on)
    const matched = wordsWithChar.filter((w) => !claimed.has(w.id) && matchesOnReading(w, kanji.kanji, onHira))
    for (const w of matched) claimed.add(w.id)
    matchesByOn.set(on, matched)
  }

  const overrideByOn = new Map<string, OnReadingWord[]>()
  for (const entry of kanji.onReadingOverride ?? []) {
    const arr = overrideByOn.get(entry.on) ?? []
    arr.push({
      id: `${kanji.kanji}-${entry.on}-${entry.word}`,
      word: entry.word,
      reading: entry.reading,
      meaningKr: entry.meaningKr,
    })
    overrideByOn.set(entry.on, arr)
  }

  const result: OnReadingExample[] = []
  for (const on of onList) {
    const matched: OnReadingWord[] = (matchesByOn.get(on) ?? [])
      .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.num - b.num)
      .map((w) => ({ id: w.id, word: w.word, reading: w.reading, meaningKr: w.meaningKr }))
    const words = matched.length > 0 ? matched : (overrideByOn.get(on) ?? [])
    if (words.length === 0) continue
    result.push({ on, words: words.slice(0, limit) })
  }

  cache.set(kanji.kanji, result)
  return result
}
