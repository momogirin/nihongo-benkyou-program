import type { KanjiLevel } from '../data/kanji'
import type { QuizQuestion } from './quizGenerator'
import type {
  VocabQuizQuestion,
  VocabBlankQuestion,
  VocabWritingQuestion,
  VocabTransitivityQuestion,
  VocabSynonymQuestion,
  VocabUsageQuestion,
} from './vocabQuizGenerator'
import type { VocabWord } from '../data/vocab'
import type { GrammarQuizQuestion, GrammarBlankQuestion, GrammarSentenceQuestion } from './grammarQuizGenerator'
import type { MockExamQuestion } from './mockExamGenerator'
import type { EnglishVocabDerivationQuestion, EnglishVocabQuizQuestion } from './englishVocabQuizGenerator'
import type { EnglishLevel } from '../data/englishVocab'
import type {
  AnsweredQuestion,
  ConjugationQuizHistoryEntry,
  KanaQuizHistoryEntry,
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

// 가나 로마자 퀴즈(가나↔로마자, 낱자 재인)에서 틀린 낱자만 대상 — 표기 구분(pairs)
// 모드는 낱자 재인이 아니라 SRS와 마찬가지로 대상 아님(KanaQuiz의 recordSrsReview
// 호출 조건과 동일).
export interface KanaWrongNoteEntry {
  kanaId: string
  wrongAt: string
  source?: string
}

// 활용(活用) 드릴 오답노트 — SRS와 같은 단위(활용 기본형 entry.id: 엄선은 CJ-*,
// 급수 태깅 어휘는 vocab id N5-* 등)로 저장. 특정 활용형이 아니라 기본형 단위라
// 재도전은 활용 페이지의 SRS 복습 배너가 그대로 그 단어를 다시 물어본다.
export interface ConjugationWrongNoteEntry {
  conjugationId: string
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

// 단어 문맥 빈칸 채우기 퀴즈용 이어하기 상태 — 위 VocabInProgressQuiz와 나란한 별도
// 타입(질문/정답 shape이 달라 합칠 수 없음, GrammarBlankInProgressQuiz와 같은 이유)
export interface VocabBlankInProgressQuiz {
  level: KanjiLevel
  questions: VocabBlankQuestion[]
  index: number
  answers: { question: VocabBlankQuestion; selectedId: string; isCorrect: boolean }[]
  startedAt: string
}

// 단어 읽기 입력 퀴즈용 이어하기 상태 — 질문이 VocabWord 자체(4지선다 아님, 텍스트
// 입력)라 questions/answers shape이 또 다름
export interface VocabReadingInProgressQuiz {
  level: KanjiLevel
  questions: VocabWord[]
  index: number
  answers: { entry: VocabWord; userAnswer: string; isCorrect: boolean }[]
  startedAt: string
}

// 단어 표기 퀴즈(히라가나 → 한자)용 이어하기 상태 — 위 세 퀴즈와 나란한 별도 타입
export interface VocabWritingInProgressQuiz {
  level: KanjiLevel
  questions: VocabWritingQuestion[]
  index: number
  answers: { question: VocabWritingQuestion; selectedId: string; isCorrect: boolean }[]
  startedAt: string
}

// 자타동사 구분 퀴즈용 이어하기 상태 — 위 네 퀴즈와 나란한 별도 타입
export interface VocabTransitivityInProgressQuiz {
  level: KanjiLevel
  questions: VocabTransitivityQuestion[]
  index: number
  answers: { question: VocabTransitivityQuestion; selectedId: string; isCorrect: boolean }[]
  startedAt: string
}

export interface VocabSynonymInProgressQuiz {
  level: KanjiLevel
  questions: VocabSynonymQuestion[]
  index: number
  answers: { question: VocabSynonymQuestion; selectedId: string; isCorrect: boolean }[]
  startedAt: string
}

// 용법(用法) 퀴즈용 이어하기 상태 — 위 유의어와 나란한 별도 타입
export interface VocabUsageInProgressQuiz {
  level: KanjiLevel
  questions: VocabUsageQuestion[]
  index: number
  answers: { question: VocabUsageQuestion; selectedId: string; isCorrect: boolean }[]
  startedAt: string
}

export interface GrammarInProgressQuiz {
  level: KanjiLevel
  questions: GrammarQuizQuestion[]
  index: number
  answers: { question: GrammarQuizQuestion; selected: string; isCorrect: boolean }[]
  startedAt: string
}

// 문법 빈칸 채우기 퀴즈용 이어하기 상태 — 위 GrammarInProgressQuiz와 나란한 별도
// 타입(질문/정답 shape이 달라 합칠 수 없음, EnglishVocabDerivationInProgressQuiz와 같은 이유)
export interface GrammarBlankInProgressQuiz {
  level: KanjiLevel
  questions: GrammarBlankQuestion[]
  index: number
  answers: { question: GrammarBlankQuestion; selectedId: string; isCorrect: boolean }[]
  startedAt: string
}

// 문장 조각 배열(文の組み立て) 퀴즈용 이어하기 상태 — 정답이 selectedId가 아니라
// 배열한 조각 순서(arranged)라 answers shape이 다르다
export interface GrammarSentenceInProgressQuiz {
  level: KanjiLevel
  questions: GrammarSentenceQuestion[]
  index: number
  answers: { question: GrammarSentenceQuestion; arranged: string[]; isCorrect: boolean }[]
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

const WRONG_NOTES_KEY = 'kanjiApp.wrongNotes'
const VOCAB_WRONG_NOTES_KEY = 'kanjiApp.vocabWrongNotes'
const GRAMMAR_WRONG_NOTES_KEY = 'kanjiApp.grammarWrongNotes'
const ENGLISH_VOCAB_WRONG_NOTES_KEY = 'kanjiApp.englishVocabWrongNotes'
const KANA_WRONG_NOTES_KEY = 'kanjiApp.kanaWrongNotes'
const CONJUGATION_WRONG_NOTES_KEY = 'kanjiApp.conjugationWrongNotes'
const QUIZ_HISTORY_KEY = 'kanjiApp.quizHistory'
const VOCAB_QUIZ_HISTORY_KEY = 'kanjiApp.vocabQuizHistory'
const GRAMMAR_QUIZ_HISTORY_KEY = 'kanjiApp.grammarQuizHistory'
const ENGLISH_VOCAB_QUIZ_HISTORY_KEY = 'kanjiApp.englishVocabQuizHistory'
const CONJUGATION_QUIZ_HISTORY_KEY = 'kanjiApp.conjugationQuizHistory'
const KANA_QUIZ_HISTORY_KEY = 'kanjiApp.kanaQuizHistory'
const MOCK_EXAM_HISTORY_KEY = 'kanjiApp.mockExamHistory'
const QUIZ_HISTORY_LIMIT = 20
const IN_PROGRESS_QUIZ_KEY = 'kanjiApp.inProgressQuiz'
const VOCAB_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.vocabInProgressQuiz'
const VOCAB_BLANK_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.vocabBlankInProgressQuiz'
const VOCAB_READING_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.vocabReadingInProgressQuiz'
const VOCAB_WRITING_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.vocabWritingInProgressQuiz'
const VOCAB_TRANSITIVITY_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.vocabTransitivityInProgressQuiz'
const VOCAB_SYNONYM_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.vocabSynonymInProgressQuiz'
const VOCAB_USAGE_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.vocabUsageInProgressQuiz'
const GRAMMAR_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.grammarInProgressQuiz'
const GRAMMAR_BLANK_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.grammarBlankInProgressQuiz'
const GRAMMAR_SENTENCE_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.grammarSentenceInProgressQuiz'
const MOCK_EXAM_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.mockExamInProgressQuiz'
const ENGLISH_VOCAB_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.englishVocabInProgressQuiz'
const ENGLISH_VOCAB_DERIVATION_IN_PROGRESS_QUIZ_KEY = 'kanjiApp.englishVocabDerivationInProgressQuiz'
const STUDY_PROGRESS_KEY = 'kanjiApp.studyProgress'
const RADICAL_STUDY_PROGRESS_KEY = 'kanjiApp.radicalStudyProgress'
const VOCAB_STUDY_PROGRESS_KEY = 'kanjiApp.vocabStudyProgress'
const GRAMMAR_STUDY_PROGRESS_KEY = 'kanjiApp.grammarStudyProgress'
const ENGLISH_VOCAB_STUDY_PROGRESS_KEY = 'kanjiApp.englishVocabStudyProgress'
const DEFAULT_STUDY_BATCH_SIZE = 10

// SRS(간격반복 복습, 라이트너 방식): 퀴즈에서 맞히면 박스가 하나 올라가고 다음
// 복습일이 더 멀어지고, 틀리면 박스 0으로 돌아가 바로 다음날 다시 나옴.
// 학습(flashcard)이 아니라 퀴즈로 실제 recall을 테스트했을 때만 갱신됨.
export type SrsDomain = 'kanji' | 'vocab' | 'grammar' | 'englishVocab' | 'kana' | 'conjugation'

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
  kana: 'kanjiApp.srsKana',
  conjugation: 'kanjiApp.srsConjugation',
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

// 같은 다시, 활용(conjugation) 퀴즈 — level 대신 source/mode를 쓰는 별도 타입
export function getConjugationQuizHistory(): ConjugationQuizHistoryEntry[] {
  try {
    const raw = localStorage.getItem(CONJUGATION_QUIZ_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addConjugationQuizHistoryEntry(entry: ConjugationQuizHistoryEntry) {
  const history = [entry, ...getConjugationQuizHistory()].slice(0, QUIZ_HISTORY_LIMIT)
  localStorage.setItem(CONJUGATION_QUIZ_HISTORY_KEY, JSON.stringify(history))
}

export function importConjugationQuizHistory(entries: ConjugationQuizHistoryEntry[]) {
  const byId = new Map(getConjugationQuizHistory().map((entry) => [entry.id, entry]))
  for (const entry of entries) byId.set(entry.id, entry)
  const merged = [...byId.values()].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
  localStorage.setItem(CONJUGATION_QUIZ_HISTORY_KEY, JSON.stringify(merged.slice(0, QUIZ_HISTORY_LIMIT)))
}

// 같은 다시, 가나(kana) 퀴즈
export function getKanaQuizHistory(): KanaQuizHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KANA_QUIZ_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addKanaQuizHistoryEntry(entry: KanaQuizHistoryEntry) {
  const history = [entry, ...getKanaQuizHistory()].slice(0, QUIZ_HISTORY_LIMIT)
  localStorage.setItem(KANA_QUIZ_HISTORY_KEY, JSON.stringify(history))
}

export function importKanaQuizHistory(entries: KanaQuizHistoryEntry[]) {
  const byId = new Map(getKanaQuizHistory().map((entry) => [entry.id, entry]))
  for (const entry of entries) byId.set(entry.id, entry)
  const merged = [...byId.values()].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
  localStorage.setItem(KANA_QUIZ_HISTORY_KEY, JSON.stringify(merged.slice(0, QUIZ_HISTORY_LIMIT)))
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

// same again, for 단어 문맥 빈칸 채우기 퀴즈
export function getVocabBlankInProgressQuiz(): VocabBlankInProgressQuiz | null {
  try {
    const raw = localStorage.getItem(VOCAB_BLANK_IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveVocabBlankInProgressQuiz(state: VocabBlankInProgressQuiz) {
  localStorage.setItem(VOCAB_BLANK_IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearVocabBlankInProgressQuiz() {
  localStorage.removeItem(VOCAB_BLANK_IN_PROGRESS_QUIZ_KEY)
}

// same again, for 단어 읽기 입력 퀴즈
export function getVocabReadingInProgressQuiz(): VocabReadingInProgressQuiz | null {
  try {
    const raw = localStorage.getItem(VOCAB_READING_IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveVocabReadingInProgressQuiz(state: VocabReadingInProgressQuiz) {
  localStorage.setItem(VOCAB_READING_IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearVocabReadingInProgressQuiz() {
  localStorage.removeItem(VOCAB_READING_IN_PROGRESS_QUIZ_KEY)
}

// same again, for 단어 표기 퀴즈(히라가나 → 한자)
export function getVocabWritingInProgressQuiz(): VocabWritingInProgressQuiz | null {
  try {
    const raw = localStorage.getItem(VOCAB_WRITING_IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveVocabWritingInProgressQuiz(state: VocabWritingInProgressQuiz) {
  localStorage.setItem(VOCAB_WRITING_IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearVocabWritingInProgressQuiz() {
  localStorage.removeItem(VOCAB_WRITING_IN_PROGRESS_QUIZ_KEY)
}

// same again, for 자타동사 구분 퀴즈
export function getVocabTransitivityInProgressQuiz(): VocabTransitivityInProgressQuiz | null {
  try {
    const raw = localStorage.getItem(VOCAB_TRANSITIVITY_IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveVocabTransitivityInProgressQuiz(state: VocabTransitivityInProgressQuiz) {
  localStorage.setItem(VOCAB_TRANSITIVITY_IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearVocabTransitivityInProgressQuiz() {
  localStorage.removeItem(VOCAB_TRANSITIVITY_IN_PROGRESS_QUIZ_KEY)
}

// same again, for 유의어 퀴즈
export function getVocabSynonymInProgressQuiz(): VocabSynonymInProgressQuiz | null {
  try {
    const raw = localStorage.getItem(VOCAB_SYNONYM_IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveVocabSynonymInProgressQuiz(state: VocabSynonymInProgressQuiz) {
  localStorage.setItem(VOCAB_SYNONYM_IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearVocabSynonymInProgressQuiz() {
  localStorage.removeItem(VOCAB_SYNONYM_IN_PROGRESS_QUIZ_KEY)
}

// same again, for 용법(用法) 퀴즈
export function getVocabUsageInProgressQuiz(): VocabUsageInProgressQuiz | null {
  try {
    const raw = localStorage.getItem(VOCAB_USAGE_IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveVocabUsageInProgressQuiz(state: VocabUsageInProgressQuiz) {
  localStorage.setItem(VOCAB_USAGE_IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearVocabUsageInProgressQuiz() {
  localStorage.removeItem(VOCAB_USAGE_IN_PROGRESS_QUIZ_KEY)
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

// same again, for 문법 빈칸 채우기 퀴즈
export function getGrammarBlankInProgressQuiz(): GrammarBlankInProgressQuiz | null {
  try {
    const raw = localStorage.getItem(GRAMMAR_BLANK_IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveGrammarBlankInProgressQuiz(state: GrammarBlankInProgressQuiz) {
  localStorage.setItem(GRAMMAR_BLANK_IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearGrammarBlankInProgressQuiz() {
  localStorage.removeItem(GRAMMAR_BLANK_IN_PROGRESS_QUIZ_KEY)
}

// same again, for 문장 조각 배열(文の組み立て) 퀴즈
export function getGrammarSentenceInProgressQuiz(): GrammarSentenceInProgressQuiz | null {
  try {
    const raw = localStorage.getItem(GRAMMAR_SENTENCE_IN_PROGRESS_QUIZ_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveGrammarSentenceInProgressQuiz(state: GrammarSentenceInProgressQuiz) {
  localStorage.setItem(GRAMMAR_SENTENCE_IN_PROGRESS_QUIZ_KEY, JSON.stringify(state))
}

export function clearGrammarSentenceInProgressQuiz() {
  localStorage.removeItem(GRAMMAR_SENTENCE_IN_PROGRESS_QUIZ_KEY)
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

export function importVocabBlankInProgressQuiz(quiz: VocabBlankInProgressQuiz | null) {
  if (quiz && !getVocabBlankInProgressQuiz()) saveVocabBlankInProgressQuiz(quiz)
}

export function importVocabReadingInProgressQuiz(quiz: VocabReadingInProgressQuiz | null) {
  if (quiz && !getVocabReadingInProgressQuiz()) saveVocabReadingInProgressQuiz(quiz)
}

export function importVocabWritingInProgressQuiz(quiz: VocabWritingInProgressQuiz | null) {
  if (quiz && !getVocabWritingInProgressQuiz()) saveVocabWritingInProgressQuiz(quiz)
}

export function importVocabSynonymInProgressQuiz(quiz: VocabSynonymInProgressQuiz | null) {
  if (quiz && !getVocabSynonymInProgressQuiz()) saveVocabSynonymInProgressQuiz(quiz)
}

export function importVocabUsageInProgressQuiz(quiz: VocabUsageInProgressQuiz | null) {
  if (quiz && !getVocabUsageInProgressQuiz()) saveVocabUsageInProgressQuiz(quiz)
}

export function importVocabTransitivityInProgressQuiz(quiz: VocabTransitivityInProgressQuiz | null) {
  if (quiz && !getVocabTransitivityInProgressQuiz()) saveVocabTransitivityInProgressQuiz(quiz)
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

export function importGrammarInProgressQuiz(quiz: GrammarInProgressQuiz | null) {
  if (quiz && !getGrammarInProgressQuiz()) saveGrammarInProgressQuiz(quiz)
}

export function importGrammarBlankInProgressQuiz(quiz: GrammarBlankInProgressQuiz | null) {
  if (quiz && !getGrammarBlankInProgressQuiz()) saveGrammarBlankInProgressQuiz(quiz)
}

export function importGrammarSentenceInProgressQuiz(quiz: GrammarSentenceInProgressQuiz | null) {
  if (quiz && !getGrammarSentenceInProgressQuiz()) saveGrammarSentenceInProgressQuiz(quiz)
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

// same shape again, but for the 가나(kana) romaji quiz
export function getKanaWrongNotes(): KanaWrongNoteEntry[] {
  try {
    const raw = localStorage.getItem(KANA_WRONG_NOTES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addKanaWrongNotes(kanaIds: string[], source: string) {
  if (kanaIds.length === 0) return
  const byId = new Map(getKanaWrongNotes().map((entry) => [entry.kanaId, entry]))
  const wrongAt = new Date().toISOString()
  for (const kanaId of kanaIds) {
    byId.set(kanaId, { kanaId, wrongAt, source })
  }
  localStorage.setItem(KANA_WRONG_NOTES_KEY, JSON.stringify([...byId.values()]))
}

export function removeKanaWrongNote(kanaId: string) {
  const remaining = getKanaWrongNotes().filter((entry) => entry.kanaId !== kanaId)
  localStorage.setItem(KANA_WRONG_NOTES_KEY, JSON.stringify(remaining))
}

export function importKanaWrongNotes(entries: KanaWrongNoteEntry[]) {
  const byId = new Map(getKanaWrongNotes().map((entry) => [entry.kanaId, entry]))
  for (const entry of entries) {
    const existing = byId.get(entry.kanaId)
    if (!existing || existing.wrongAt < entry.wrongAt) {
      byId.set(entry.kanaId, entry)
    }
  }
  localStorage.setItem(KANA_WRONG_NOTES_KEY, JSON.stringify([...byId.values()]))
}

// same shape again, but for the 활용(conjugation) drill quiz
export function getConjugationWrongNotes(): ConjugationWrongNoteEntry[] {
  try {
    const raw = localStorage.getItem(CONJUGATION_WRONG_NOTES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addConjugationWrongNotes(conjugationIds: string[], source: string) {
  if (conjugationIds.length === 0) return
  const byId = new Map(getConjugationWrongNotes().map((entry) => [entry.conjugationId, entry]))
  const wrongAt = new Date().toISOString()
  for (const conjugationId of conjugationIds) {
    byId.set(conjugationId, { conjugationId, wrongAt, source })
  }
  localStorage.setItem(CONJUGATION_WRONG_NOTES_KEY, JSON.stringify([...byId.values()]))
}

export function removeConjugationWrongNote(conjugationId: string) {
  const remaining = getConjugationWrongNotes().filter((entry) => entry.conjugationId !== conjugationId)
  localStorage.setItem(CONJUGATION_WRONG_NOTES_KEY, JSON.stringify(remaining))
}

export function importConjugationWrongNotes(entries: ConjugationWrongNoteEntry[]) {
  const byId = new Map(getConjugationWrongNotes().map((entry) => [entry.conjugationId, entry]))
  for (const entry of entries) {
    const existing = byId.get(entry.conjugationId)
    if (!existing || existing.wrongAt < entry.wrongAt) {
      byId.set(entry.conjugationId, entry)
    }
  }
  localStorage.setItem(CONJUGATION_WRONG_NOTES_KEY, JSON.stringify([...byId.values()]))
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

// 한 번에 학습할 카드 수 — 급수 전체(N5 단어 718개)를 한 세션에 여는 대신
// "오늘 N개"로 끊는다. 화면별로 따로 기억한다(한자와 단어의 적정 분량이 다름).
// 0은 "전체"(분량을 안 끊고 남은 전부) 센티널 — 진도는 어차피 기록되므로
// 중간에 나가도 다음에 이어서 볼 수 있다.
export function getStudyBatchSize(screen: string): number {
  const saved = getSetupPrefs<{ batchSize: number }>(screen)?.batchSize
  return typeof saved === 'number' && saved >= 0 ? saved : DEFAULT_STUDY_BATCH_SIZE
}

export function setStudyBatchSize(screen: string, size: number) {
  setSetupPrefs<{ batchSize: number }>(screen, { batchSize: size })
}

// setup 화면에서 마지막으로 고른 급수/퀴즈종류/문항수 등을 화면별로 기억한다.
// 급수 하나를 여러 달에 걸쳐 도는데(N5 단어 718개) 매번 들어올 때마다 같은 선택을
// 반복하게 하는 건 그 자체가 학습 마찰이라, 다음 진입 시 기본값으로 되살린다.
// 값의 shape은 화면마다 달라서(단어는 퀴즈종류 7종, 문법은 3종) 화면이 자기
// 타입으로 읽고 쓰게 두고, 여기서는 저장/복원만 담당한다. 저장된 값이 더 이상
// 유효하지 않은 경우(퀴즈 종류가 코드에서 사라짐 등)를 호출부가 걸러낼 수 있도록
// 파싱 실패·키 부재는 null로 돌려준다.
const SETUP_PREFS_KEY = 'kanjiApp.setupPrefs'

export function getSetupPrefs<T>(screen: string): Partial<T> | null {
  const raw = localStorage.getItem(SETUP_PREFS_KEY)
  if (!raw) return null
  try {
    const all = JSON.parse(raw) as Record<string, Partial<T>>
    return all[screen] ?? null
  } catch {
    return null
  }
}

export function setSetupPrefs<T>(screen: string, prefs: Partial<T>) {
  const raw = localStorage.getItem(SETUP_PREFS_KEY)
  let all: Record<string, unknown> = {}
  if (raw) {
    try {
      all = JSON.parse(raw) as Record<string, unknown>
    } catch {
      // 손상된 값이면 통째로 다시 쓴다 — 화면 설정이라 유실돼도 기본값으로 복귀할 뿐
      all = {}
    }
  }
  all[screen] = { ...(all[screen] as object | undefined), ...prefs }
  localStorage.setItem(SETUP_PREFS_KEY, JSON.stringify(all))
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

// 학습 카드(플래시카드)의 "알겠음/모르겠음" 자가평가용 — 퀴즈 채점(recordSrsReview)보다
// 신뢰도가 낮으므로(정답을 몰라도 "알겠음"을 누를 수 있음) 박스를 완전히 신뢰해 올리지
// 않고 최대 1까지만 허용한다. 이렇게 하면:
// - SRS 큐에 전혀 없던 항목(플래시카드만 보고 퀴즈를 안 풀어본 단어)도 최소한 SRS
//   복습 대상에 편입되어, 기존 "퀴즈로 나온 적 있는 항목만 SRS에 진입"하는 한계를 메운다.
// - 이미 퀴즈로 박스 2~4까지 올라간 항목은 자가평가로 더 못 올라간다 — 진짜 정착도는
//   여전히 퀴즈 채점만으로 판단하게 유지(getSrsMastery의 "박스4=마스터" 판정이
//   자가평가만으로 부풀려지는 것을 막음).
// - "모르겠음"은 퀴즈 오답과 동일하게 박스 0 + 즉시 재복습 대상으로 리셋(이건 낮은
//   신뢰도로 완화할 이유가 없음 — 사용자가 모른다고 한 걸 믿어도 안전한 쪽).
export function recordSrsSelfCheck(domain: SrsDomain, itemId: string, knows: boolean) {
  const state = getSrsStateMap(domain)
  const prevBox = state[itemId]?.box
  const box = knows ? Math.min((prevBox ?? -1) + 1, 1) : 0
  state[itemId] = {
    box,
    dueAt: knows ? addDaysIso(SRS_BOX_INTERVAL_DAYS[box]) : new Date().toISOString(),
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
  version: 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28
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
  // added in version 15 (문법 빈칸 채우기 퀴즈) — optional so older backup files still validate
  grammarBlankInProgressQuiz?: GrammarBlankInProgressQuiz | null
  // added in version 28
  grammarSentenceInProgressQuiz?: GrammarSentenceInProgressQuiz | null
  // added in version 16 (단어 문맥 빈칸 채우기 퀴즈) — optional so older backup files still validate
  vocabBlankInProgressQuiz?: VocabBlankInProgressQuiz | null
  // added in version 17 (단어 읽기 입력 퀴즈) — optional so older backup files still validate
  vocabReadingInProgressQuiz?: VocabReadingInProgressQuiz | null
  // added in version 18 (단어 표기 퀴즈, 히라가나 → 한자) — optional so older backup files still validate
  vocabWritingInProgressQuiz?: VocabWritingInProgressQuiz | null
  // added in version 19 (자타동사 구분 퀴즈) — optional so older backup files still validate
  vocabTransitivityInProgressQuiz?: VocabTransitivityInProgressQuiz | null
  // added in version 20 (활용 드릴 SRS 연동) — optional so older backup files still validate
  srsConjugation?: Record<string, SrsEntry>
  // added in version 21 (가나 SRS 백업 편입) — optional so older backup files still validate
  srsKana?: Record<string, SrsEntry>
  // added in version 22 (가나 오답노트 편입) — optional so older backup files still validate
  kanaWrongNotes?: KanaWrongNoteEntry[]
  // added in version 23 (활용 드릴 오답노트 편입) — optional so older backup files still validate
  conjugationWrongNotes?: ConjugationWrongNoteEntry[]
  // added in version 24 (단어 유의어 퀴즈) — optional so older backup files still validate
  vocabSynonymInProgressQuiz?: VocabSynonymInProgressQuiz | null
  // added in version 27
  vocabUsageInProgressQuiz?: VocabUsageInProgressQuiz | null
  // added in version 25 (활용 퀴즈 기록 — 주간 통계/최근 기록 편입) — optional so older backup files still validate
  conjugationQuizHistory?: ConjugationQuizHistoryEntry[]
  // added in version 26 (가나 퀴즈 기록 — 주간 통계/최근 기록 편입) — optional so older backup files still validate
  kanaQuizHistory?: KanaQuizHistoryEntry[]
}

export function isBackupPayload(value: unknown): value is BackupPayload {
  return typeof value === 'object' && value !== null && Array.isArray((value as BackupPayload).wrongNotes)
}

export function buildBackupPayload(): BackupPayload {
  return {
    version: 28,
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
    grammarBlankInProgressQuiz: getGrammarBlankInProgressQuiz(),
    grammarSentenceInProgressQuiz: getGrammarSentenceInProgressQuiz(),
    vocabBlankInProgressQuiz: getVocabBlankInProgressQuiz(),
    vocabReadingInProgressQuiz: getVocabReadingInProgressQuiz(),
    vocabWritingInProgressQuiz: getVocabWritingInProgressQuiz(),
    vocabTransitivityInProgressQuiz: getVocabTransitivityInProgressQuiz(),
    srsConjugation: getAllSrsState('conjugation'),
    srsKana: getAllSrsState('kana'),
    kanaWrongNotes: getKanaWrongNotes(),
    conjugationWrongNotes: getConjugationWrongNotes(),
    vocabSynonymInProgressQuiz: getVocabSynonymInProgressQuiz(),
    vocabUsageInProgressQuiz: getVocabUsageInProgressQuiz(),
    conjugationQuizHistory: getConjugationQuizHistory(),
    kanaQuizHistory: getKanaQuizHistory(),
  }
}

// 이 앱이 localStorage에 쓰는 키는 전부 'kanjiApp.' 접두사를 쓴다(위 *_KEY
// 상수들, SETUP_PREFS_KEY, SRS_STATE_KEY 값 전부). 진행사항 초기화는 이
// 접두사로 시작하는 키를 통째로 지운다 — 새 학습 도메인이 늘어도 여기 목록을
// 따로 관리하지 않아도 되게. 단, 테마('kanjiApp.theme')는 진행사항이 아니라
// 화면 설정이므로 남긴다.
const PROGRESS_KEY_KEEP = new Set(['kanjiApp.theme'])

export function clearAllProgress() {
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key && key.startsWith('kanjiApp.') && !PROGRESS_KEY_KEEP.has(key)) toRemove.push(key)
  }
  for (const key of toRemove) localStorage.removeItem(key)
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
  if (payload.grammarBlankInProgressQuiz) importGrammarBlankInProgressQuiz(payload.grammarBlankInProgressQuiz)
  if (payload.grammarSentenceInProgressQuiz)
    importGrammarSentenceInProgressQuiz(payload.grammarSentenceInProgressQuiz)
  if (payload.vocabBlankInProgressQuiz) importVocabBlankInProgressQuiz(payload.vocabBlankInProgressQuiz)
  if (payload.vocabReadingInProgressQuiz) importVocabReadingInProgressQuiz(payload.vocabReadingInProgressQuiz)
  if (payload.vocabWritingInProgressQuiz) importVocabWritingInProgressQuiz(payload.vocabWritingInProgressQuiz)
  if (payload.vocabTransitivityInProgressQuiz)
    importVocabTransitivityInProgressQuiz(payload.vocabTransitivityInProgressQuiz)
  if (payload.srsConjugation) importSrsState('conjugation', payload.srsConjugation)
  if (payload.srsKana) importSrsState('kana', payload.srsKana)
  if (payload.kanaWrongNotes) importKanaWrongNotes(payload.kanaWrongNotes)
  if (payload.conjugationWrongNotes) importConjugationWrongNotes(payload.conjugationWrongNotes)
  if (payload.vocabSynonymInProgressQuiz) importVocabSynonymInProgressQuiz(payload.vocabSynonymInProgressQuiz)
  if (payload.vocabUsageInProgressQuiz) importVocabUsageInProgressQuiz(payload.vocabUsageInProgressQuiz)
  if (payload.conjugationQuizHistory) importConjugationQuizHistory(payload.conjugationQuizHistory)
  if (payload.kanaQuizHistory) importKanaQuizHistory(payload.kanaQuizHistory)
}
