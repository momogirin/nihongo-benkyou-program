import { englishVocabList, type EnglishVocabWord, type EnglishLevel } from '../data/englishVocab'

export interface EnglishVocabQuizQuestion {
  entry: EnglishVocabWord
  choices: EnglishVocabWord[]
}

export function englishVocabLevelPool(level: EnglishLevel): EnglishVocabWord[] {
  return englishVocabList.filter((w) => w.level === level).sort((a, b) => a.num - b.num)
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// word -> meaningKr multiple choice, drawn from the given level's full word
// pool so exam-style quizzing isn't limited to whatever's been studied so
// far. order: 'random' shuffles the draw (default), 'sequential' keeps the
// level's num order — same two options the 일본어 단어 quiz already has.
export function generateEnglishVocabQuestions(
  level: EnglishLevel,
  count: number,
  order: 'random' | 'sequential' = 'random',
): EnglishVocabQuizQuestion[] {
  const pool = englishVocabLevelPool(level)
  const ordered = order === 'random' ? shuffle(pool) : pool
  const selected = ordered.slice(0, Math.min(count, pool.length))

  return selected.map((entry) => {
    const distractorPool = pool.filter((w) => w.id !== entry.id && w.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}

// same word -> meaningKr shape, but for a fixed set of ids (오답노트 재도전)
// instead of a level draw. Distractors still come from the entry's own level
// pool so choices stay plausible even when ids span levels.
export function generateEnglishVocabQuestionsFromIds(ids: string[]): EnglishVocabQuizQuestion[] {
  const entries = ids
    .map((id) => englishVocabList.find((w) => w.id === id))
    .filter((w): w is EnglishVocabWord => w !== undefined)

  return shuffle(entries).map((entry) => {
    const pool = englishVocabLevelPool(entry.level)
    const distractorPool = pool.filter((w) => w.id !== entry.id && w.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}
