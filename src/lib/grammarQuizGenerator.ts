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
// pool so exam-style quizzing isn't limited to whatever's been studied so far
export function generateGrammarQuestions(level: KanjiLevel, count: number): GrammarQuizQuestion[] {
  const pool = grammarLevelPool(level)
  const selected = shuffle(pool).slice(0, Math.min(count, pool.length))

  return selected.map((entry) => {
    const distractorPool = pool.filter((g) => g.id !== entry.id && g.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}
