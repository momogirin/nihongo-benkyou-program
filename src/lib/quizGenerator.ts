import { kanjiList, type Kanji, type KanjiLevel } from '../data/kanji'
import type { LevelSegment, QuizConfig } from '../types'

export interface QuizQuestion {
  kanji: Kanji
  choices?: Kanji[]
}

export const SEGMENT_SIZE = 50

export function levelPool(level: KanjiLevel): Kanji[] {
  return kanjiList.filter((k) => k.level === level).sort((a, b) => a.num - b.num)
}

export function segmentCount(level: KanjiLevel): number {
  return Math.ceil(levelPool(level).length / SEGMENT_SIZE)
}

export function segmentPool(level: KanjiLevel, segment: LevelSegment | undefined): Kanji[] {
  const pool = levelPool(level)
  if (!segment || segment === 'all') return pool
  const start = (segment - 1) * SEGMENT_SIZE
  return pool.slice(start, start + SEGMENT_SIZE)
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

type ReadingField = 'kunJp' | 'onJp'

const MISSING_READING = new Set(['—', '-', ''])

function hasReading(kanji: Kanji, field: ReadingField): boolean {
  return !MISSING_READING.has(kanji[field].trim())
}

// picks up to `n` items with distinct values for `field`, so two choice
// buttons never show the same reading text
function pickDistinctBy(items: Kanji[], field: ReadingField, n: number): Kanji[] {
  const seen = new Set<string>()
  const result: Kanji[] = []
  for (const item of items) {
    if (seen.has(item[field])) continue
    seen.add(item[field])
    result.push(item)
    if (result.length === n) break
  }
  return result
}

// which reading field a question type is testing (undefined = not reading-based)
const READING_FIELD: Partial<Record<QuizConfig['questionType'], ReadingField>> = {
  kunReading: 'kunJp',
  kunReadingToKanji: 'kunJp',
  onReading: 'onJp',
  onReadingToKanji: 'onJp',
}

// question types where the 4 choices are kanji characters (as opposed to reading strings)
const KANJI_CHOICE_TYPES = new Set<QuizConfig['questionType']>([
  'answerToPrompt',
  'kunReadingToKanji',
  'onReadingToKanji',
])

export function generateQuestions(config: QuizConfig): QuizQuestion[] {
  const basePool = config.levels.flatMap((level) => segmentPool(level, config.levelSegments[level]))
  const field = READING_FIELD[config.questionType]
  const pool = field ? basePool.filter((k) => hasReading(k, field)) : basePool

  const ordered =
    config.order === 'random' ? shuffle(pool) : [...pool].sort((a, b) => a.num - b.num)
  const count = config.count === 'all' ? ordered.length : Math.min(config.count, ordered.length)
  const selected = ordered.slice(0, count)

  if (KANJI_CHOICE_TYPES.has(config.questionType)) {
    return selected.map((kanji) => {
      const distractors = shuffle(basePool.filter((k) => k.id !== kanji.id)).slice(0, 3)
      return { kanji, choices: shuffle([kanji, ...distractors]) }
    })
  }

  if (field) {
    return selected.map((kanji) => {
      const distractorPool = pool.filter((k) => k.id !== kanji.id && k[field] !== kanji[field])
      const distractors = pickDistinctBy(shuffle(distractorPool), field, 3)
      return { kanji, choices: shuffle([kanji, ...distractors]) }
    })
  }

  return selected.map((kanji) => ({ kanji }))
}
