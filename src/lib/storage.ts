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
const RADICAL_STUDY_PROGRESS_KEY = 'kanjiApp.radicalStudyProgress'
const RADICAL_STUDY_BATCH_SIZE_KEY = 'kanjiApp.radicalStudyBatchSize'
const VOCAB_STUDY_PROGRESS_KEY = 'kanjiApp.vocabStudyProgress'
const VOCAB_STUDY_BATCH_SIZE_KEY = 'kanjiApp.vocabStudyBatchSize'
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

// only restores from a backup if nothing's currently in progress locally —
// an active session on this device shouldn't be clobbered by an older backup
export function importInProgressQuiz(quiz: InProgressQuiz | null) {
  if (quiz && !getInProgressQuiz()) saveInProgressQuiz(quiz)
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

function getLevelProgressMap(key: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setLevelProgress(key: string, level: KanjiLevel, completedCount: number) {
  const all = getLevelProgressMap(key)
  all[level] = completedCount
  localStorage.setItem(key, JSON.stringify(all))
}

// takes the max per level (progress only ever increases), so restoring an
// older backup can't undo progress made since
function importLevelProgress(key: string, progress: Record<string, number>) {
  const merged = getLevelProgressMap(key)
  for (const [level, count] of Object.entries(progress)) {
    merged[level] = Math.max(merged[level] ?? 0, count)
  }
  localStorage.setItem(key, JSON.stringify(merged))
}

function getBatchSize(key: string): number {
  const raw = localStorage.getItem(key)
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_STUDY_BATCH_SIZE
}

// how many kanji (in `num` order) have been completed in the study flow for
// a given level, so "이어하기" can resume past what's already been studied
export function getStudyProgress(level: KanjiLevel): number {
  return getLevelProgressMap(STUDY_PROGRESS_KEY)[level] ?? 0
}

export function setStudyProgress(level: KanjiLevel, completedCount: number) {
  setLevelProgress(STUDY_PROGRESS_KEY, level, completedCount)
}

// every level's progress at once, for BackupPage export
export function getAllStudyProgress(): Record<string, number> {
  return getLevelProgressMap(STUDY_PROGRESS_KEY)
}

export function importStudyProgress(progress: Record<string, number>) {
  importLevelProgress(STUDY_PROGRESS_KEY, progress)
}

export function getStudyBatchSize(): number {
  return getBatchSize(STUDY_BATCH_SIZE_KEY)
}

export function setStudyBatchSize(size: number) {
  localStorage.setItem(STUDY_BATCH_SIZE_KEY, String(size))
}

// same shape as the kanji study progress above, but for the 부수 학습 flow
export function getRadicalStudyProgress(level: KanjiLevel): number {
  return getLevelProgressMap(RADICAL_STUDY_PROGRESS_KEY)[level] ?? 0
}

export function setRadicalStudyProgress(level: KanjiLevel, completedCount: number) {
  setLevelProgress(RADICAL_STUDY_PROGRESS_KEY, level, completedCount)
}

export function getAllRadicalStudyProgress(): Record<string, number> {
  return getLevelProgressMap(RADICAL_STUDY_PROGRESS_KEY)
}

export function importRadicalStudyProgress(progress: Record<string, number>) {
  importLevelProgress(RADICAL_STUDY_PROGRESS_KEY, progress)
}

export function getRadicalStudyBatchSize(): number {
  return getBatchSize(RADICAL_STUDY_BATCH_SIZE_KEY)
}

export function setRadicalStudyBatchSize(size: number) {
  localStorage.setItem(RADICAL_STUDY_BATCH_SIZE_KEY, String(size))
}

// same shape again, but for the 단어(vocab) 학습 flow
export function getVocabStudyProgress(level: KanjiLevel): number {
  return getLevelProgressMap(VOCAB_STUDY_PROGRESS_KEY)[level] ?? 0
}

export function setVocabStudyProgress(level: KanjiLevel, completedCount: number) {
  setLevelProgress(VOCAB_STUDY_PROGRESS_KEY, level, completedCount)
}

export function getAllVocabStudyProgress(): Record<string, number> {
  return getLevelProgressMap(VOCAB_STUDY_PROGRESS_KEY)
}

export function importVocabStudyProgress(progress: Record<string, number>) {
  importLevelProgress(VOCAB_STUDY_PROGRESS_KEY, progress)
}

export function getVocabStudyBatchSize(): number {
  return getBatchSize(VOCAB_STUDY_BATCH_SIZE_KEY)
}

export function setVocabStudyBatchSize(size: number) {
  localStorage.setItem(VOCAB_STUDY_BATCH_SIZE_KEY, String(size))
}
