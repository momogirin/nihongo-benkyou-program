import { englishVocabList, type EnglishVocabWord, type EnglishLevel } from '../data/englishVocab'

export interface EnglishVocabQuizQuestion {
  entry: EnglishVocabWord
  choices: EnglishVocabWord[]
}

export function englishVocabLevelPool(level: EnglishLevel): EnglishVocabWord[] {
  return englishVocabList.filter((w) => w.level === level).sort((a, b) => a.num - b.num)
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// word -> meaningKr multiple choice, drawn from the given level's full word
// pool so exam-style quizzing isn't limited to whatever's been studied so
// far. order: 'random' shuffles the draw (default), 'sequential' keeps the
// level's num order — same two options the 일본어 단어 quiz already has.
export function generateEnglishVocabQuestions(
  level: EnglishLevel,
  count: number,
  order: 'random' | 'sequential' = 'random',
): EnglishVocabQuizQuestion[] {
  const pool = englishVocabLevelPool(level)
  const ordered = order === 'random' ? shuffle(pool) : pool
  const selected = ordered.slice(0, Math.min(count, pool.length))

  return selected.map((entry) => {
    const distractorPool = pool.filter((w) => w.id !== entry.id && w.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}

// same word -> meaningKr shape, but for a fixed set of ids (오답노트 재도전)
// instead of a level draw. Distractors still come from the entry's own level
// pool so choices stay plausible even when ids span levels.
export function generateEnglishVocabQuestionsFromIds(ids: string[]): EnglishVocabQuizQuestion[] {
  const entries = ids
    .map((id) => englishVocabList.find((w) => w.id === id))
    .filter((w): w is EnglishVocabWord => w !== undefined)

  return shuffle(entries).map((entry) => {
    const pool = englishVocabLevelPool(entry.level)
    const distractorPool = pool.filter((w) => w.id !== entry.id && w.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    return { entry, choices: shuffle([entry, ...distractors]) }
  })
}

// Part 5-style 품사 변환 빈칸형 퀴즈 (파생어 세트, wordFamilyId/derivationPos
// 기반). 같은 어근(wordFamilyId)의 다른 품사 형태들이 선택지가 되고, 정답 단어의
// exampleEn 문장에서 그 단어를 빈칸으로 가려서 보여준다 — 뜻이 아니라 "이 자리에
// 어떤 품사가 들어가야 하는가"를 테스트하는 문제.
export interface EnglishVocabDerivationQuestion {
  entry: EnglishVocabWord
  blankedSentence: string
  choices: EnglishVocabWord[]
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function wordFamilyMembers(entry: EnglishVocabWord): EnglishVocabWord[] {
  if (!entry.wordFamilyId) return []
  return englishVocabList.filter((w) => w.wordFamilyId === entry.wordFamilyId)
}

// exampleEn always uses that entry's own word form literally (see
// data/raw/README.md), so blanking is a straight whole-word replace — but
// ~15% of entries have the word only in an inflected form (e.g. "decides"),
// so this returns null for those instead of guessing where to cut
function blankSentence(entry: EnglishVocabWord): string | null {
  const pattern = new RegExp(`\\b${escapeRegExp(entry.word)}\\b`, 'i')
  if (!pattern.test(entry.exampleEn)) return null
  return entry.exampleEn.replace(pattern, '_____')
}

// entries usable as a derivation question's answer: needs >=2 family
// members (otherwise there's nothing to choose between) and a blankable
// example sentence
export function englishVocabDerivationLevelPool(level: EnglishLevel): EnglishVocabWord[] {
  return englishVocabLevelPool(level).filter((w) => wordFamilyMembers(w).length >= 2 && blankSentence(w) !== null)
}

export function generateEnglishVocabDerivationQuestions(
  level: EnglishLevel,
  count: number,
  order: 'random' | 'sequential' = 'random',
): EnglishVocabDerivationQuestion[] {
  const pool = englishVocabDerivationLevelPool(level)
  const ordered = order === 'random' ? shuffle(pool) : pool
  const selected = ordered.slice(0, Math.min(count, pool.length))

  return selected.map((entry) => ({
    entry,
    blankedSentence: blankSentence(entry)!,
    choices: shuffle(wordFamilyMembers(entry)),
  }))
}

// same shape, but for a fixed set of ids (오답노트 재도전) — ids without a
// blankable family (e.g. family shrunk to <2 in a data update) are silently
// skipped rather than throwing, same defensive style as ...FromIds above
export function generateEnglishVocabDerivationQuestionsFromIds(ids: string[]): EnglishVocabDerivationQuestion[] {
  const entries = ids
    .map((id) => englishVocabList.find((w) => w.id === id))
    .filter((w): w is EnglishVocabWord => w !== undefined)
    .filter((w) => wordFamilyMembers(w).length >= 2 && blankSentence(w) !== null)

  return shuffle(entries).map((entry) => ({
    entry,
    blankedSentence: blankSentence(entry)!,
    choices: shuffle(wordFamilyMembers(entry)),
  }))
}
