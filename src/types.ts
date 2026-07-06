import type { Kanji, KanjiLevel } from './data/kanji'

export type PageId = 'home' | 'quiz' | 'flashcard' | 'wrongNote' | 'backup'

export type QuestionType = 'promptToAnswer' | 'answerToPrompt'
export type QuizOrder = 'random' | 'sequential'
export type QuestionCount = 10 | 20 | 30 | 50 | 'all'

export interface QuizConfig {
  levels: KanjiLevel[]
  questionType: QuestionType
  order: QuizOrder
  count: QuestionCount
}

export interface AnsweredQuestion {
  kanji: Kanji
  userAnswer: string
  isCorrect: boolean
}
