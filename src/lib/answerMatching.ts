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

// 단어 데이터의 reading은 복수 읽기를 세미콜론으로 이어 붙인 단일 문자열이다
// (行く → "いく; ゆく", お金持ち → "かねもち; おかねもち"). 읽기 입력 퀴즈에
// 이 문자열을 그대로 정답으로 넘기면 "いく"라고 맞게 써도 오답이 되므로,
// 채점 전에 개별 읽기로 分해한다. 접두 물결(～くらい)은 표기상의 접사 표시라
// 입력 대상이 아니므로 함께 제거한다.
export function acceptableReadings(reading: string): string[] {
  return reading
    .split(/[;；]/)
    .map((r) => normalizeAnswer(r).replace(/^[～~]+/, ''))
    .filter((r) => r.length > 0)
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
