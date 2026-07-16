import type { KanjiLevel } from '../data/kanji'
import type { QuizQuestion } from './quizGenerator'
import type { VocabQuizQuestion } from './vocabQuizGenerator'
import type { GrammarQuizQuestion } from './grammarQuizGenerator'
import type { MockExamQuestion } from './mockExamGenerator'
import type {
  EnglishVocabDerivationQuestion,
  EnglishVocabDictationQuestion,
  EnglishVocabQuizQuestion,
} from './englishVocabQuizGenerator'
import type { EnglishLevel } from '../data/englishVocab'
import type {
  AnsweredQuestion,
  MockExamHistoryEntry,
  QuestionType,
  QuizConfig,
  QuizHistoryEntry,
  SimpleQuizHistoryEntry,
} from '../types'

// `source`: human-readable label for which test produced this wrong answer
// (e.g. "한자 퀴즈 · N3 · 한국 훈음 입력", "모의고사 · N2") — optional so
// entries written before this field existed still parse from localStorage.
// `questionType`: the kanji quiz question type that produced this wrong
// answer, so 오답 재도전 can replay the same type instead of always defaulting
// to 훈음 입력 — undefined for mock-exam-sourced entries, which don't map to
// any single kanji quiz question type
export interface WrongNoteEntry {
  kanjiId: string
  wrongAt: string
  source?: string
  questionType?: QuestionType
}

export interface VocabWrongNoteEntry {
  vocabId: string
  wrongAt: string
  source?: string
}

export interface GrammarWrongNoteEntry {
  grammarId: string
  wrongAt: string
  source?: string
}

