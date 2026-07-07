import { vocabList, type VocabWord } from '../data/vocab'
import type { KanjiLevel } from '../data/kanji'

export interface VocabQuizQuestion {
  entry: VocabWord
  choices: VocabWord[]
}

export function vocabLevelPool(level: KanjiLevel): VocabWord[] {
  return vocabList.filter((w) => w.level === level).sort((a, b) => a.num - b.num)
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// word+reading -> meaningKr multiple choice, drawn from the given level's
// full word pool so exam-style quizzing isn't limited to whatever's been
// studied so far
export function generateVocabQuestions(level: KanjiLevel, count: number): VocabQuizQuestion[] {
  const pool = vocabLevelPool(level)
  const selected = shuffle(pool).slice(0, Math.min(count, pool.length))

  return selected.map((entry) => {
    const distractorPool = pool.filter((w) => w.id !== entry.id && w.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}
