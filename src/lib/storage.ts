import type { KanjiLevel } from '../data/kanji'
import type { QuizConfig } from '../types'

export interface WrongNoteEntry {
  kanjiId: string
  wrongAt: string
}

const WRONG_NOTES_KEY = 'kanjiApp.wrongNotes'
const LAST_QUIZ_CONFIG_KEY = 'kanjiApp.lastQuizConfig'
const STUDY_PROGRESS_KEY = 'kanjiApp.studyProgress'
const STUDY_BATCH_SIZE_KEY = 'kanjiApp.studyBatchSize'
const DEFAULT_STUDY_BATCH_SIZE = 10

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

// how many kanji (in `num` order) have been completed in the study flow for
// a given level, so "이어하기" can resume past what's already been studied
export function getStudyProgress(level: KanjiLevel): number {
  try {
    const raw = localStorage.getItem(STUDY_PROGRESS_KEY)
    const all = raw ? JSON.parse(raw) : {}
    return typeof all[level] === 'number' ? all[level] : 0
  } catch {
    return 0
  }
}

export function setStudyProgress(level: KanjiLevel, completedCount: number) {
  let all: Record<string, number> = {}
  try {
    const raw = localStorage.getItem(STUDY_PROGRESS_KEY)
    all = raw ? JSON.parse(raw) : {}
  } catch {
    all = {}
  }
  all[level] = completedCount
  localStorage.setItem(STUDY_PROGRESS_KEY, JSON.stringify(all))
}

export function getStudyBatchSize(): number {
  const raw = localStorage.getItem(STUDY_BATCH_SIZE_KEY)
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_STUDY_BATCH_SIZE
}

export function setStudyBatchSize(size: number) {
  localStorage.setItem(STUDY_BATCH_SIZE_KEY, String(size))
}
