import type { Kanji, KanjiLevel } from './data/kanji'
import type { EnglishLevel } from './data/englishVocab'
import type { MockExamDomain } from './lib/mockExamGenerator'

export type PageId = 'home' | 'kana' | 'kanji' | 'wrongNote' | 'vocab' | 'grammar' | 'conjugation' | 'mockExam' | 'englishVocab' | 'backup'

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

// simpler history shape for vocab/grammar/영어단어 quizzes — they only vary by
// level, no questionType/order axis like kanji's QuizConfig. level is
// KanjiLevel (N5~N1) for 한자/단어/문법, EnglishLevel (core1~toeic) for 영어단어
export interface SimpleQuizHistoryEntry {
  id: string
  level: KanjiLevel | EnglishLevel
  total: number
  correct: number
  elapsedMs: number
  finishedAt: string
}

// 활용 퀴즈는 급수 축(KanjiLevel)이 아니라 단어 출처(엄선/N5~N1)+유형(만들기/읽기)을
// 쓰므로 level 대신 source/mode 라벨을 쓰는 별도 기록 타입. total/correct/finishedAt은
// 공통이라 주간 통계 합산에 그대로 섞인다.
export interface ConjugationQuizHistoryEntry {
  id: string
  source: string
  mode: string
  total: number
  correct: number
  elapsedMs: number
  finishedAt: string
}

// 가나 퀴즈도 급수 축이 없어(가나↔로마자 / 표기 구분) mode 라벨만 쓰는 별도 기록 타입.
export interface KanaQuizHistoryEntry {
  id: string
  mode: string
  total: number
  correct: number
  elapsedMs: number
  finishedAt: string
}

// 모의고사(한자/단어/문법 통합) 한 회차 기록 — SimpleQuizHistoryEntry에 도메인별
// 정답/전체 브레이크다운만 추가된 형태
export interface MockExamHistoryEntry {
  id: string
  level: KanjiLevel
  total: number
  correct: number
  elapsedMs: number
  finishedAt: string
  breakdown: Record<MockExamDomain, { total: number; correct: number }>
}
