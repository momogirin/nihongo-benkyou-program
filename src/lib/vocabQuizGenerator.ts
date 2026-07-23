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

// JLPT 表記(히라가나 → 한자 표기 고르기) 유형 — reading을 프롬프트로 주고 올바른
// 한자 표기(word)를 4지선다로 고른다. word가 순수 히라가나라 word===reading인
// 항목(순수 가나 표기 단어)은 "표기"라는 개념 자체가 성립하지 않으므로 제외.
export interface VocabWritingQuestion {
  entry: VocabWord
  choices: VocabWord[]
}

const KANJI_CHAR_RE = /[一-龯々]/g

function kanjiChars(word: string): Set<string> {
  return new Set(primaryWord(word).match(KANJI_CHAR_RE) ?? [])
}

// 무작위 오답이면 답이 너무 뻔해서 변별력이 없다 — 진짜 헷갈릴 만한 오답을
// 우선순위로 뽑는다: ①읽기 첫 글자가 같음(음이 비슷해 헷갈리기 쉬움) ②한자를
// 하나라도 공유(자주 혼동하는 유사 한자어) ③그래도 부족하면 나머지 무작위
function pickDistractors(entry: VocabWord, pool: VocabWord[]): VocabWord[] {
  const others = pool.filter((w) => w.id !== entry.id && primaryWord(w.word) !== primaryWord(entry.word))
  const entryKanji = kanjiChars(entry.word)
  const readingHead = entry.reading.slice(0, 1)

  const sameReadingHead = others.filter((w) => w.reading.slice(0, 1) === readingHead)
  const sharesKanji = others.filter((w) => [...kanjiChars(w.word)].some((c) => entryKanji.has(c)))
  const rest = others

  const picked: VocabWord[] = []
  const usedIds = new Set<string>()
  for (const source of [shuffle(sameReadingHead), shuffle(sharesKanji), shuffle(rest)]) {
    for (const w of source) {
      if (picked.length >= 3) break
      if (usedIds.has(w.id)) continue
      usedIds.add(w.id)
      picked.push(w)
    }
    if (picked.length >= 3) break
  }
  return picked
}

// word===reading(순수 가나 표기)인 항목은 "표기"를 물을 수 없으므로 출제 풀에서 제외
export function vocabWritingLevelPool(level: KanjiLevel): VocabWord[] {
  return vocabLevelPool(level).filter((w) => primaryWord(w.word) !== w.reading)
}

