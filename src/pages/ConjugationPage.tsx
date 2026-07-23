import { useEffect, useMemo, useRef, useState } from 'react'
import {
  conjugate,
  conjugationList,
  TYPE_LABELS,
  type ConjugatedForm,
  type ConjugationEntry,
} from '../lib/conjugation'
import { vocabConjugationEntries } from '../lib/vocabConjugation'
import type { KanjiLevel } from '../data/kanji'
import { getDueSrsIds, recordSrsReview } from '../lib/storage'
import './StudyPage.css'
import './VocabPage.css'
import './KanjiPage.css'
import './KanaPage.css'
import './ConjugationPage.css'

type SubTab = 'study' | 'quiz'
// 활용 그룹별 집중 연습을 위한 필터
type Scope = 'all' | 'godan' | 'ichidan' | 'suruKuru' | 'iadj' | 'naadj'
type QuizCount = 10 | 20 | 'all'
type Phase = 'setup' | 'running' | 'result'
// produce: 사전형+목표 활용형명 → 활용형 고르기 / identify: 활용형 → 무슨 형인지 고르기
type QuizMode = 'produce' | 'identify'

const QUIZ_MODES: { id: QuizMode; label: string }[] = [
  { id: 'produce', label: '활용형 만들기' },
  { id: 'identify', label: '활용형 읽기' },
]

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'godan', label: '5단' },
  { id: 'ichidan', label: '1단' },
  { id: 'suruKuru', label: 'する·くる' },
  { id: 'iadj', label: 'い형' },
  { id: 'naadj', label: 'な형' },
]

const QUIZ_COUNTS: QuizCount[] = [10, 20, 'all']

// 활용 드릴에 쓸 단어 출처: 엄선 세트(초급 상용 146) 또는 급수별 태깅 어휘
type Source = 'curated' | KanjiLevel
const SOURCES: { id: Source; label: string }[] = [
  { id: 'curated', label: '엄선' },
  { id: 'N5', label: 'N5' },
  { id: 'N4', label: 'N4' },
  { id: 'N3', label: 'N3' },
  { id: 'N2', label: 'N2' },
  { id: 'N1', label: 'N1' },
]

function baseList(source: Source): ConjugationEntry[] {
  return source === 'curated' ? conjugationList : vocabConjugationEntries(source)
}

// SRS 복습 배너용 — 출처(엄선/급수) 구분 없이 전체 활용 드릴 항목을 한 번에 훑는다.
function allEntries(): ConjugationEntry[] {
  return SOURCES.flatMap((s) => baseList(s.id))
}

