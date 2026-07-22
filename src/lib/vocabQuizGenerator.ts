import { vocabList, type VocabWord } from '../data/vocab'
import type { KanjiLevel } from '../data/kanji'

export interface VocabQuizQuestion {
  entry: VocabWord
  choices: VocabWord[]
}

export function vocabLevelPool(level: KanjiLevel): VocabWord[] {
  return vocabList.filter((w) => w.level === level).sort((a, b) => a.num - b.num)
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// word+reading -> meaningKr multiple choice, drawn from the given level's
// full word pool so exam-style quizzing isn't limited to whatever's been
// studied so far. order: 'random' shuffles the draw (default), 'sequential'
// keeps the level's num order — same two options the kanji quiz already has.
export function generateVocabQuestions(
  level: KanjiLevel,
  count: number,
  order: 'random' | 'sequential' = 'random',
): VocabQuizQuestion[] {
  const pool = vocabLevelPool(level)
  const ordered = order === 'random' ? shuffle(pool) : pool
  const selected = ordered.slice(0, Math.min(count, pool.length))

  return selected.map((entry) => {
    const distractorPool = pool.filter((w) => w.id !== entry.id && w.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}

// same word/reading -> meaningKr shape, but for a fixed set of ids (오답노트
// 재도전) instead of a level draw. Distractors still come from the entry's
// own level pool so choices stay plausible even when ids span levels.
export function generateVocabQuestionsFromIds(ids: string[]): VocabQuizQuestion[] {
  const entries = ids.map((id) => vocabList.find((w) => w.id === id)).filter((w): w is VocabWord => w !== undefined)

  return shuffle(entries).map((entry) => {
    const pool = vocabLevelPool(entry.level)
    const distractorPool = pool.filter((w) => w.id !== entry.id && w.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}

// JLPT 文脈規定(문맥에 맞는 어휘 고르기) 유형 — 뜻 맞히기(word/reading -> meaningKr)와
// 달리 "이 문맥에 어떤 단어가 오는가"를 테스트한다. exampleJp에서 그 단어가 실제로
// 등장하는 자리를 _____로 가리고, 같은 급수의 다른 단어를 오답 선택지로 쓴다.
export interface VocabBlankQuestion {
  entry: VocabWord
  blankedSentence: string
  choices: VocabWord[]
}

// word가 세미콜론으로 여러 표기를 나열하는 경우(예: "足; 脚") 첫 표기만 사용
function primaryWord(word: string): string {
  return word.split(/[;；]/)[0].trim()
}

// exampleJp가 그 단어를 항상 원형 그대로 쓰는 건 아니고(활용형으로 등장하는 비율이
// 높음 — 예: "冷ます"가 "冷まして"로), 정확히 어디까지가 어간인지는 활용 규칙 없이는
// 알 수 없다. 그래서 원형 전체 매칭을 우선 시도하고, 실패하면 끝 1~2글자를 순서대로
// 떼어내며 재시도한다 — 단, 어간이 2글자 미만으로 줄어들면 다른 무관한 단어와 우연히
// 겹칠 위험이 커지므로 그쯤에서 포기하고 null을 반환한다(추측해서 자르지 않는다는
// 이 프로젝트 원칙, generateEnglishVocabDerivationQuestions의 blankSentence와 동일 정신).
const MIN_STEM_LENGTH = 2

function blankSentence(entry: VocabWord): string | null {
  if (!entry.exampleJp) return null
  const word = primaryWord(entry.word)
  if (entry.exampleJp.includes(word)) {
    return entry.exampleJp.replace(word, '_____')
  }
  for (let cut = 1; cut <= 2 && word.length - cut >= MIN_STEM_LENGTH; cut++) {
    const stem = word.slice(0, word.length - cut)
    if (entry.exampleJp.includes(stem)) {
      return entry.exampleJp.replace(stem, '_____')
    }
  }
  return null
}

export function vocabBlankLevelPool(level: KanjiLevel): VocabWord[] {
  return vocabLevelPool(level).filter((w) => blankSentence(w) !== null)
}

export function generateVocabBlankQuestions(
  level: KanjiLevel,
  count: number,
  order: 'random' | 'sequential' = 'random',
): VocabBlankQuestion[] {
  const pool = vocabBlankLevelPool(level)
  const ordered = order === 'random' ? shuffle(pool) : pool
  const selected = ordered.slice(0, Math.min(count, pool.length))

  return selected.map((entry) => {
    const distractorPool = pool.filter((w) => w.id !== entry.id && w.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, blankedSentence: blankSentence(entry)!, choices: shuffle([entry, ...distractors]) }
  })
}

// same shape, but for a fixed set of ids (오답노트 재도전) — ids that are no
// longer blankable (e.g. a data update changed exampleJp) are silently skipped
export function generateVocabBlankQuestionsFromIds(ids: string[]): VocabBlankQuestion[] {
  const entries = ids
    .map((id) => vocabList.find((w) => w.id === id))
    .filter((w): w is VocabWord => w !== undefined)
    .filter((w) => blankSentence(w) !== null)

  return shuffle(entries).map((entry) => {
    const pool = vocabBlankLevelPool(entry.level)
    const distractorPool = pool.filter((w) => w.id !== entry.id && w.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, blankedSentence: blankSentence(entry)!, choices: shuffle([entry, ...distractors]) }
  })
}

// 단어 읽기 입력 퀴즈 — 4지선다(재인)가 아니라 히라가나 직접 타이핑(산출)으로
// 실제 기억 강도를 테스트한다. word가 순수 히라가나라 reading이 사실상 word와
// 같은 항목(N4-309 ごらんになる 등)도 출제 대상에서 딱히 뺄 이유는 없지만, reading
// 자체가 비어 있는 방어적 케이스만 걸러낸다(현재 데이터엔 없지만 향후 데이터 추가 시 대비).
export function vocabReadingLevelPool(level: KanjiLevel): VocabWord[] {
  return vocabLevelPool(level).filter((w) => w.reading.trim() !== '')
}

export function generateVocabReadingQuestions(
  level: KanjiLevel,
  count: number,
  order: 'random' | 'sequential' = 'random',
): VocabWord[] {
  const pool = vocabReadingLevelPool(level)
  const ordered = order === 'random' ? shuffle(pool) : pool
  return ordered.slice(0, Math.min(count, pool.length))
}
