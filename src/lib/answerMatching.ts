import type { Kanji } from '../data/kanji'
import type { QuestionType } from '../types'

// Accepts an array of acceptable answers so a kanji with multiple valid
// 훈음 readings can list them all later without changing this logic.
export function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, '')
}

export function isCorrectAnswer(input: string, accepted: string | string[]): boolean {
  const acceptedList = Array.isArray(accepted) ? accepted : [accepted]
  const normalizedInput = normalizeAnswer(input)
  return acceptedList.some((answer) => normalizeAnswer(answer) === normalizedInput)
}

// single source of truth for "what counts as the right answer" per question
// type — shared by QuizRunner (grading + in-quiz feedback) and ResultScreen
export function correctAnswerLabel(questionType: QuestionType, kanji: Kanji): string {
  switch (questionType) {
    case 'promptToAnswer':
      return kanji.kunKr
    case 'answerToPrompt':
    case 'kunReadingToKanji':
    case 'onReadingToKanji':
      return kanji.kanji
    case 'kunReading':
      return kanji.kunJp
    case 'onReading':
      return kanji.onJp
  }
}
