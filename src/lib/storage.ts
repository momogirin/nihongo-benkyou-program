import type { QuizConfig } from '../types'

export interface WrongNoteEntry {
  kanjiId: string
  wrongAt: string
}

const WRONG_NOTES_KEY = 'kanjiApp.wrongNotes'
const LAST_QUIZ_CONFIG_KEY = 'kanjiApp.lastQuizConfig'

export function getWrongNotes(): WrongNoteEntry[] {
  try {
    const raw = localStorage.getItem(WRONG_NOTES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addWrongNotes(kanjiIds: string[]) {
  if (kanjiIds.length === 0) return
  const byId = new Map(getWrongNotes().map((entry) => [entry.kanjiId, entry]))
  const wrongAt = new Date().toISOString()
  for (const kanjiId of kanjiIds) {
    byId.set(kanjiId, { kanjiId, wrongAt })
  }
  localStorage.setItem(WRONG_NOTES_KEY, JSON.stringify([...byId.values()]))
}

export function removeWrongNote(kanjiId: string) {
  const remaining = getWrongNotes().filter((entry) => entry.kanjiId !== kanjiId)
  localStorage.setItem(WRONG_NOTES_KEY, JSON.stringify(remaining))
}

// last config started from SetupScreen, used by HomePage's "이어하기" entry
// point (not written by ad-hoc entry points like 오답 재도전)
export function getLastQuizConfig(): QuizConfig | null {
  try {
    const raw = localStorage.getItem(LAST_QUIZ_CONFIG_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveLastQuizConfig(config: QuizConfig) {
  localStorage.setItem(LAST_QUIZ_CONFIG_KEY, JSON.stringify(config))
}

// merges by kanjiId, keeping whichever entry was marked wrong more recently —
// used by BackupPage import so restoring an old backup can't erase newer progress
export function importWrongNotes(entries: WrongNoteEntry[]) {
  const byId = new Map(getWrongNotes().map((entry) => [entry.kanjiId, entry]))
  for (const entry of entries) {
    const existing = byId.get(entry.kanjiId)
    if (!existing || existing.wrongAt < entry.wrongAt) {
      byId.set(entry.kanjiId, entry)
    }
  }
  localStorage.setItem(WRONG_NOTES_KEY, JSON.stringify([...byId.values()]))
}
