import { kanjiList, type KanjiLevel } from '../data/kanji'
import { studyContentByKanjiId } from '../data/studyContent'
import { vocabList } from '../data/vocab'
import { grammarList } from '../data/grammar'
import { getGrammarStudyProgress, getStudyProgress, getVocabStudyProgress } from './storage'

const ALL_LEVELS: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

export interface StudyProgressSummary {
  level: KanjiLevel
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
