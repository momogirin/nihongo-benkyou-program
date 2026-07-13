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
// studied so far. order: 'random' shuffles the draw (default), 'sequential'
// keeps the level's num order — same two options the kanji quiz already has.
export function generateVocabQuestions(
  level: KanjiLevel,
  count: number,
  order: 'random' | 'sequential' = 'random',
): VocabQuizQuestion[] {
  const pool = vocabLevelPool(level)
  const ordered = order === 'random' ? shuffle(pool) : pool
  const selected = ordered.slice(0, Math.min(count, pool.length))

  return selected.map((entry) => {
    const distractorPool = pool.filter((w) => w.id !== entry.id && w.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}

// same word/reading -> meaningKr shape, but for a fixed set of ids (오답노트
// 재도전) instead of a level draw. Distractors still come from the entry's
// own level pool so choices stay plausible even when ids span levels.
export function generateVocabQuestionsFromIds(ids: string[]): VocabQuizQuestion[] {
  const entries = ids.map((id) => vocabList.find((w) => w.id === id)).filter((w): w is VocabWord => w !== undefined)

  return shuffle(entries).map((entry) => {
    const pool = vocabLevelPool(entry.level)
    const distractorPool = pool.filter((w) => w.id !== entry.id && w.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}
