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
