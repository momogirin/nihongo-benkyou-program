// 품사 태깅된 단어(vocab의 conjugationType)를 활용 드릴 항목으로 변환.
// 엄선 세트(conjugation.json 146개) 대신/더해 급수별 실제 어휘로 활용 연습을 확장한다.
import { vocabList } from '../data/vocab'
import type { KanjiLevel } from '../data/kanji'
import type { ConjugationEntry } from './conjugation'

// 태깅된 단어는 세미콜론·괄호·공백 표기를 이미 제외했으므로 활용 엔진에 그대로 안전하게 들어간다.
export function vocabConjugationEntries(level: KanjiLevel): ConjugationEntry[] {
  return vocabList
    .filter((w) => w.conjugationType && w.level === level)
    .sort((a, b) => a.num - b.num)
    .map((w) => ({
      id: w.id,
      word: w.word,
      reading: w.reading,
      meaningKr: w.meaningKr,
      type: w.conjugationType!,
    }))
}
