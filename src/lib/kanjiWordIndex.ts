// 한자 → 그 한자가 표기에 쓰인 단어들(역인덱스). kanjiUsage.ts가 단어→한자
// 방향만 지원하는 것의 반대. 신규 데이터 없이 기존 vocabList만으로 인덱스를 만든다.
import { vocabList, type VocabWord } from '../data/vocab'
import type { KanjiLevel } from '../data/kanji'

const KANJI_CHAR_RE = /[一-龯々]/g
const LEVEL_ORDER: Record<KanjiLevel, number> = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 }

let index: Map<string, VocabWord[]> | null = null

function buildIndex(): Map<string, VocabWord[]> {
  const map = new Map<string, VocabWord[]>()
  for (const w of vocabList) {
    // word가 세미콜론으로 이표기를 나열하는 경우도 그대로 스캔(둘 다 색인)
    const chars = new Set(w.word.match(KANJI_CHAR_RE) ?? [])
    for (const c of chars) {
      const arr = map.get(c)
      if (arr) arr.push(w)
      else map.set(c, [w])
    }
  }
  // 쉬운 급수(N5)·낮은 번호부터 — 흔한 단어가 먼저 보이게
  for (const arr of map.values()) {
    arr.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.num - b.num)
  }
  return map
}

// 이 한자가 쓰인 단어 목록(기본 상한 12개 — 흔한 한자는 수백 개라 화면 보호)
export function wordsUsingKanji(kanjiChar: string, limit = 12): VocabWord[] {
  if (!index) index = buildIndex()
  return (index.get(kanjiChar) ?? []).slice(0, limit)
}

export function wordsUsingKanjiCount(kanjiChar: string): number {
  if (!index) index = buildIndex()
  return (index.get(kanjiChar) ?? []).length
}