function inScope(entry: ConjugationEntry, scope: Scope): boolean {
  switch (scope) {
    case 'all':
      return true
    case 'suruKuru':
      return entry.type === 'suru' || entry.type === 'kuru'
    default:
      return entry.type === scope
  }
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function ConjugationPage() {
  const [subTab, setSubTab] = useState<SubTab>('study')
  return (
    <>
      <div className="kanji-tabs">
        <button type="button" className={`kanji-tab${subTab === 'study' ? ' active' : ''}`} onClick={() => setSubTab('study')}>
          학습
        </button>
        <button type="button" className={`kanji-tab${subTab === 'quiz' ? ' active' : ''}`} onClick={() => setSubTab('quiz')}>
          퀴즈
        </button>
      </div>
      {subTab === 'study' ? <ConjugationStudy /> : <ConjugationQuiz />}
    </>
  )
}

// ─────────────────────────────────────────── 학습(활용표) ───────────────────

function ConjugationStudy() {
  const [source, setSource] = useState<Source>('curated')
  const [scope, setScope] = useState<Scope>('all')
  const [studying, setStudying] = useState(false)
  const [cardIndex, setCardIndex] = useState(0)

  const pool = useMemo(() => baseList(source).filter((e) => inScope(e, scope)), [source, scope])

  useEffect(() => {
    if (!studying) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'Enter') setCardIndex((i) => (i + 1 < pool.length ? i + 1 : i))
      else if (e.key === 'ArrowLeft') setCardIndex((i) => (i > 0 ? i - 1 : i))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [studying, pool.length])

  if (studying) {
    const entry = pool[cardIndex]
    const forms = conjugate(entry)
    const isLast = cardIndex + 1 === pool.length
    return (
      <div className="page study-page">
        <div className="study-content">
          <div className="study-topbar">
            <button type="button" className="study-exit-button" onClick={() => setStudying(false)}>
              나가기
            </button>
            <div className="quiz-progress">
              {cardIndex + 1} / {pool.length}
            </div>
          </div>
          <div className="study-card">
            <div className="study-top">
              <span className="conj-type-badge">{TYPE_LABELS[entry.type]}</span>
            </div>
            <div className="conj-dict-word">
              {entry.word}
              <span className="conj-dict-reading">{entry.reading}</span>
            </div>
            <p className="conj-dict-meaning">{entry.meaningKr}</p>
            <ConjTable forms={forms} />
          </div>
        </div>
        <div className="study-nav">
          <button type="button" onClick={() => setCardIndex((i) => i - 1)} disabled={cardIndex === 0}>
            이전
          </button>
          {isLast ? (
            <button type="button" className="study-nav-primary" onClick={() => setStudying(false)}>
              학습 완료
            </button>
          ) : (
            <button type="button" className="study-nav-primary" onClick={() => setCardIndex((i) => i + 1)}>
              다음
            </button>
          )}
        </div>
        <p className="shortcut-hint">← → 로 이전/다음 · Enter로 다음</p>
      </div>
    )
  }

  return (
    <div className="page study-setup">
      <h1>활용 학습</h1>
      <div className="conj-quiz-field">
        <span className="conj-quiz-field-label">단어</span>
        <div className="study-level-picker">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`study-level-btn${s.id === source ? ' active' : ''}`}
              onClick={() => setSource(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="conj-quiz-field">
        <span className="conj-quiz-field-label">활용 그룹</span>
        <div className="study-level-picker">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`study-level-btn${s.id === scope ? ' active' : ''}`}
              onClick={() => setScope(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <p className="study-progress-summary">
        {SOURCES.find((s) => s.id === source)!.label} · {SCOPES.find((s) => s.id === scope)!.label} · {pool.length}개
      </p>
      <button
        type="button"
        className="study-start-button"
        disabled={pool.length === 0}
        onClick={() => {
          setCardIndex(0)
          setStudying(true)
        }}
      >
        시작하기
      </button>
    </div>
  )
}

function ConjTable({ forms }: { forms: ConjugatedForm[] }) {
  return (
    <table className="conj-table">
      <tbody>
        {forms.map((f) => (
          <tr key={f.key}>
            <th scope="row">
              {f.label}
              <span className="conj-form-hint">{f.hint}</span>
            </th>
            <td>
              <span className="conj-form-word">{f.word}</span>
              {f.reading !== f.word && <span className="conj-form-reading">{f.reading}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─────────────────────────────────────────── 퀴즈 ──────────────────────────

interface QuizQuestion {
  entry: ConjugationEntry
  target: ConjugatedForm
  choices: ConjugatedForm[]
}

// 사전형은 답으로 내지 않음(활용을 만드는 연습이므로).
// 같은 문자열이 되는 활용형(예: 一段 가능형=수동형 「食べられる」)은 선택지에서
// 하나만 남기고, 정답은 문자열이 유일한 활용형에서만 골라 문제가 애매해지지 않게 한다.
function buildQuestion(entry: ConjugationEntry): QuizQuestion {
  const forms = conjugate(entry)
  const wordCount = new Map<string, number>()
  forms.forEach((f) => wordCount.set(f.word, (wordCount.get(f.word) ?? 0) + 1))
  const uniqueByWord: ConjugatedForm[] = []
  const seen = new Set<string>()
  for (const f of forms) {
    if (seen.has(f.word)) continue
    seen.add(f.word)
    uniqueByWord.push(f)
  }
  const unambiguous = uniqueByWord.filter((f) => f.key !== 'dict' && wordCount.get(f.word) === 1)
  const targetPool = unambiguous.length > 0 ? unambiguous : uniqueByWord.filter((f) => f.key !== 'dict')
  const target = targetPool[Math.floor(Math.random() * targetPool.length)]
  const others = uniqueByWord.filter((f) => f.word !== target.word)
  const choices = shuffle([target, ...shuffle(others).slice(0, 3)])
  return { entry, target, choices }
}

function ConjugationQuiz() {
  const [source, setSource] = useState<Source>('curated')
  const [scope, setScope] = useState<Scope>('all')
  const [mode, setMode] = useState<QuizMode>('produce')
  const [count, setCount] = useState<QuizCount>(20)
  const [phase, setPhase] = useState<Phase>('setup')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<{ selectedKey: string; isCorrect: boolean } | null>(null)
  const [answers, setAnswers] = useState<{ entry: ConjugationEntry; target: ConjugatedForm; isCorrect: boolean }[]>([])
  const advanceTimer = useRef<number | null>(null)

  const pool = useMemo(() => baseList(source).filter((e) => inScope(e, scope)), [source, scope])

  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
    },
    [],
  )

  function startQuiz() {
    const picked = count === 'all' ? shuffle(pool) : shuffle(pool).slice(0, count)
    setQuestions(picked.map(buildQuestion))
    setIndex(0)
    setFeedback(null)
    setAnswers([])
    setPhase('running')
  }

  // 복습: SRS가 지금 복습하라고 지목한 항목(전체 출처 통틀어, 이전에 퀴즈로
  // 한 번이라도 틀렸거나 복습주기가 된 것)만 뽑아 바로 퀴즈로 — KanaQuiz의
  // "복습할 가나 N자" 배너와 동일 패턴.
  function startReview(dueEntries: ConjugationEntry[]) {
    setQuestions(shuffle(dueEntries).map(buildQuestion))
    setIndex(0)
    setFeedback(null)
    setAnswers([])
    setPhase('running')
  }

  function submitAnswer(choice: ConjugatedForm) {
    if (feedback) return
    const question = questions[index]
    const isCorrect = choice.key === question.target.key
    recordSrsReview('conjugation', question.entry.id, isCorrect)
    setFeedback({ selectedKey: choice.key, isCorrect })
    setAnswers((prev) => [...prev, { entry: question.entry, target: question.target, isCorrect }])
    if (isCorrect) advanceTimer.current = window.setTimeout(goNext, 550)
  }

  function goNext() {
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
    setFeedback(null)
    if (index + 1 < questions.length) setIndex((i) => i + 1)
    else setPhase('result')
  }

  useEffect(() => {
    if (phase !== 'running') return
    function handleKeyDown(e: KeyboardEvent) {
      const question = questions[index]
      if (!question) return
      if (!feedback && e.key >= '1' && e.key <= '9') {
        const choice = question.choices[Number(e.key) - 1]
        if (choice) submitAnswer(choice)
      } else if (feedback && !feedback.isCorrect && e.key === 'Enter') {
        goNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, index, feedback, questions])

  if (phase === 'running') {
    const question = questions[index]
    return (
      <div className="quiz-runner">
        <div className="quiz-topbar">
          <button type="button" className="quiz-exit-button" onClick={() => setPhase('setup')}>
            나가기
          </button>
          <div className="quiz-progress">
            {index + 1} / {questions.length}
          </div>
        </div>
        <div className="vocab-quiz-prompt">
          {mode === 'produce' ? (
            <>
              <span className="conj-quiz-prompt-word">
                {question.entry.word}
                <span className="conj-quiz-prompt-reading">{question.entry.reading}</span>
              </span>
              <span className="conj-quiz-prompt-meaning">{question.entry.meaningKr}</span>
              <span className="conj-quiz-prompt-target">
                → <strong>{question.target.label}</strong> 으로?
              </span>
            </>
          ) : (
            <>
              <span className="conj-quiz-prompt-word">
                {question.target.word}
                {question.target.reading !== question.target.word && (
                  <span className="conj-quiz-prompt-reading">{question.target.reading}</span>
                )}
              </span>
              <span className="conj-quiz-prompt-meaning">
                {question.entry.word} · {question.entry.meaningKr}
              </span>
              <span className="conj-quiz-prompt-target">
                → 무슨 <strong>활용형</strong>?
              </span>
            </>
          )}
        </div>
        <div className="vocab-quiz-choices">
          {question.choices.map((choice, i) => {
            let className = 'vocab-quiz-choice'
            if (feedback) {
              if (choice.key === feedback.selectedKey) className += feedback.isCorrect ? ' correct' : ' incorrect'
              else if (!feedback.isCorrect && choice.key === question.target.key) className += ' reveal-correct'
            }
            return (
              <button
                key={choice.key}
                type="button"
                className={className}
                disabled={feedback !== null}
                onClick={() => submitAnswer(choice)}
              >
                <span className="quiz-choice-num">{i + 1}</span>
                {mode === 'produce' ? (
                  <>
                    <span className="conj-choice-word">{choice.word}</span>
                    {choice.reading !== choice.word && <span className="conj-choice-reading">{choice.reading}</span>}
                  </>
                ) : (
                  <span className="conj-choice-word">{choice.label}</span>
                )}
              </button>
            )
          })}
        </div>
        {feedback && !feedback.isCorrect && (
          <button type="button" className="quiz-next-button" onClick={goNext}>
            다음
          </button>
        )}
        <p className="shortcut-hint">숫자키로 선택 · 오답이면 Enter로 다음 문제</p>
      </div>
    )
  }

  if (phase === 'result') {
    const correctCount = answers.filter((a) => a.isCorrect).length
    const total = answers.length
    const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0
    return (
      <div className="result-screen">
        <h1>활용 퀴즈 결과</h1>
        <p className="result-summary">
          {correctCount} / {total} 정답 ({rate}%)
        </p>
        <ul className="result-list">
          {answers.map((a, i) => (
            <li key={`${a.entry.id}-${i}`} className={a.isCorrect ? 'correct' : 'incorrect'}>
              <span className="conj-result-word">
                {a.entry.word} · {a.target.label}
              </span>
              <span className="conj-result-answer">{a.target.word}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="study-start-button" onClick={() => setPhase('setup')}>
          다시 풀기
        </button>
      </div>
    )
  }

  const dueSet = new Set(getDueSrsIds('conjugation', allEntries().map((e) => e.id)))
  const dueEntries = allEntries().filter((e) => dueSet.has(e.id))

  return (
    <div className="page study-setup">
      <h1>활용 퀴즈</h1>
      {dueEntries.length > 0 && (
        <button type="button" className="kana-review-banner" onClick={() => startReview(dueEntries)}>
          복습할 활용어 <strong>{dueEntries.length}개</strong> — 지금 복습하기
        </button>
      )}
      <div className="conj-quiz-field">
        <span className="conj-quiz-field-label">단어</span>
        <div className="study-level-picker">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`study-level-btn${s.id === source ? ' active' : ''}`}
              onClick={() => setSource(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="conj-quiz-field">
        <span className="conj-quiz-field-label">유형</span>
        <div className="study-level-picker">
          {QUIZ_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`study-level-btn${m.id === mode ? ' active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="conj-quiz-field">
        <span className="conj-quiz-field-label">활용 그룹</span>
        <div className="study-level-picker">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`study-level-btn${s.id === scope ? ' active' : ''}`}
              onClick={() => setScope(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="conj-quiz-field">
        <span className="conj-quiz-field-label">문항 수</span>
        <div className="study-level-picker">
          {QUIZ_COUNTS.map((c) => (
            <button
              key={c}
              type="button"
              className={`study-level-btn${c === count ? ' active' : ''}`}
              onClick={() => setCount(c)}
            >
              {c === 'all' ? '전체' : c}
            </button>
          ))}
        </div>
      </div>
      <p className="study-progress-summary">
        {SOURCES.find((s) => s.id === source)!.label} · {SCOPES.find((s) => s.id === scope)!.label} ·{' '}
        {count === 'all' ? pool.length : Math.min(count, pool.length)}문항
      </p>
      <button type="button" className="study-start-button" disabled={pool.length === 0} onClick={startQuiz}>
        퀴즈 풀기
      </button>
    </div>
  )
}
