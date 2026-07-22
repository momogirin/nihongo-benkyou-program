import { grammarList, type GrammarPoint } from '../data/grammar'
import type { KanjiLevel } from '../data/kanji'

export interface GrammarQuizQuestion {
  entry: GrammarPoint
  choices: GrammarPoint[]
}

const LEVEL_ORDER: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

// only levels grammarList actually has data for, in JLPT order — grows on
// its own as N3-N1 batches are added later, no page code changes needed
export const grammarAvailableLevels: KanjiLevel[] = LEVEL_ORDER.filter((level) =>
  grammarList.some((g) => g.level === level),
)

export function grammarLevelPool(level: KanjiLevel): GrammarPoint[] {
  return grammarList.filter((g) => g.level === level).sort((a, b) => a.num - b.num)
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// pattern -> meaningKr multiple choice, drawn from the given level's full
// pool so exam-style quizzing isn't limited to whatever's been studied so far.
// order: 'random' shuffles the draw (default), 'sequential' keeps the
// level's num order — same two options the kanji quiz already has.
export function generateGrammarQuestions(
  level: KanjiLevel,
  count: number,
  order: 'random' | 'sequential' = 'random',
): GrammarQuizQuestion[] {
  const pool = grammarLevelPool(level)
  const ordered = order === 'random' ? shuffle(pool) : pool
  const selected = ordered.slice(0, Math.min(count, pool.length))

  return selected.map((entry) => {
    const distractorPool = pool.filter((g) => g.id !== entry.id && g.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}

// same pattern -> meaningKr shape, but for a fixed set of ids (오답노트
// 재도전) instead of a level draw. Distractors still come from the entry's
// own level pool so choices stay plausible even when ids span levels.
export function generateGrammarQuestionsFromIds(ids: string[]): GrammarQuizQuestion[] {
  const entries = ids.map((id) => grammarList.find((g) => g.id === id)).filter((g): g is GrammarPoint => g !== undefined)

  return shuffle(entries).map((entry) => {
    const pool = grammarLevelPool(entry.level)
    const distractorPool = pool.filter((g) => g.id !== entry.id && g.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}

// 문법 빈칸 채우기 퀴즈("이 자리에 어떤 문형이 들어가야 하는가" — 뜻 맞히기와
// 달리 실제 JLPT 문법 파트와 정합) — blankJp/blankAnswer는 data/grammar-*.json에
// 서브에이전트가 항목별로 직접 판단해 채운 필드(자동 마스킹 아님, ROADMAP.md
// 1번 참고). 두 필드가 있는 항목만 출제 가능하므로, 아직 안 채워졌거나(신규
// 항목 추가 시) 문장 전체가 그 문형이라 빈칸을 못 만든 항목은 자연히 제외된다.
export interface GrammarBlankQuestion {
  entry: GrammarPoint
  choices: GrammarPoint[]
}

// blankJp/blankAnswer가 둘 다 있는 항목만 — optional 필드라 미완성 데이터가
// 섞여도(향후 새 문형 추가 등) 조용히 걸러진다
function hasBlank(entry: GrammarPoint): entry is GrammarPoint & { blankJp: string; blankAnswer: string } {
  return Boolean(entry.blankJp && entry.blankAnswer)
}

export function grammarBlankLevelPool(level: KanjiLevel): GrammarPoint[] {
  return grammarLevelPool(level).filter(hasBlank)
}

export function generateGrammarBlankQuestions(
  level: KanjiLevel,
  count: number,
  order: 'random' | 'sequential' = 'random',
): GrammarBlankQuestion[] {
  const pool = grammarBlankLevelPool(level)
  const ordered = order === 'random' ? shuffle(pool) : pool
  const selected = ordered.slice(0, Math.min(count, pool.length))

  return selected.map((entry) => {
    // 오답 선택지는 blankAnswer 텍스트가 겹치지 않는 문형끼리(같은 표현이 정답/오답에
    // 동시에 있으면 안 됨) — pool 밖(빈칸 없는 항목)도 고려할 필요 없이 같은 pool에서만 뽑음
    const distractorPool = pool.filter((g) => g.id !== entry.id && g.blankAnswer !== entry.blankAnswer)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}

// same shape, but for a fixed set of ids (오답노트 재도전) — ids without a
// blankable entry (e.g. data update removed blankJp) are silently skipped
export function generateGrammarBlankQuestionsFromIds(ids: string[]): GrammarBlankQuestion[] {
  const entries = ids
    .map((id) => grammarList.find((g) => g.id === id))
    .filter((g): g is GrammarPoint => g !== undefined)
    .filter(hasBlank)

  return shuffle(entries).map((entry) => {
    const pool = grammarBlankLevelPool(entry.level)
    const distractorPool = pool.filter((g) => g.id !== entry.id && g.blankAnswer !== entry.blankAnswer)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}
