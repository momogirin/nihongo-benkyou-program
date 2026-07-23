import { kanjiList, type KanjiLevel } from '../data/kanji'
import type { QuizConfig } from '../types'
import { generateQuestions } from './quizGenerator'
import {
  generateVocabQuestions,
  generateVocabBlankQuestions,
  generateVocabWritingQuestions,
  generateVocabTransitivityQuestions,
} from './vocabQuizGenerator'
import { generateGrammarQuestions, generateGrammarBlankQuestions } from './grammarQuizGenerator'

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

// word가 세미콜론으로 여러 표기를 나열하는 경우(예: "足; 脚") 첫 표기만 라벨에 쓴다
function headWord(word: string): string {
  return word.split(/[;；]/)[0].trim()
}

// 여러 문제유형의 배치를 라운드로빈으로 섞어 count개를 뽑는다. 같은 항목(id)이
// 두 유형에 동시에 뽑혀도 한 번만 출제되도록 dedupe하고, 어떤 유형의 풀이 작아
// 일찍 소진돼도(예: 자타동사) 나머지 유형으로 자연히 채워진다 — 유형별로 균등하게
// 번갈아 뽑으므로 "뜻 고르기"가 시험지를 독점하지 않는다.
function roundRobin(batches: MockExamQuestion[][], count: number): MockExamQuestion[] {
  const result: MockExamQuestion[] = []
  const used = new Set<string>()
  const cursors = batches.map(() => 0)
  let progressed = true
  while (result.length < count && progressed) {
    progressed = false
    for (let b = 0; b < batches.length && result.length < count; b++) {
      const batch = batches[b]
      while (cursors[b] < batch.length && used.has(batch[cursors[b]].id)) cursors[b]++
      if (cursors[b] < batch.length) {
        const q = batch[cursors[b]]
        cursors[b]++
        used.add(q.id)
        result.push(q)
        progressed = true
      }
    }
  }
  return result
}

// ── 한자: 漢字読み(뜻/훈독/음독) ──────────────────────────────────────────

// 한자 → 한국어 훈음(뜻) 고르기 — 기존 모의고사가 쓰던 유일한 유형
function kanjiMeaningBatch(level: KanjiLevel, count: number): MockExamQuestion[] {
  const pool = kanjiList.filter((k) => k.level === level)
  return shuffle(pool)
    .slice(0, count)
    .map((entry) => {
      const distractors = shuffle(pool.filter((k) => k.id !== entry.id && k.kunKr !== entry.kunKr)).slice(0, 3)
      return {
        domain: 'kanji' as const,
        id: entry.id,
        prompt: entry.kanji,
        choices: shuffle([entry, ...distractors]).map((k) => ({ label: k.kunKr, isCorrect: k.id === entry.id })),
      }
    })
}

// 한자 → 일본어 읽기(훈독/음독) 고르기 — quizGenerator의 kunReading/onReading을
// 재사용(읽기 없는 한자는 그쪽에서 이미 걸러짐). JLPT 漢字読み 대응.
function kanjiReadingBatch(level: KanjiLevel, count: number, field: 'kunJp' | 'onJp'): MockExamQuestion[] {
  const questionType: QuizConfig['questionType'] = field === 'kunJp' ? 'kunReading' : 'onReading'
  // count는 QuestionCount 유니온이라 임의 숫자를 못 넣으므로 'all'로 생성 후 slice
  const config: QuizConfig = { levels: [level], questionType, order: 'random', count: 'all' }
  return generateQuestions(config)
    .slice(0, count)
    .map((q) => ({
      domain: 'kanji' as const,
      id: q.kanji.id,
      prompt: q.kanji.kanji,
      choices: (q.choices ?? []).map((k) => ({ label: k[field], isCorrect: k.id === q.kanji.id })),
    }))
}

function kanjiBatches(level: KanjiLevel, count: number): MockExamQuestion[] {
  return roundRobin(
    [
      kanjiMeaningBatch(level, count),
      kanjiReadingBatch(level, count, 'kunJp'),
      kanjiReadingBatch(level, count, 'onJp'),
    ],
    count,
  )
}

