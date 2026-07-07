import type { Kanji, KanjiLevel } from './data/kanji'

export type PageId = 'home' | 'study' | 'quiz' | 'wrongNote' | 'radicals' | 'backup'

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
