import { kanjiList, type KanjiLevel } from '../data/kanji'
import { studyContentByKanjiId } from '../data/studyContent'
import { vocabList } from '../data/vocab'
import { grammarList } from '../data/grammar'
import { englishVocabList, type EnglishLevel } from '../data/englishVocab'
import {
  getAllSrsState,
  getEnglishVocabStudyProgress,
  getGrammarStudyProgress,
  getStudyProgress,
  getVocabStudyProgress,
  type SrsDomain,
} from './storage'

const ALL_LEVELS: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
// statsSummary.ts의 같은 상수와 동일한 기준(가장 긴 복습 간격에 도달 = 충분히 외움)
const SRS_MASTERED_BOX = 4
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

// ── 급수 단위 통합 진행률 ───────────────────────────────────────────────
// 위 함수들은 "첫 미완료 급수"를 도메인별로 따로 알려줄 뿐이라, "N4가 지금 어디까지
// 왔나 / 끝났나"를 알려면 화면 5개를 각각 들어가 봐야 했다. 급수 하나를 지정해
// 도메인들을 한 번에 합산한다.
//
// 진행률 막대는 "학습 카드를 넘긴 수"(각 화면이 이미 쓰는 기준)로 재고, 실제로
// 외운 수는 SRS 박스4 도달 수로 따로 병기한다 — 홈의 학습 진도 카드가 이미
// 쓰고 있는 "학습함 / 정착" 병기 방식과 같다.
//
// 가나·활용은 학습 진도(카드 넘김)를 저장하지 않는 퀴즈 전용 화면이라 여기 넣지
// 않는다. 넣으면 분모만 커지고 진행률이 영원히 100%가 안 된다.
export interface LevelDomainProgress {
  domain: 'kanji' | 'vocab' | 'grammar'
  label: string
  completed: number
  total: number
  mastered: number
}

export interface LevelProgress {
  level: KanjiLevel
  domains: LevelDomainProgress[]
  completed: number
  total: number
  mastered: number
}

// 해당 급수에 속한 id들 중 SRS 박스4(=충분히 외움)에 도달한 수.
// getSrsMastery는 도메인 전체 합계라 급수별로 쪼갤 수 없어 여기서 직접 센다.
function masteredIn(domain: SrsDomain, ids: string[]): number {
  const state = getAllSrsState(domain)
  return ids.filter((id) => (state[id]?.box ?? -1) >= SRS_MASTERED_BOX).length
}

export function getLevelProgress(level: KanjiLevel): LevelProgress {
  const kanjiIds = kanjiList.filter((k) => k.level === level && studyContentByKanjiId[k.id]).map((k) => k.id)
  const vocabIds = vocabList.filter((w) => w.level === level).map((w) => w.id)
  const grammarIds = grammarList.filter((g) => g.level === level).map((g) => g.id)

  const domains: LevelDomainProgress[] = [
    {
      domain: 'kanji',
      label: '한자',
      completed: Math.min(getStudyProgress(level), kanjiIds.length),
      total: kanjiIds.length,
      mastered: masteredIn('kanji', kanjiIds),
    },
    {
      domain: 'vocab',
      label: '단어',
      completed: Math.min(getVocabStudyProgress(level), vocabIds.length),
      total: vocabIds.length,
      mastered: masteredIn('vocab', vocabIds),
    },
    {
      domain: 'grammar',
      label: '문법',
      completed: Math.min(getGrammarStudyProgress(level), grammarIds.length),
      total: grammarIds.length,
      mastered: masteredIn('grammar', grammarIds),
    },
  ].filter((d) => d.total > 0)

  return {
    level,
    domains,
    completed: domains.reduce((s, d) => s + d.completed, 0),
    total: domains.reduce((s, d) => s + d.total, 0),
    mastered: domains.reduce((s, d) => s + d.mastered, 0),
  }
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
