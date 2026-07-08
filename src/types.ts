import type { Kanji, KanjiLevel } from './data/kanji'

export type PageId = 'home' | 'study' | 'quiz' | 'wrongNote' | 'radicals' | 'vocab' | 'grammar' | 'backup'

export type QuestionType =
  | 'promptToAnswer'
  | 'answerToPrompt'
  | 'kunReading'
  | 'kunReadingToKanji'
  | 'onReading'
  | 'onReadingToKanji'
export type QuizOrder = 'random' | 'sequential'
export type QuestionCount = 10 | 20 | 30 | 50 | 'all'

export interface QuizConfig {
  levels: KanjiLevel[]
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

// one finished quiz session, kept so HomePage can show a watch-history-style
// list of past attempts (and let the user re-run any of them) instead of
// only ever repeating the single last config
export interface QuizHistoryEntry {
  id: string
  config: QuizConfig
  total: number
  correct: number
  elapsedMs: number
  finishedAt: string
}

// simpler history shape for vocab/grammar quizzes — they only vary by
// level, no questionType/order axis like kanji's QuizConfig
export interface SimpleQuizHistoryEntry {
  id: string
  level: KanjiLevel
  total: number
  correct: number
  elapsedMs: number
  finishedAt: string
}
