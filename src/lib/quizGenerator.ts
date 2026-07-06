import { kanjiList, type Kanji } from '../data/kanji'
import type { QuizConfig } from '../types'

export interface QuizQuestion {
  kanji: Kanji
  choices?: Kanji[]
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function generateQuestions(config: QuizConfig): QuizQuestion[] {
  const pool = kanjiList.filter((k) => config.levels.includes(k.level))
  const ordered =
    config.order === 'random' ? shuffle(pool) : [...pool].sort((a, b) => a.num - b.num)
  const count = config.count === 'all' ? ordered.length : Math.min(config.count, ordered.length)
  const selected = ordered.slice(0, count)

  if (config.questionType === 'answerToPrompt') {
    return selected.map((kanji) => {
      const distractors = shuffle(pool.filter((k) => k.id !== kanji.id)).slice(0, 3)
      return { kanji, choices: shuffle([kanji, ...distractors]) }
    })
  }

  return selected.map((kanji) => ({ kanji }))
}
