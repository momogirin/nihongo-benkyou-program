import type { Kanji, KanjiLevel } from './data/kanji'

export type PageId = 'home' | 'quiz' | 'wrongNote' | 'backup'

export type QuestionType =
  | 'promptToAnswer'
  | 'answerToPrompt'
  | 'kunReading'
  | 'kunReadingToKanji'
  | 'onReading'
  | 'onReadingToKanji'
export type QuizOrder = 'random' | 'sequential'
export type QuestionCount = 10 | 20 | 30 | 50 | 'all'

// 'all' = use every kanji in the level; a number selects one 50-kanji segment
// (1-based, ordered by `num`) so repeat sessions can target unseen kanji
// instead of re-rolling the same wide pool every time.
export type LevelSegment = 'all' | number

export interface QuizConfig {
  levels: KanjiLevel[]
  levelSegments: Partial<Record<KanjiLevel, LevelSegment>>
  questionType: QuestionType
  order: QuizOrder
  count: QuestionCount
  // when set, quiz draws only from these kanji ids instead of `levels`
  // (used by "오답만 재도전" / "이어하기" entry points that bypass SetupScreen)
  kanjiIds?: string[]
}

export interface AnsweredQuestion {
  kanji: Kanji
  userAnswer: string
  isCorrect: boolean
}
