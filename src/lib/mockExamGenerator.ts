import { kanjiList, type KanjiLevel } from '../data/kanji'
import { vocabList } from '../data/vocab'
import { grammarList } from '../data/grammar'

export type MockExamDomain = 'kanji' | 'vocab' | 'grammar'

export interface MockExamQuestion {
  domain: MockExamDomain
  id: string
  prompt: string
  promptSub?: string
  choices: { label: string; isCorrect: boolean }[]
}

export const MOCK_EXAM_LEVELS: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// count가 3으로 안 나눠지면 앞 도메인(한자→단어→문법 순)부터 +1씩 받는다 —
// 예: count=20 → 7/7/6
function splitThree(count: number): [number, number, number] {
  const base = Math.floor(count / 3)
  const remainder = count % 3
  return [base + (remainder > 0 ? 1 : 0), base + (remainder > 1 ? 1 : 0), base]
}

function kanjiQuestions(level: KanjiLevel, count: number): MockExamQuestion[] {
  const pool = kanjiList.filter((k) => k.level === level)
  const selected = shuffle(pool).slice(0, Math.min(count, pool.length))

  return selected.map((entry) => {
    const distractorPool = pool.filter((k) => k.id !== entry.id && k.kunKr !== entry.kunKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    const choices = shuffle([entry, ...distractors]).map((k) => ({
      label: k.kunKr,
      isCorrect: k.id === entry.id,
    }))
    return { domain: 'kanji', id: entry.id, prompt: entry.kanji, choices }
  })
}

function vocabQuestions(level: KanjiLevel, count: number): MockExamQuestion[] {
  const pool = vocabList.filter((w) => w.level === level)
  const selected = shuffle(pool).slice(0, Math.min(count, pool.length))

  return selected.map((entry) => {
    const distractorPool = pool.filter((w) => w.id !== entry.id && w.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    const choices = shuffle([entry, ...distractors]).map((w) => ({
      label: w.meaningKr,
      isCorrect: w.id === entry.id,
    }))
    return { domain: 'vocab', id: entry.id, prompt: `${entry.word}(${entry.reading})`, choices }
  })
}

function grammarQuestions(level: KanjiLevel, count: number): MockExamQuestion[] {
  const pool = grammarList.filter((g) => g.level === level)
  const selected = shuffle(pool).slice(0, Math.min(count, pool.length))

  return selected.map((entry) => {
    const distractorPool = pool.filter((g) => g.id !== entry.id && g.meaningKr !== entry.meaningKr)
    const distractors = shuffle(distractorPool).slice(0, 3)
    const choices = shuffle([entry, ...distractors]).map((g) => ({
      label: g.meaningKr,
      isCorrect: g.id === entry.id,
    }))
    return { domain: 'grammar', id: entry.id, prompt: entry.pattern, promptSub: entry.exampleJp, choices }
  })
}

// 한자/단어/문법에서 각각 count/3개씩 뽑아 "개체 → 뜻, 4지선다" 형태로 통일한
// 뒤 섞어서 하나의 시험지로 합친다
export function generateMockExamQuestions(level: KanjiLevel, count: number): MockExamQuestion[] {
  const [kanjiCount, vocabCount, grammarCount] = splitThree(count)
  return shuffle([
    ...kanjiQuestions(level, kanjiCount),
    ...vocabQuestions(level, vocabCount),
    ...grammarQuestions(level, grammarCount),
  ])
}
