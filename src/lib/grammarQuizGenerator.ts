import { grammarList, type GrammarPoint } from '../data/grammar'
import type { KanjiLevel } from '../data/kanji'

export interface GrammarQuizQuestion {
  entry: GrammarPoint
  choices: GrammarPoint[]
}

const LEVEL_ORDER: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

// only levels grammarList actually has data for, in JLPT order — grows on
// its own as N3-N1 batches are added later, no page code changes needed
export const grammarAvailableLevels: KanjiLevel[] = LEVEL_ORDER.filter((level) =>
  grammarList.some((g) => g.level === level),
)

export function grammarLevelPool(level: KanjiLevel): GrammarPoint[] {
  return grammarList.filter((g) => g.level === level).sort((a, b) => a.num - b.num)
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// pattern -> meaningKr multiple choice, drawn from the given level's full
// pool so exam-style quizzing isn't limited to whatever's been studied so far.
// order: 'random' shuffles the draw (default), 'sequential' keeps the
// level's num order — same two options the kanji quiz already has.
export function generateGrammarQuestions(
  level: KanjiLevel,
  count: number,
  order: 'random' | 'sequential' = 'random',
): GrammarQuizQuestion[] {
  const pool = grammarLevelPool(level)
  const ordered = order === 'random' ? shuffle(pool) : pool
  const selected = ordered.slice(0, Math.min(count, pool.length))

  return selected.map((entry) => {
    const distractorPool = pool.filter((g) => g.id !== entry.id && g.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}

// same pattern -> meaningKr shape, but for a fixed set of ids (오답노트
// 재도전) instead of a level draw. Distractors still come from the entry's
// own level pool so choices stay plausible even when ids span levels.
export function generateGrammarQuestionsFromIds(ids: string[]): GrammarQuizQuestion[] {
  const entries = ids.map((id) => grammarList.find((g) => g.id === id)).filter((g): g is GrammarPoint => g !== undefined)

  return shuffle(entries).map((entry) => {
    const pool = grammarLevelPool(entry.level)
    const distractorPool = pool.filter((g) => g.id !== entry.id && g.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}