export interface EnglishVocabWrongNoteEntry {
  englishVocabId: string
  wrongAt: string
  source?: string
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

// same "resume where you left off" idea as InProgressQuiz above, but for the
// 단어/문법/모의고사 quizzes — each keeps its own parallel state shape since
// their question/answer types differ (matches this repo's existing
// per-domain parallel-structure convention)
export interface VocabInProgressQuiz {
  level: KanjiLevel
  questions: VocabQuizQuestion[]
  index: number
  answers: { question: VocabQuizQuestion; selected: string; isCorrect: boolean }[]
  startedAt: string
}

export interface GrammarInProgressQuiz {
  level: KanjiLevel
  questions: GrammarQuizQuestion[]
  index: number
  answers: { question: GrammarQuizQuestion; selected: string; isCorrect: boolean }[]
  startedAt: string
}

export interface MockExamInProgressQuiz {
  level: KanjiLevel
  count: number
  questions: MockExamQuestion[]
  index: number
  answers: { question: MockExamQuestion; selectedLabel: string | null; isCorrect: boolean }[]
  startedAt: string
}

// same again, for 영어(TOEIC) 단어 퀴즈 — level is EnglishLevel (core1~3/toeic),
// not KanjiLevel, since 영어는 JLPT 급수 축을 안 씀
export interface EnglishVocabInProgressQuiz {
  level: EnglishLevel
  questions: EnglishVocabQuizQuestion[]
  index: number
  answers: { question: EnglishVocabQuizQuestion; selected: string; isCorrect: boolean }[]
  startedAt: string
}

// 파생어 세트 품사 변환 빈칸형 퀴즈용 이어하기 상태 — 위 EnglishVocabInProgressQuiz와
// 나란한 별도 타입(질문/정답 shape이 달라 합칠 수 없음, 모의고사가 단어/문법과
// 별도 InProgressQuiz를 쓰는 것과 같은 이유)
export interface EnglishVocabDerivationInProgressQuiz {
  level: EnglishLevel
  questions: EnglishVocabDerivationQuestion[]
  index: number
  answers: { question: EnglishVocabDerivationQuestion; selectedId: string; isCorrect: boolean }[]
  startedAt: string
}

// 딕테이션(듣고 쓰기) 퀴즈용 이어하기 상태 — 위 두 타입과 나란한 세 번째
// 병렬 구조(질문 shape은 entry뿐이지만 answers의 userAnswer가 텍스트 입력이라
// 역시 합칠 수 없음)
export interface EnglishVocabDictationInProgressQuiz {
  level: EnglishLevel
  questions: EnglishVocabDictationQuestion[]
  index: number
  answers: { question: EnglishVocabDictationQuestion; userAnswer: string; isCorrect: boolean }[]
  startedAt: string
}

const WRONG_NOTES_KEY = 'kanjiApp.wrongNotes'
const VOCAB_WRONG_NOTES_KEY = 'kanjiApp.vocabWrongNotes'
const GRAMMAR_WRONG_NOTES_KEY = 'kanjiApp.grammarWrongNotes'
const ENGLISH_VOCAB_WRONG_NOTES_KEY = 'kanjiApp.englishVocabWrongNotes'
const QUIZ_HISTORY_KEY = 'kanjiApp.quizHistory'
const VOCAB_QUIZ_HISTORY_KEY = 'kanjiApp.vocabQuizHistory'
const GRAMMAR_QUIZ_HISTORY_KEY = 'kanjiApp.grammarQuizHistory'
const ENGLISH_VOCAB_QUIZ_HISTORY_KEY = 'kanjiApp.englishVocabQuizHistory'
const MOCK_EXAM_HISTORY_KEY = 'kanjiApp.mockExamHistory'
const QUIZ_HISTORY_LIMIT = 20
const IN_PROGRESS_QUIZ_KEY = 'kanjiApp.inProgressQuiz'
const VOCAB_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.vocabInProgressQuiz'
const GRAMMAR_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.grammarInProgressQuiz'
const MOCK_EXAM_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.mockExamInProgressQuiz'
const ENGLISH_VOCAB_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.englishVocabInProgressQuiz'
const ENGLISH_VOCAB_DERIVATION_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.englishVocabDerivationInProgressQuiz'
const ENGLISH_VOCAB_DICTATION_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.englishVocabDictationInProgressQuiz'
const STUDY_PROGRESS_KEY = 'kanjiApp.studyProgress'
const RADICAL_STUDY_PROGRESS_KEY = 'kanjiApp.radicalStudyProgress'
const RADICAL_STUDY_BATCH_SIZE_KEY = 'kanjiApp.radicalStudyBatchSize'
const VOCAB_STUDY_PROGRESS_KEY = 'kanjiApp.vocabStudyProgress'
const GRAMMAR_STUDY_PROGRESS_KEY = 'kanjiApp.grammarStudyProgress'
const ENGLISH_VOCAB_STUDY_PROGRESS_KEY = 'kanjiApp.englishVocabStudyProgress'
const DEFAULT_STUDY_BATCH_SIZE = 10

// SRS(간격반복 복습, 라이트너 방식): 퀴즈에서 맞히면 박스가 하나 올라가고 다음
// 복습일이 더 멀어지고, 틀리면 박스 0으로 돌아가 바로 다음날 다시 나옴.
// 학습(flashcard)이 아니라 퀴즈로 실제 recall을 테스트했을 때만 갱신됨.
export type SrsDomain = 'kanji' | 'vocab' | 'grammar' | 'englishVocab'

export interface SrsEntry {
  box: number
  dueAt: string
  updatedAt: string
}

const SRS_STATE_KEY: Record<SrsDomain, string> = {
  kanji: 'kanjiApp.srsKanji',
  vocab: 'kanjiApp.srsVocab',
  grammar: 'kanjiApp.srsGrammar',
  englishVocab: 'kanjiApp.srsEnglishVocab',
}

const SRS_MAX_BOX = 4
const SRS_BOX_INTERVAL_DAYS = [1, 3, 7, 14, 30]

function addDaysIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function getWrongNotes(): WrongNoteEntry[] {
  try {
    const raw = localStorage.getItem(WRONG_NOTES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addWrongNotes(kanjiIds: string[], source: string, questionType?: QuestionType) {
  if (kanjiIds.length === 0) return
  const byId = new Map(getWrongNotes().map((entry) => [entry.kanjiId, entry]))
  const wrongAt = new Date().toISOString()
  for (const kanjiId of kanjiIds) {
    byId.set(kanjiId, { kanjiId, wrongAt, source, questionType })
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

// same shape/cap as the kanji quiz history above, but for 단어(vocab) quizzes
export function getVocabQuizHistory(): SimpleQuizHistoryEntry[] {
  try {
    const raw = localStorage.getItem(VOCAB_QUIZ_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addVocabQuizHistoryEntry(entry: SimpleQuizHistoryEntry) {
  const history = [entry, ...getVocabQuizHistory()].slice(0, QUIZ_HISTORY_LIMIT)
  localStorage.setItem(VOCAB_QUIZ_HISTORY_KEY, JSON.stringify(history))
}

export function importVocabQuizHistory(entries: SimpleQuizHistoryEntry[]) {
  const byId = new Map(getVocabQuizHistory().map((entry) => [entry.id, entry]))
  for (const entry of entries) byId.set(entry.id, entry)
  const merged = [...byId.values()].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
  localStorage.setItem(VOCAB_QUIZ_HISTORY_KEY, JSON.stringify(merged.slice(0, QUIZ_HISTORY_LIMIT)))
}

// same again, for 문법(grammar) quizzes
export function getGrammarQuizHistory(): SimpleQuizHistoryEntry[] {
  try {
    const raw = localStorage.getItem(GRAMMAR_QUIZ_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addGrammarQuizHistoryEntry(entry: SimpleQuizHistoryEntry) {
  const history = [entry, ...getGrammarQuizHistory()].slice(0, QUIZ_HISTORY_LIMIT)
  localStorage.setItem(GRAMMAR_QUIZ_HISTORY_KEY, JSON.stringify(history))
}

export function importGrammarQuizHistory(entries: SimpleQuizHistoryEntry[]) {
  const byId = new Map(getGrammarQuizHistory().map((entry) => [entry.id, entry]))
  for (const entry of entries) byId.set(entry.id, entry)
  const merged = [...byId.values()].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
  localStorage.setItem(GRAMMAR_QUIZ_HISTORY_KEY, JSON.stringify(merged.slice(0, QUIZ_HISTORY_LIMIT)))
}

// 같은 다시, 영어(TOEIC) 단어 quizzes
export function getEnglishVocabQuizHistory(): SimpleQuizHistoryEntry[] {
  try {
    const raw = localStorage.getItem(ENGLISH_VOCAB_QUIZ_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addEnglishVocabQuizHistoryEntry(entry: SimpleQuizHistoryEntry) {
  const history = [entry, ...getEnglishVocabQuizHistory()].slice(0, QUIZ_HISTORY_LIMIT)
  localStorage.setItem(ENGLISH_VOCAB_QUIZ_HISTORY_KEY, JSON.stringify(history))
}

export function importEnglishVocabQuizHistory(entries: SimpleQuizHistoryEntry[]) {
  const byId = new Map(getEnglishVocabQuizHistory().map((entry) => [entry.id, entry]))
  for (const entry of entries) byId.set(entry.id, entry)
  const merged = [...byId.values()].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
  localStorage.setItem(ENGLISH_VOCAB_QUIZ_HISTORY_KEY, JSON.stringify(merged.slice(0, QUIZ_HISTORY_LIMIT)))
}

// 모의고사(한자/단어/문법 통합) 기록 — 위 세 히스토리와 같은 패턴
export function getMockExamHistory(): MockExamHistoryEntry[] {
  try {
    const raw = localStorage.getItem(MOCK_EXAM_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addMockExamHistoryEntry(entry: MockExamHistoryEntry) {
  const history = [entry, ...getMockExamHistory()].slice(0, QUIZ_HISTORY_LIMIT)
  localStorage.setItem(MOCK_EXAM_HISTORY_KEY, JSON.stringify(history))
}

export function importMockExamHistory(entries: MockExamHistoryEntry[]) {
  const byId = new Map(getMockExamHistory().map((entry) => [entry.id, entry]))
  for (const entry of entries) byId.set(entry.id, entry)
  const merged = [...byId.values()].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
  localStorage.setItem(MOCK_EXAM_HISTORY_KEY, JSON.stringify(merged.slice(0, QUIZ_HISTORY_LIMIT)))
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

// same "resume where you left off" pattern as above, for 단어 퀴즈
export function getVocabInProgressQuiz(): VocabInProgressQuiz | null {
  try {
    const raw = localStorage.getItem(VOCAB_IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveVocabInProgressQuiz(state: VocabInProgressQuiz) {
  localStorage.setItem(VOCAB_IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearVocabInProgressQuiz() {
  localStorage.removeItem(VOCAB_IN_PROGRESS_QUIZ_KEY)
}

// same again, for 문법 퀴즈
export function getGrammarInProgressQuiz(): GrammarInProgressQuiz | null {
  try {
    const raw = localStorage.getItem(GRAMMAR_IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveGrammarInProgressQuiz(state: GrammarInProgressQuiz) {
  localStorage.setItem(GRAMMAR_IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearGrammarInProgressQuiz() {
  localStorage.removeItem(GRAMMAR_IN_PROGRESS_QUIZ_KEY)
}

// same again, for 모의고사 — startedAt is real wall-clock time, so resuming
// after a break naturally eats into the remaining countdown (matches how the
// timer already works: elapsed = Date.now() - startTime)
export function getMockExamInProgressQuiz(): MockExamInProgressQuiz | null {
  try {
    const raw = localStorage.getItem(MOCK_EXAM_IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveMockExamInProgressQuiz(state: MockExamInProgressQuiz) {
  localStorage.setItem(MOCK_EXAM_IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearMockExamInProgressQuiz() {
  localStorage.removeItem(MOCK_EXAM_IN_PROGRESS_QUIZ_KEY)
}

// same again, for 영어(TOEIC) 단어 퀴즈
export function getEnglishVocabInProgressQuiz(): EnglishVocabInProgressQuiz | null {
  try {
    const raw = localStorage.getItem(ENGLISH_VOCAB_IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveEnglishVocabInProgressQuiz(state: EnglishVocabInProgressQuiz) {
  localStorage.setItem(ENGLISH_VOCAB_IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearEnglishVocabInProgressQuiz() {
  localStorage.removeItem(ENGLISH_VOCAB_IN_PROGRESS_QUIZ_KEY)
}

// same "don't clobber an active local session" rule as importInProgressQuiz
export function importVocabInProgressQuiz(quiz: VocabInProgressQuiz | null) {
  if (quiz && !getVocabInProgressQuiz()) saveVocabInProgressQuiz(quiz)
}

export function importEnglishVocabInProgressQuiz(quiz: EnglishVocabInProgressQuiz | null) {
  if (quiz && !getEnglishVocabInProgressQuiz()) saveEnglishVocabInProgressQuiz(quiz)
}

// same again, for the 파생어 세트 품사 변환 빈칸형 퀴즈
export function getEnglishVocabDerivationInProgressQuiz(): EnglishVocabDerivationInProgressQuiz | null {
  try {
    const raw = localStorage.getItem(ENGLISH_VOCAB_DERIVATION_IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveEnglishVocabDerivationInProgressQuiz(state: EnglishVocabDerivationInProgressQuiz) {
  localStorage.setItem(ENGLISH_VOCAB_DERIVATION_IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearEnglishVocabDerivationInProgressQuiz() {
  localStorage.removeItem(ENGLISH_VOCAB_DERIVATION_IN_PROGRESS_QUIZ_KEY)
}

export function importEnglishVocabDerivationInProgressQuiz(quiz: EnglishVocabDerivationInProgressQuiz | null) {
  if (quiz && !getEnglishVocabDerivationInProgressQuiz()) saveEnglishVocabDerivationInProgressQuiz(quiz)
}

// same again, for the 딕테이션(듣고 쓰기) 퀴즈
export function getEnglishVocabDictationInProgressQuiz(): EnglishVocabDictationInProgressQuiz | null {
  try {
    const raw = localStorage.getItem(ENGLISH_VOCAB_DICTATION_IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveEnglishVocabDictationInProgressQuiz(state: EnglishVocabDictationInProgressQuiz) {
  localStorage.setItem(ENGLISH_VOCAB_DICTATION_IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearEnglishVocabDictationInProgressQuiz() {
  localStorage.removeItem(ENGLISH_VOCAB_DICTATION_IN_PROGRESS_QUIZ_KEY)
}

export function importEnglishVocabDictationInProgressQuiz(quiz: EnglishVocabDictationInProgressQuiz | null) {
  if (quiz && !getEnglishVocabDictationInProgressQuiz()) saveEnglishVocabDictationInProgressQuiz(quiz)
}

export function importGrammarInProgressQuiz(quiz: GrammarInProgressQuiz | null) {
  if (quiz && !getGrammarInProgressQuiz()) saveGrammarInProgressQuiz(quiz)
}

export function importMockExamInProgressQuiz(quiz: MockExamInProgressQuiz | null) {
  if (quiz && !getMockExamInProgressQuiz()) saveMockExamInProgressQuiz(quiz)
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

// same shape as the kanji wrong notes above, but for the 단어(vocab) quiz
export function getVocabWrongNotes(): VocabWrongNoteEntry[] {
  try {
    const raw = localStorage.getItem(VOCAB_WRONG_NOTES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addVocabWrongNotes(vocabIds: string[], source: string) {
  if (vocabIds.length === 0) return
  const byId = new Map(getVocabWrongNotes().map((entry) => [entry.vocabId, entry]))
  const wrongAt = new Date().toISOString()
  for (const vocabId of vocabIds) {
    byId.set(vocabId, { vocabId, wrongAt, source })
  }
  localStorage.setItem(VOCAB_WRONG_NOTES_KEY, JSON.stringify([...byId.values()]))
}

export function removeVocabWrongNote(vocabId: string) {
  const remaining = getVocabWrongNotes().filter((entry) => entry.vocabId !== vocabId)
  localStorage.setItem(VOCAB_WRONG_NOTES_KEY, JSON.stringify(remaining))
}

export function importVocabWrongNotes(entries: VocabWrongNoteEntry[]) {
  const byId = new Map(getVocabWrongNotes().map((entry) => [entry.vocabId, entry]))
  for (const entry of entries) {
    const existing = byId.get(entry.vocabId)
    if (!existing || existing.wrongAt < entry.wrongAt) {
      byId.set(entry.vocabId, entry)
    }
  }
  localStorage.setItem(VOCAB_WRONG_NOTES_KEY, JSON.stringify([...byId.values()]))
}

// same shape again, but for the 영어(TOEIC) 단어 quiz
export function getEnglishVocabWrongNotes(): EnglishVocabWrongNoteEntry[] {
  try {
    const raw = localStorage.getItem(ENGLISH_VOCAB_WRONG_NOTES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addEnglishVocabWrongNotes(englishVocabIds: string[], source: string) {
  if (englishVocabIds.length === 0) return
  const byId = new Map(getEnglishVocabWrongNotes().map((entry) => [entry.englishVocabId, entry]))
  const wrongAt = new Date().toISOString()
  for (const englishVocabId of englishVocabIds) {
    byId.set(englishVocabId, { englishVocabId, wrongAt, source })
  }
  localStorage.setItem(ENGLISH_VOCAB_WRONG_NOTES_KEY, JSON.stringify([...byId.values()]))
}

export function removeEnglishVocabWrongNote(englishVocabId: string) {
  const remaining = getEnglishVocabWrongNotes().filter((entry) => entry.englishVocabId !== englishVocabId)
  localStorage.setItem(ENGLISH_VOCAB_WRONG_NOTES_KEY, JSON.stringify(remaining))
}

export function importEnglishVocabWrongNotes(entries: EnglishVocabWrongNoteEntry[]) {
  const byId = new Map(getEnglishVocabWrongNotes().map((entry) => [entry.englishVocabId, entry]))
  for (const entry of entries) {
    const existing = byId.get(entry.englishVocabId)
    if (!existing || existing.wrongAt < entry.wrongAt) {
      byId.set(entry.englishVocabId, entry)
    }
  }
  localStorage.setItem(ENGLISH_VOCAB_WRONG_NOTES_KEY, JSON.stringify([...byId.values()]))
}

// same shape again, but for the 문법(grammar) quiz
export function getGrammarWrongNotes(): GrammarWrongNoteEntry[] {
  try {
    const raw = localStorage.getItem(GRAMMAR_WRONG_NOTES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addGrammarWrongNotes(grammarIds: string[], source: string) {
  if (grammarIds.length === 0) return
  const byId = new Map(getGrammarWrongNotes().map((entry) => [entry.grammarId, entry]))
  const wrongAt = new Date().toISOString()
  for (const grammarId of grammarIds) {
    byId.set(grammarId, { grammarId, wrongAt, source })
  }
  localStorage.setItem(GRAMMAR_WRONG_NOTES_KEY, JSON.stringify([...byId.values()]))
}

export function removeGrammarWrongNote(grammarId: string) {
  const remaining = getGrammarWrongNotes().filter((entry) => entry.grammarId !== grammarId)
  localStorage.setItem(GRAMMAR_WRONG_NOTES_KEY, JSON.stringify(remaining))
}

export function importGrammarWrongNotes(entries: GrammarWrongNoteEntry[]) {
  const byId = new Map(getGrammarWrongNotes().map((entry) => [entry.grammarId, entry]))
  for (const entry of entries) {
    const existing = byId.get(entry.grammarId)
    if (!existing || existing.wrongAt < entry.wrongAt) {
      byId.set(entry.grammarId, entry)
    }
  }
  localStorage.setItem(GRAMMAR_WRONG_NOTES_KEY, JSON.stringify([...byId.values()]))
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

// same shape again, but for the 문법(grammar) 학습 flow
export function getGrammarStudyProgress(level: KanjiLevel): number {
  return getLevelProgressMap(GRAMMAR_STUDY_PROGRESS_KEY)[level] ?? 0
}

export function setGrammarStudyProgress(level: KanjiLevel, completedCount: number) {
  setLevelProgress(GRAMMAR_STUDY_PROGRESS_KEY, level, completedCount)
}

export function getAllGrammarStudyProgress(): Record<string, number> {
  return getLevelProgressMap(GRAMMAR_STUDY_PROGRESS_KEY)
}

export function importGrammarStudyProgress(progress: Record<string, number>) {
  importLevelProgress(GRAMMAR_STUDY_PROGRESS_KEY, progress)
}

// same shape again, but for the 영어(TOEIC) 단어 학습 flow — level is
// EnglishLevel(core1~3/toeic), so this doesn't reuse setLevelProgress/
// importLevelProgress's KanjiLevel-typed setter (though it does reuse the
// generic getLevelProgressMap/merge logic, which never actually depended on
// KanjiLevel to begin with)
export function getEnglishVocabStudyProgress(level: EnglishLevel): number {
  return getLevelProgressMap(ENGLISH_VOCAB_STUDY_PROGRESS_KEY)[level] ?? 0
}

export function setEnglishVocabStudyProgress(level: EnglishLevel, completedCount: number) {
  const all = getLevelProgressMap(ENGLISH_VOCAB_STUDY_PROGRESS_KEY)
  all[level] = completedCount
  localStorage.setItem(ENGLISH_VOCAB_STUDY_PROGRESS_KEY, JSON.stringify(all))
}

export function getAllEnglishVocabStudyProgress(): Record<string, number> {
  return getLevelProgressMap(ENGLISH_VOCAB_STUDY_PROGRESS_KEY)
}

export function importEnglishVocabStudyProgress(progress: Record<string, number>) {
  importLevelProgress(ENGLISH_VOCAB_STUDY_PROGRESS_KEY, progress)
}

function getSrsStateMap(domain: SrsDomain): Record<string, SrsEntry> {
  try {
    const raw = localStorage.getItem(SRS_STATE_KEY[domain])
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function getAllSrsState(domain: SrsDomain): Record<string, SrsEntry> {
  return getSrsStateMap(domain)
}

// call once per quiz question answered (not on flashcard 학습) — correct
// answers push the box up (further out next review), wrong answers reset to
// box 0 (due again tomorrow)
export function recordSrsReview(domain: SrsDomain, itemId: string, correct: boolean) {
  const state = getSrsStateMap(domain)
  const prevBox = state[itemId]?.box
  const box = correct ? Math.min((prevBox ?? -1) + 1, SRS_MAX_BOX) : 0
  state[itemId] = {
    box,
    // wrong answers resurface right away (dueAt = now) instead of waiting a
    // full box-0 interval — only a correct answer earns the longer gap
    dueAt: correct ? addDaysIso(SRS_BOX_INTERVAL_DAYS[box]) : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(SRS_STATE_KEY[domain], JSON.stringify(state))
}

// which of these ids are due for review right now — only ids that have been
// quizzed at least once even show up (never-studied items aren't "due")
export function getDueSrsIds(domain: SrsDomain, candidateIds: string[]): string[] {
  const state = getSrsStateMap(domain)
  const now = new Date().toISOString()
  return candidateIds.filter((id) => {
    const entry = state[id]
    return entry !== undefined && entry.dueAt <= now
  })
}

// merges by item id, keeping whichever side was updated more recently —
// same "newest wins" rule used by wrong notes/quiz history above
export function importSrsState(domain: SrsDomain, entries: Record<string, SrsEntry>) {
  const state = getSrsStateMap(domain)
  for (const [id, entry] of Object.entries(entries)) {
    const existing = state[id]
    if (!existing || existing.updatedAt < entry.updatedAt) state[id] = entry
  }
  localStorage.setItem(SRS_STATE_KEY[domain], JSON.stringify(state))
}

// the full local-storage snapshot shared by BackupPage's file export/import
// and cloud sync (src/lib/cloudSync.ts) — one shape, one place that builds
// and applies it, so the two stay in sync automatically
export interface BackupPayload {
  version: 8 | 9 | 10 | 11 | 12 | 13 | 14
  exportedAt: string
  wrongNotes: WrongNoteEntry[]
  quizHistory: QuizHistoryEntry[]
  studyProgress: Record<string, number>
  radicalStudyProgress: Record<string, number>
  vocabStudyProgress: Record<string, number>
  grammarStudyProgress: Record<string, number>
  vocabWrongNotes: VocabWrongNoteEntry[]
  grammarWrongNotes: GrammarWrongNoteEntry[]
  vocabQuizHistory: SimpleQuizHistoryEntry[]
  grammarQuizHistory: SimpleQuizHistoryEntry[]
  inProgressQuiz: InProgressQuiz | null
  // added in version 9 — optional so older backup files (version 8) still validate
  srsKanji?: Record<string, SrsEntry>
  srsVocab?: Record<string, SrsEntry>
  srsGrammar?: Record<string, SrsEntry>
  // added in version 10 — optional so older backup files still validate
  mockExamHistory?: MockExamHistoryEntry[]
  // added in version 11 — optional so older backup files still validate
  vocabInProgressQuiz?: VocabInProgressQuiz | null
  grammarInProgressQuiz?: GrammarInProgressQuiz | null
  mockExamInProgressQuiz?: MockExamInProgressQuiz | null
  // added in version 12 (영어/TOEIC 단어 도메인) — optional so older backup files still validate
  englishVocabStudyProgress?: Record<string, number>
  englishVocabWrongNotes?: EnglishVocabWrongNoteEntry[]
  englishVocabQuizHistory?: SimpleQuizHistoryEntry[]
  srsEnglishVocab?: Record<string, SrsEntry>
  englishVocabInProgressQuiz?: EnglishVocabInProgressQuiz | null
  // added in version 13 (영어단어 파생어 세트 품사 변환 빈칸형 퀴즈) — optional so older backup files still validate
  englishVocabDerivationInProgressQuiz?: EnglishVocabDerivationInProgressQuiz | null
  // added in version 14 (영어단어 딕테이션 퀴즈) — optional so older backup files still validate
  englishVocabDictationInProgressQuiz?: EnglishVocabDictationInProgressQuiz | null
}

export function isBackupPayload(value: unknown): value is BackupPayload {
  return typeof value === 'object' && value !== null && Array.isArray((value as BackupPayload).wrongNotes)
}

export function buildBackupPayload(): BackupPayload {
  return {
    version: 14,
    exportedAt: new Date().toISOString(),
    wrongNotes: getWrongNotes(),
    quizHistory: getQuizHistory(),
    studyProgress: getAllStudyProgress(),
    radicalStudyProgress: getAllRadicalStudyProgress(),
    vocabStudyProgress: getAllVocabStudyProgress(),
    grammarStudyProgress: getAllGrammarStudyProgress(),
    vocabWrongNotes: getVocabWrongNotes(),
    grammarWrongNotes: getGrammarWrongNotes(),
    vocabQuizHistory: getVocabQuizHistory(),
    grammarQuizHistory: getGrammarQuizHistory(),
    inProgressQuiz: getInProgressQuiz(),
    srsKanji: getAllSrsState('kanji'),
    srsVocab: getAllSrsState('vocab'),
    srsGrammar: getAllSrsState('grammar'),
    mockExamHistory: getMockExamHistory(),
    vocabInProgressQuiz: getVocabInProgressQuiz(),
    grammarInProgressQuiz: getGrammarInProgressQuiz(),
    mockExamInProgressQuiz: getMockExamInProgressQuiz(),
    englishVocabStudyProgress: getAllEnglishVocabStudyProgress(),
    englishVocabWrongNotes: getEnglishVocabWrongNotes(),
    englishVocabQuizHistory: getEnglishVocabQuizHistory(),
    srsEnglishVocab: getAllSrsState('englishVocab'),
    englishVocabInProgressQuiz: getEnglishVocabInProgressQuiz(),
    englishVocabDerivationInProgressQuiz: getEnglishVocabDerivationInProgressQuiz(),
    englishVocabDictationInProgressQuiz: getEnglishVocabDictationInProgressQuiz(),
  }
}

// merges a payload into local storage — every import* below takes the union
// (progress: max, notes/history: newest-wins by id), so applying a cloud
// snapshot can never erase progress made locally since the last sync
export function applyBackupPayload(payload: Partial<BackupPayload> & { wrongNotes: WrongNoteEntry[] }) {
  importWrongNotes(payload.wrongNotes)
  if (payload.quizHistory) importQuizHistory(payload.quizHistory)
  if (payload.studyProgress) importStudyProgress(payload.studyProgress)
  if (payload.radicalStudyProgress) importRadicalStudyProgress(payload.radicalStudyProgress)
  if (payload.vocabStudyProgress) importVocabStudyProgress(payload.vocabStudyProgress)
  if (payload.grammarStudyProgress) importGrammarStudyProgress(payload.grammarStudyProgress)
  if (payload.vocabWrongNotes) importVocabWrongNotes(payload.vocabWrongNotes)
  if (payload.grammarWrongNotes) importGrammarWrongNotes(payload.grammarWrongNotes)
  if (payload.vocabQuizHistory) importVocabQuizHistory(payload.vocabQuizHistory)
  if (payload.grammarQuizHistory) importGrammarQuizHistory(payload.grammarQuizHistory)
  if (payload.inProgressQuiz) importInProgressQuiz(payload.inProgressQuiz)
  if (payload.srsKanji) importSrsState('kanji', payload.srsKanji)
  if (payload.srsVocab) importSrsState('vocab', payload.srsVocab)
  if (payload.srsGrammar) importSrsState('grammar', payload.srsGrammar)
  if (payload.mockExamHistory) importMockExamHistory(payload.mockExamHistory)
  if (payload.vocabInProgressQuiz) importVocabInProgressQuiz(payload.vocabInProgressQuiz)
  if (payload.grammarInProgressQuiz) importGrammarInProgressQuiz(payload.grammarInProgressQuiz)
  if (payload.mockExamInProgressQuiz) importMockExamInProgressQuiz(payload.mockExamInProgressQuiz)
  if (payload.englishVocabStudyProgress) importEnglishVocabStudyProgress(payload.englishVocabStudyProgress)
  if (payload.englishVocabWrongNotes) importEnglishVocabWrongNotes(payload.englishVocabWrongNotes)
  if (payload.englishVocabQuizHistory) importEnglishVocabQuizHistory(payload.englishVocabQuizHistory)
  if (payload.srsEnglishVocab) importSrsState('englishVocab', payload.srsEnglishVocab)
  if (payload.englishVocabInProgressQuiz) importEnglishVocabInProgressQuiz(payload.englishVocabInProgressQuiz)
  if (payload.englishVocabDerivationInProgressQuiz)
    importEnglishVocabDerivationInProgressQuiz(payload.englishVocabDerivationInProgressQuiz)
  if (payload.englishVocabDictationInProgressQuiz)
    importEnglishVocabDictationInProgressQuiz(payload.englishVocabDictationInProgressQuiz)
}
