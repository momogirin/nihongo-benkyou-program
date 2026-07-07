import { kanjiList, type KanjiLevel } from '../data/kanji'
import { studyContentByKanjiId } from '../data/studyContent'
import { getStudyProgress } from './storage'

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
