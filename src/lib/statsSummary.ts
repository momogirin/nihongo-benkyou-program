import {
  getAllSrsState,
  getConjugationQuizHistory,
  getEnglishVocabQuizHistory,
  getGrammarQuizHistory,
  getMockExamHistory,
  getQuizHistory,
  getVocabQuizHistory,
  type SrsDomain,
} from './storage'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const SRS_MASTERED_BOX = 4
const MIN_SAMPLE_FOR_WEAKEST = 5

export interface WeeklyStats {
  total: number
  correct: number
  sessionCount: number
}

// 도메인 구분 없이 지난 7일간 전부 합산 — "이번 주 얼마나 복습했는지" 동기부여용
export function getWeeklyStats(): WeeklyStats {
  const cutoff = Date.now() - WEEK_MS
  const sessions = [
    ...getQuizHistory(),
    ...getVocabQuizHistory(),
    ...getGrammarQuizHistory(),
    ...getEnglishVocabQuizHistory(),
    ...getMockExamHistory(),
    ...getConjugationQuizHistory(),
  ]
  const recent = sessions.filter((s) => new Date(s.finishedAt).getTime() >= cutoff)
  return {
    total: recent.reduce((sum, s) => sum + s.total, 0),
    correct: recent.reduce((sum, s) => sum + s.correct, 0),
    sessionCount: recent.length,
  }
}

export interface SrsMastery {
  mastered: number
  reviewing: number
}

// SRS 박스 4(가장 긴 30일 간격)에 도달한 항목 = "충분히 외웠다"고 볼 수 있는 항목
export function getSrsMastery(domain: SrsDomain): SrsMastery {
  const entries = Object.values(getAllSrsState(domain))
  const mastered = entries.filter((e) => e.box >= SRS_MASTERED_BOX).length
  return { mastered, reviewing: entries.length - mastered }
}

export interface DomainAccuracy {
  domain: SrsDomain
  total: number
  correct: number
  rate: number
}

// 도메인별 전체 누적 정답률 — 일반 퀴즈 기록 + 모의고사 기록의 도메인별 브레이크다운을 합산
export function getDomainAccuracies(): DomainAccuracy[] {
  const totals: Record<SrsDomain, { total: number; correct: number }> = {
    kanji: { total: 0, correct: 0 },
    vocab: { total: 0, correct: 0 },
    grammar: { total: 0, correct: 0 },
    englishVocab: { total: 0, correct: 0 },
    // 가나·활용은 도메인별 정답률 집계 대상이 아님(아래 출력 리스트에 미포함) — 타입 충족용
    kana: { total: 0, correct: 0 },
    conjugation: { total: 0, correct: 0 },
  }
  for (const e of getQuizHistory()) {
    totals.kanji.total += e.total
    totals.kanji.correct += e.correct
  }
  for (const e of getVocabQuizHistory()) {
    totals.vocab.total += e.total
    totals.vocab.correct += e.correct
  }
  for (const e of getGrammarQuizHistory()) {
    totals.grammar.total += e.total
    totals.grammar.correct += e.correct
  }
  // 모의고사는 한자/단어/문법 세 도메인만 섞음 — 영어는 대상 밖(HANDOFF 참고)
  for (const e of getEnglishVocabQuizHistory()) {
    totals.englishVocab.total += e.total
    totals.englishVocab.correct += e.correct
  }
  for (const e of getMockExamHistory()) {
    for (const domain of ['kanji', 'vocab', 'grammar'] as const) {
      totals[domain].total += e.breakdown[domain].total
      totals[domain].correct += e.breakdown[domain].correct
    }
  }
  return (['kanji', 'vocab', 'grammar', 'englishVocab'] as const).map((domain) => ({
    domain,
    total: totals[domain].total,
    correct: totals[domain].correct,
    rate: totals[domain].total > 0 ? Math.round((totals[domain].correct / totals[domain].total) * 100) : 0,
  }))
}

// 표본이 너무 적은 도메인(5문항 미만)은 우연에 좌우되기 쉬워서 약점 후보에서 제외
export function getWeakestDomain(accuracies: DomainAccuracy[]): DomainAccuracy | null {
  const withEnoughData = accuracies.filter((a) => a.total >= MIN_SAMPLE_FOR_WEAKEST)
  if (withEnoughData.length === 0) return null
  return withEnoughData.reduce((min, a) => (a.rate < min.rate ? a : min))
}

// 도메인 단위보다 한 단계 세밀한 (도메인, 급수)별 누적 정답률. 퀴즈기록의 level
// 필드로 집계 — "어느 급수가 약한지"까지 콕 집어 복습을 안내하기 위함.
export interface DomainLevelAccuracy {
  domain: SrsDomain
  level: string
  total: number
  correct: number
  rate: number
}

export function getDomainLevelAccuracies(): DomainLevelAccuracy[] {
  const map = new Map<string, { domain: SrsDomain; level: string; total: number; correct: number }>()
  const add = (domain: SrsDomain, level: string, total: number, correct: number) => {
    if (total === 0) return
    const key = `${domain}|${level}`
    const cur = map.get(key) ?? { domain, level, total: 0, correct: 0 }
    cur.total += total
    cur.correct += correct
    map.set(key, cur)
  }
  // 한자는 config에 급수가 담김 — 여러 급수를 섞었거나 오답노트발(kanjiIds)이라
  // 급수가 하나로 특정되지 않는 회차는 급수별 집계에서 제외
  for (const e of getQuizHistory()) {
    if (e.config.kanjiIds || e.config.levels.length !== 1) continue
    add('kanji', e.config.levels[0], e.total, e.correct)
  }
  for (const e of getVocabQuizHistory()) add('vocab', e.level, e.total, e.correct)
  for (const e of getGrammarQuizHistory()) add('grammar', e.level, e.total, e.correct)
  for (const e of getEnglishVocabQuizHistory()) add('englishVocab', e.level, e.total, e.correct)
  // 모의고사는 회차마다 급수 하나 + 도메인별 브레이크다운
  for (const e of getMockExamHistory()) {
    for (const domain of ['kanji', 'vocab', 'grammar'] as const) {
      add(domain, e.level, e.breakdown[domain].total, e.breakdown[domain].correct)
    }
  }
  return [...map.values()].map((v) => ({
    ...v,
    rate: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
  }))
}

// 표본 충분한(5문항 이상) (도메인, 급수) 중 정답률이 가장 낮은 하나 — 홈의 "약점
// 집중" 카드가 여기로 바로 안내한다
export function getWeakestDomainLevel(accuracies: DomainLevelAccuracy[]): DomainLevelAccuracy | null {
  const withEnoughData = accuracies.filter((a) => a.total >= MIN_SAMPLE_FOR_WEAKEST)
  if (withEnoughData.length === 0) return null
  return withEnoughData.reduce((min, a) => (a.rate < min.rate ? a : min))
}
