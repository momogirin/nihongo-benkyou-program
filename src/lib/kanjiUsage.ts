import { kanjiList, type Kanji } from '../data/kanji'

const KANJI_CHAR_RE = /[一-龯々]/g

// 텍스트에 등장하는 한자를 뽑아 kanjiList와 대조 — 단어/예문의 급수와
// 실제 쓰인 한자의 급수가 다른 경우가 많아서(N5 단어에 N2 한자가 섞이는 등)
// 무슨 한자인지 바로 옆에서 보여줘 학습 겸 난이도 체감을 낮춘다
export function usedKanji(text: string): Kanji[] {
  const chars = [...new Set(text.match(KANJI_CHAR_RE) ?? [])]
  return chars.map((c) => kanjiList.find((k) => k.kanji === c)).filter((k): k is Kanji => k !== undefined)
}
