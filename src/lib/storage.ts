import type { KanjiLevel } from '../data/kanji'
import type { QuizQuestion } from './quizGenerator'
import type { AnsweredQuestion, QuizConfig, QuizHistoryEntry } from '../types'

export interface WrongNoteEntry {
  kanjiId: string
  wrongAt: string
}

// a quiz session that's been started but not finished yet, saved after every
// answer so it can be resumed exactly (same questions/choices, same answers
// so far) instead of restarting from scratch
export interface InProgressQuiz {
  config: QuizConfig
  questions: QuizQuestion[]
  index: number
  answers: AnsweredQuestion[]
  startedAt: string
}

const WRONG_NOTES_KEY = 'kanjiApp.wrongNotes'
const QUIZ_HISTORY_KEY = 'kanjiApp.quizHistory'
const QUIZ_HISTORY_LIMIT = 20
const IN_PROGRESS_QUIZ_KEY = 'kanjiApp.inProgressQuiz'
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

// every finished quiz (regardless of entry point), newest first — capped so
// localStorage doesn't grow forever; used by HomePage's history list
export function getQuizHistory(): QuizHistoryEntry[] {
  try {
    const raw = localStorage.getItem(QUIZ_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addQuizHistoryEntry(entry: QuizHistoryEntry) {
  const history = [entry, ...getQuizHistory()].slice(0, QUIZ_HISTORY_LIMIT)
  localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(history))
}

// merges by id (backup import), keeping the union sorted newest-first and
// capped the same way addQuizHistoryEntry is
export function importQuizHistory(entries: QuizHistoryEntry[]) {
  const byId = new Map(getQuizHistory().map((entry) => [entry.id, entry]))
  for (const entry of entries) byId.set(entry.id, entry)
  const merged = [...byId.values()].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
  localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(merged.slice(0, QUIZ_HISTORY_LIMIT)))
}

// only one in-progress quiz is tracked at a time — starting any new quiz
// (fresh setup, 오답 재도전, 학습 배치, re-running a history entry) replaces it
export function getInProgressQuiz(): InProgressQuiz | null {
  try {
    const raw = localStorage.getItem(IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveInProgressQuiz(state: InProgressQuiz) {
  localStorage.setItem(IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearInProgressQuiz() {
  localStorage.removeItem(IN_PROGRESS_QUIZ_KEY)
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