export function generateVocabWritingQuestions(
  level: KanjiLevel,
  count: number,
  order: 'random' | 'sequential' = 'random',
): VocabWritingQuestion[] {
  const pool = vocabWritingLevelPool(level)
  const ordered = order === 'random' ? shuffle(pool) : pool
  const selected = ordered.slice(0, Math.min(count, pool.length))

  return selected.map((entry) => {
    const distractors = pickDistractors(entry, pool)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}

// same shape, but for a fixed set of ids (오답노트 재도전)
export function generateVocabWritingQuestionsFromIds(ids: string[]): VocabWritingQuestion[] {
  const entries = ids
    .map((id) => vocabList.find((w) => w.id === id))
    .filter((w): w is VocabWord => w !== undefined)
    .filter((w) => primaryWord(w.word) !== w.reading)

  return shuffle(entries).map((entry) => {
    const pool = vocabWritingLevelPool(entry.level)
    const distractors = pickDistractors(entry, pool)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}

// 자타동사(自動詞・他動詞) 구분 퀴즈 — transitivityPairId가 같은 단어들(예: 上がる/上げる)
// 끼리 묶어, exampleJp 빈칸에 문맥상 맞는 형태를 고르게 한다. VocabBlankQuestion과 달리
// 오답 선택지가 "무관한 단어"가 아니라 "같은 짝의 다른 형태"라서 진짜 자타동사 구분
// 능력을 테스트한다(뜻을 몰라도 무작위로 찍어 맞힐 수 없음 — 짝 전체가 뜻은 비슷하고
// 문형만 다름).
export interface VocabTransitivityQuestion {
  entry: VocabWord
  blankedSentence: string
  choices: VocabWord[]
}

function transitivityPairMembers(entry: VocabWord): VocabWord[] {
  if (!entry.transitivityPairId) return []
  return vocabList.filter((w) => w.transitivityPairId === entry.transitivityPairId && w.id !== entry.id)
}

// entries usable as a question's answer: needs >=1 pair partner and a blankable
// example sentence (blankSentence already handles inflected forms/stem matching)
export function vocabTransitivityLevelPool(level: KanjiLevel): VocabWord[] {
  return vocabLevelPool(level).filter((w) => transitivityPairMembers(w).length >= 1 && blankSentence(w) !== null)
}

export function generateVocabTransitivityQuestions(
  level: KanjiLevel,
  count: number,
  order: 'random' | 'sequential' = 'random',
): VocabTransitivityQuestion[] {
  const pool = vocabTransitivityLevelPool(level)
  const ordered = order === 'random' ? shuffle(pool) : pool
  const selected = ordered.slice(0, Math.min(count, pool.length))

  return selected.map((entry) => ({
    entry,
    blankedSentence: blankSentence(entry)!,
    choices: shuffle([entry, ...transitivityPairMembers(entry)]),
  }))
}

// same shape, but for a fixed set of ids (오답노트 재도전) — ids whose pair
// shrank below usable (e.g. a data update) are silently skipped
export function generateVocabTransitivityQuestionsFromIds(ids: string[]): VocabTransitivityQuestion[] {
  const entries = ids
    .map((id) => vocabList.find((w) => w.id === id))
    .filter((w): w is VocabWord => w !== undefined)
    .filter((w) => transitivityPairMembers(w).length >= 1 && blankSentence(w) !== null)

  return shuffle(entries).map((entry) => ({
    entry,
    blankedSentence: blankSentence(entry)!,
    choices: shuffle([entry, ...transitivityPairMembers(entry)]),
  }))
}

// JLPT 言い換え類義(유의어 바꿔쓰기) — 제시 단어와 "같은 뜻의 다른 단어"를 고른다.
// 유의어 관계는 신규 데이터 없이 기존 meaningKr에서 도출한다: 같은 meaningKr을
// 가지면서 읽기·표기가 모두 다른 단어를 진짜 유의어로 본다(읽기/표기가 같으면
// 같은 단어의 이표기라 유의어가 아님 — 明日/明日, 在る/有る 등 제외).
//
// ⚠️ 한계(캐비어트): meaningKr 일치 기반이라, 한국어 뜻이 동음이의인 극소수 쌍
// (電力/全力=전력, 劇団/極端=극단)이 오탐으로 섞일 수 있다(실측 약 5%). meaningKr/
// meaningEn 어느 쪽으로도 진짜 유의어(遠ざかる/隔たる 등)와 규칙으로 완전 분리가
// 불가능해(영어 뜻도 say/speak처럼 달라짐) 이 노이즈는 감수한다. 대다수(95%)는
// 실제 유의어다. 이 프로젝트의 "생성 콘텐츠는 캐비어트를 남긴다" 관례를 따른 표기.
export interface VocabSynonymQuestion {
  entry: VocabWord // 제시 단어(프롬프트)
  answer: VocabWord // 정답 = entry의 유의어
  choices: VocabWord[] // answer + 오답 3개
}

function normalizeMeaning(meaning: string): string {
  return meaning.trim().replace(/\s+/g, '')
}

let synonymGroupsCache: Map<string, VocabWord[]> | null = null
function synonymGroups(): Map<string, VocabWord[]> {
  if (synonymGroupsCache) return synonymGroupsCache
  const map = new Map<string, VocabWord[]>()
  for (const w of vocabList) {
    const key = normalizeMeaning(w.meaningKr)
    const arr = map.get(key)
    if (arr) arr.push(w)
    else map.set(key, [w])
  }
  synonymGroupsCache = map
  return map
}

// entry의 진짜 유의어들(같은 뜻 + 읽기 다름 + 표기 다름). 급수 제한은 두지 않는다
// (N3 단어의 유의어가 N2일 수 있음 — 급수는 선택지에 노출되지 않아 문제없음).
function synonymsOf(entry: VocabWord): VocabWord[] {
  const group = synonymGroups().get(normalizeMeaning(entry.meaningKr)) ?? []
  const entryWord = primaryWord(entry.word)
  return group.filter(
    (w) => w.id !== entry.id && w.reading !== entry.reading && primaryWord(w.word) !== entryWord,
  )
}

export function vocabSynonymLevelPool(level: KanjiLevel): VocabWord[] {
  return vocabLevelPool(level).filter((w) => synonymsOf(w).length > 0)
}

function buildSynonymQuestion(entry: VocabWord): VocabSynonymQuestion {
  const answer = shuffle(synonymsOf(entry))[0]
  const answerMeaning = normalizeMeaning(entry.meaningKr)
  // 오답은 같은 급수에서, 뜻이 다른(정답이 2개가 되지 않도록) 단어로
  const distractorPool = vocabLevelPool(entry.level).filter(
    (w) => w.id !== entry.id && w.id !== answer.id && normalizeMeaning(w.meaningKr) !== answerMeaning,
  )
  const distractors = shuffle(distractorPool).slice(0, 3)
  return { entry, answer, choices: shuffle([answer, ...distractors]) }
}

export function generateVocabSynonymQuestions(
  level: KanjiLevel,
  count: number,
  order: 'random' | 'sequential' = 'random',
): VocabSynonymQuestion[] {
  const pool = vocabSynonymLevelPool(level)
  const ordered = order === 'random' ? shuffle(pool) : pool
  const selected = ordered.slice(0, Math.min(count, pool.length))
  return selected.map(buildSynonymQuestion)
}

// same shape, but for a fixed set of ids (오답노트 재도전) — ids that no longer
// have a synonym (e.g. a data update changed meaningKr) are silently skipped
export function generateVocabSynonymQuestionsFromIds(ids: string[]): VocabSynonymQuestion[] {
  const entries = ids
    .map((id) => vocabList.find((w) => w.id === id))
    .filter((w): w is VocabWord => w !== undefined)
    .filter((w) => synonymsOf(w).length > 0)
  return shuffle(entries).map(buildSynonymQuestion)
}