// ── 단어: 뜻/文脈規定/表記/自他動詞 ──────────────────────────────────────

function vocabBatches(level: KanjiLevel, count: number): MockExamQuestion[] {
  // 뜻 맞히기: word(reading) → meaningKr
  const meaning = generateVocabQuestions(level, count).map((q) => ({
    domain: 'vocab' as const,
    id: q.entry.id,
    prompt: `${q.entry.word}(${q.entry.reading})`,
    choices: q.choices.map((w) => ({ label: w.meaningKr, isCorrect: w.id === q.entry.id })),
  }))
  // 文脈規定: 문장 빈칸에 맞는 단어 고르기
  const blank = generateVocabBlankQuestions(level, count).map((q) => ({
    domain: 'vocab' as const,
    id: q.entry.id,
    prompt: q.blankedSentence,
    choices: q.choices.map((w) => ({ label: `${headWord(w.word)}(${w.reading})`, isCorrect: w.id === q.entry.id })),
  }))
  // 表記: 읽기(히라가나) → 올바른 한자 표기 고르기 (선택지에 읽기 노출 금지 — 정답 누설)
  const writing = generateVocabWritingQuestions(level, count).map((q) => ({
    domain: 'vocab' as const,
    id: q.entry.id,
    prompt: q.entry.reading,
    choices: q.choices.map((w) => ({ label: headWord(w.word), isCorrect: w.id === q.entry.id })),
  }))
  // 自他動詞: 같은 짝의 자동사/타동사 중 문맥에 맞는 형태 고르기
  const transitivity = generateVocabTransitivityQuestions(level, count).map((q) => ({
    domain: 'vocab' as const,
    id: q.entry.id,
    prompt: q.blankedSentence,
    choices: q.choices.map((w) => ({ label: `${headWord(w.word)}(${w.reading})`, isCorrect: w.id === q.entry.id })),
  }))
  return roundRobin([meaning, blank, writing, transitivity], count)
}

// ── 문법: 뜻/文法 빈칸 ──────────────────────────────────────────────────

function grammarBatches(level: KanjiLevel, count: number): MockExamQuestion[] {
  // 뜻 맞히기: 예문(+문형) → meaningKr. 문형(pattern)은 큰 프롬프트로 쓰면 교과서식
  // 축약표기라 깨진 일본어처럼 보이므로 작은 보조 라벨로(기존 동작 유지)
  const meaning = generateGrammarQuestions(level, count).map((q) => ({
    domain: 'grammar' as const,
    id: q.entry.id,
    prompt: q.entry.exampleJp,
    promptSub: q.entry.pattern,
    choices: q.choices.map((g) => ({ label: g.meaningKr, isCorrect: g.id === q.entry.id })),
  }))
  // 文法1: 빈칸에 맞는 문형 고르기 (선택지=문형 표현). 문형을 보조라벨로 노출하면
  // 정답이 누설되므로 promptSub 없음
  const blank = generateGrammarBlankQuestions(level, count).map((q) => ({
    domain: 'grammar' as const,
    id: q.entry.id,
    prompt: q.entry.blankJp!,
    choices: q.choices.map((g) => ({ label: g.blankAnswer!, isCorrect: g.id === q.entry.id })),
  }))
  return roundRobin([meaning, blank], count)
}

// 한자/단어/문법에서 각각 count/3개씩 뽑되, 각 도메인 안에서 실제 JLPT 언어지식
// 대문제 유형(漢字読み/表記/文脈規定/文法 등)을 섞어 하나의 시험지로 합친다.
// 문제 shape(prompt/choices)은 균일하게 유지되므로 채점·오답노트·SRS·결과화면
// 배선은 전부 그대로다.
export function generateMockExamQuestions(level: KanjiLevel, count: number): MockExamQuestion[] {
  const [kanjiCount, vocabCount, grammarCount] = splitThree(count)
  return shuffle([
    ...kanjiBatches(level, kanjiCount),
    ...vocabBatches(level, vocabCount),
    ...grammarBatches(level, grammarCount),
  ])
}
