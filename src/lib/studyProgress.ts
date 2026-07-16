import { kanjiList, type KanjiLevel } from '../data/kanji'
import { studyContentByKanjiId } from '../data/studyContent'
import { vocabList } from '../data/vocab'
import { grammarList } from '../data/grammar'
import { englishVocabList, type EnglishLevel } from '../data/englishVocab'
import { getEnglishVocabStudyProgress, getGrammarStudyProgress, getStudyProgress, getVocabStudyProgress } from './storage'

const ALL_LEVELS: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
const ALL_ENGLISH_LEVELS: EnglishLevel[] = ['core1', 'core2', 'core3', 'toeic']

export interface StudyProgressSummary {
  level: KanjiLevel | EnglishLevel
  completed: number
  total: number
}

function levelPoolSize(level: KanjiLevel): number {
  return kanjiList.filter((k) => k.level === level && studyContentByKanjiId[k.id]).length
}

// first level (N5→N1) that has study content and isn't finished yet, so
// HomePage can show "이어서 학습하기" without duplicating StudyPage's own
// per-level pool/progress bookkeeping
export function getStudyProgressSummary(): StudyProgressSummary | null {
  for (const level of ALL_LEVELS) {
    const total = levelPoolSize(level)
    if (total === 0) continue
    const completed = Math.min(getStudyProgress(level), total)
    if (completed < total) return { level, completed, total }
  }
  return null
}

// same "first unfinished level" summary, but for the 단어(vocab) study flow
export function getVocabStudyProgressSummary(): StudyProgressSummary | null {
  for (const level of ALL_LEVELS) {
    const total = vocabList.filter((w) => w.level === level).length
    if (total === 0) continue
    const completed = Math.min(getVocabStudyProgress(level), total)
    if (completed < total) return { level, completed, total }
  }
  return null
}

// same again, for the 문법(grammar) study flow
export function getGrammarStudyProgressSummary(): StudyProgressSummary | null {
  for (const level of ALL_LEVELS) {
    const total = grammarList.filter((g) => g.level === level).length
    if (total === 0) continue
    const completed = Math.min(getGrammarStudyProgress(level), total)
    if (completed < total) return { level, completed, total }
  }
  return null
}

// same again, for the 영어(TOEIC) 단어 study flow — level order is core1→toeic
// (easy→specialized) instead of JLPT's N5→N1, and core2/core3/toeic can be
// empty (still being filled in) so the total===0 skip matters here too
export function getEnglishVocabStudyProgressSummary(): StudyProgressSummary | null {
  for (const level of ALL_ENGLISH_LEVELS) {
    const total = englishVocabList.filter((w) => w.level === level).length
    if (total === 0) continue
    const completed = Math.min(getEnglishVocabStudyProgress(level), total)
    if (completed < total) return { level, completed, total }
  }
  return null
}
