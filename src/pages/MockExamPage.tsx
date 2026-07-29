import { useEffect, useRef, useState } from 'react'
import type { KanjiLevel } from '../data/kanji'
import {
  generateMockExamQuestions,
  MOCK_EXAM_LEVELS,
  type MockExamDomain,
  type MockExamQuestion,
} from '../lib/mockExamGenerator'
import {
  addGrammarWrongNotes,
  addMockExamHistoryEntry,
  getMockExamHistory,
  addVocabWrongNotes,
  addWrongNotes,
  clearMockExamInProgressQuiz,
  getMockExamInProgressQuiz,
  recordSrsReview,
  removeGrammarWrongNote,
  removeVocabWrongNote,
  removeWrongNote,
  saveMockExamInProgressQuiz,
  type MockExamInProgressQuiz,
} from '../lib/storage'
import type { MockExamHistoryEntry } from '../types'
import { isComposingEnter } from '../lib/imeGuard'
import '../components/QuizRunner.css'
import '../components/ResultScreen.css'
import '../components/SetupScreen.css'
import './MockExamPage.css'

type Phase = 'setup' | 'running' | 'result'

const COUNT_OPTIONS = [10, 20, 30, 50, 100]
const SECONDS_PER_QUESTION = 40

const DOMAIN_LABEL: Record<MockExamDomain, string> = { kanji: '한자', vocab: '단어', grammar: '문법' }

interface MockExamAnswer {
  question: MockExamQuestion
  selectedLabel: string | null
  isCorrect: boolean
}

interface ExamResult {
  answers: MockExamAnswer[]
  elapsedMs: number
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}분 ${seconds}초`
}

function emptyBreakdown(): Record<MockExamDomain, { total: number; correct: number }> {
  return { kanji: { total: 0, correct: 0 }, vocab: { total: 0, correct: 0 }, grammar: { total: 0, correct: 0 } }
}

export default function MockExamPage() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [level, setLevel] = useState<KanjiLevel>(MOCK_EXAM_LEVELS[0])
  const [count, setCount] = useState(20)

  const [questions, setQuestions] = useState<MockExamQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; selectedLabel: string } | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)
  const [result, setResult] = useState<ExamResult | null>(null)
  // 같은 급수 직전 회차 정답률(%) — 이번 결과와 대비해 "지난 회차 대비 ±%p"로
  // 성장을 실감하게 한다(학습효과: 향상이 눈에 보여야 지속됨). 첫 회차면 null.
  const [prevRate, setPrevRate] = useState<number | null>(null)

  const answersRef = useRef<MockExamAnswer[]>([])
  const questionsRef = useRef<MockExamQuestion[]>([])
  const indexRef = useRef(0)
  const startTimeRef = useRef(0)
  const totalTimeRef = useRef(0)
  const lastSubmittedIndexRef = useRef(-1)
  // guards handleNext so a rapid/repeat Enter can't advance twice past the
  // same wrong answer
  const lastAdvancedIndexRef = useRef(-1)
  // when the next question is reached via the 다음-button/Enter path, skip
  // the next choicesRef auto-focus once — otherwise the still-in-flight
  // keyup of that same Enter press can natively "click" whichever choice
  // button the focus effect just moved focus to, silently auto-submitting
  // the new question (see EnglishVocabPage.tsx for the full writeup of how
  // this was found)
  const skipNextChoiceFocusRef = useRef(false)
  const finishedRef = useRef(false)
  const choicesRef = useRef<HTMLDivElement>(null)
  const restartButtonRef = useRef<HTMLButtonElement>(null)
  // saved exam session from a previous visit that was never finished — shown
  // on the setup screen as an 이어하기 option instead of silently losing it
  const [savedQuiz, setSavedQuiz] = useState(() => getMockExamInProgressQuiz())

  function finish(finalAnswers: MockExamAnswer[]) {
    if (finishedRef.current) return
    finishedRef.current = true
    setResult({ answers: finalAnswers, elapsedMs: Date.now() - startTimeRef.current })
    setPhase('result')
  }

  function startExam() {
    clearMockExamInProgressQuiz()
    setSavedQuiz(null)
    const qs = generateMockExamQuestions(level, count)
    questionsRef.current = qs
    answersRef.current = []
    indexRef.current = 0
    finishedRef.current = false
    lastSubmittedIndexRef.current = -1
    lastAdvancedIndexRef.current = -1
    startTimeRef.current = Date.now()
    totalTimeRef.current = qs.length * SECONDS_PER_QUESTION * 1000
    setQuestions(qs)
    setIndex(0)
    setFeedback(null)
    setResult(null)
    setRemainingMs(totalTimeRef.current)
    setPhase('running')
  }

  // reloads the exact saved questions/choices/answers so resuming isn't a
  // re-roll — startTimeRef stays at the ORIGINAL start time, so the
  // countdown keeps counting real elapsed time same as a real exam would
  function resumeExam(saved: MockExamInProgressQuiz) {
    questionsRef.current = saved.questions
    answersRef.current = saved.answers
    indexRef.current = saved.index
    finishedRef.current = false
    lastSubmittedIndexRef.current = -1
    lastAdvancedIndexRef.current = -1
    startTimeRef.current = new Date(saved.startedAt).getTime()
    totalTimeRef.current = saved.questions.length * SECONDS_PER_QUESTION * 1000
    setQuestions(saved.questions)
    setIndex(saved.index)
    setFeedback(null)
    setResult(null)
    setRemainingMs(Math.max(0, totalTimeRef.current - (Date.now() - startTimeRef.current)))
    setPhase('running')
  }

  // 실제 경과 시간 기준 카운트다운 — 시간이 다 되면 남은 문제를 전부
  // 미응답(오답 처리)으로 채우고 즉시 결과 화면으로 넘어감
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      const remaining = totalTimeRef.current - (Date.now() - startTimeRef.current)
      if (remaining <= 0) {
        setRemainingMs(0)
        clearInterval(id)
        const rest = questionsRef.current.slice(indexRef.current).map((q) => ({
          question: q,
          selectedLabel: null,
          isCorrect: false,
        }))
        finish([...answersRef.current, ...rest])
      } else {
        setRemainingMs(remaining)
      }
    }, 250)
    return () => clearInterval(id)
  }, [phase])

  // 문제가 바뀔 때마다 첫 선택지에 포커스 (숫자키/엔터로 계속 진행 가능하도록)
  useEffect(() => {
    if (phase !== 'running') return
    if (skipNextChoiceFocusRef.current) {
      skipNextChoiceFocusRef.current = false
      return
    }
    choicesRef.current?.querySelector('button')?.focus()
  }, [index, phase])

  function goNext(nextIndex: number) {
    if (finishedRef.current) return
    if (nextIndex < questionsRef.current.length) {
      // cleared here (synchronously with the index change, not in a
      // separate effect) so the new question never renders one frame with
      // the previous question's feedback/disabled state still applied
      setFeedback(null)
      setIndex(nextIndex)
    } else {
      finish(answersRef.current)
    }
  }

  // 오답이면 자동으로 안 넘어가고 "다음" 클릭/Enter를 기다림 — 정답만 기존처럼 자동 진행
  function handleNext() {
    if (lastAdvancedIndexRef.current === index) return
    lastAdvancedIndexRef.current = index
    skipNextChoiceFocusRef.current = true
    goNext(index + 1)
  }

  function submit(selectedLabel: string) {
    if (lastSubmittedIndexRef.current === index) return
    lastSubmittedIndexRef.current = index

    const question = questionsRef.current[index]
    const isCorrect = question.choices.find((c) => c.label === selectedLabel)?.isCorrect ?? false
    answersRef.current = [...answersRef.current, { question, selectedLabel, isCorrect }]
    indexRef.current = index + 1
    setFeedback({ isCorrect, selectedLabel })

    if (indexRef.current < questionsRef.current.length) {
      saveMockExamInProgressQuiz({
        level,
        count,
        questions: questionsRef.current,
        index: indexRef.current,
        answers: answersRef.current,
        startedAt: new Date(startTimeRef.current).toISOString(),
      })
    }

    if (isCorrect) {
      const nextIndex = index + 1
      setTimeout(() => goNext(nextIndex), 550)
    }
  }

  // 숫자키(1-4) 단축키 + 오답일 때 Enter로 다음 문제 진행
  useEffect(() => {
    if (phase !== 'running') return
    function handleKeyDown(e: KeyboardEvent) {
      if (isComposingEnter(e)) return
      if (feedback) {
        if (!feedback.isCorrect && e.key === 'Enter' && !e.repeat) handleNext()
        return
      }
      const choiceIndex = Number(e.key) - 1
      const choice = questionsRef.current[index]?.choices[choiceIndex]
      if (choice) submit(choice.label)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, feedback])

  // 결과 화면 진입 시 한 번: 오답노트/SRS/모의고사 기록 반영 — 일반 퀴즈와 동일한 파이프라인
  useEffect(() => {
    if (phase !== 'result' || !result) return
    clearMockExamInProgressQuiz()
    setSavedQuiz(null)
    const wrongByDomain: Record<MockExamDomain, string[]> = { kanji: [], vocab: [], grammar: [] }
    const correctByDomain: Record<MockExamDomain, string[]> = { kanji: [], vocab: [], grammar: [] }
    const breakdown = emptyBreakdown()

    for (const a of result.answers) {
      breakdown[a.question.domain].total += 1
      if (a.isCorrect) {
        breakdown[a.question.domain].correct += 1
        correctByDomain[a.question.domain].push(a.question.id)
      } else {
        wrongByDomain[a.question.domain].push(a.question.id)
      }
    }

    const source = `모의고사 · ${level}`
    addWrongNotes(wrongByDomain.kanji, source)
    addVocabWrongNotes(wrongByDomain.vocab, source)
    addGrammarWrongNotes(wrongByDomain.grammar, source)
    correctByDomain.kanji.forEach(removeWrongNote)
    correctByDomain.vocab.forEach(removeVocabWrongNote)
    correctByDomain.grammar.forEach(removeGrammarWrongNote)
    result.answers.forEach((a) => recordSrsReview(a.question.domain, a.question.id, a.isCorrect))

    // 현재 회차를 기록에 넣기 전에 같은 급수 직전 회차 정답률을 확보한다
    // (넣은 뒤에 읽으면 방금 회차가 "직전"이 되어버림)
    const prev = getMockExamHistory().find((e) => e.level === level)
    setPrevRate(prev && prev.total > 0 ? Math.round((prev.correct / prev.total) * 100) : null)

    const entry: MockExamHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      total: result.answers.length,
      correct: result.answers.filter((a) => a.isCorrect).length,
      elapsedMs: result.elapsedMs,
      finishedAt: new Date().toISOString(),
      breakdown,
    }
    addMockExamHistoryEntry(entry)

    restartButtonRef.current?.focus({ preventScroll: true })
    // 결과 화면이 뜰 때 한 번만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, result])

  if (phase === 'setup') {
    return (
      <div className="setup-screen">
        <h1>모의고사</h1>
        <p className="hint">한자·단어·문법을 섞어 시간 안에 푸는 통합 테스트입니다.</p>

        {savedQuiz && (
          <>
            <p className="hint">
              진행 중이던 모의고사가 있어요 ({savedQuiz.level} · {savedQuiz.index}/{savedQuiz.questions.length}문항) —
              나간 사이에도 시간은 계속 흘렀어요.
            </p>
            <button type="button" className="start-button" onClick={() => resumeExam(savedQuiz)}>
              이어서 응시하기
            </button>
          </>
        )}

        <fieldset>
          <legend>급수</legend>
          <div className="option-grid option-grid-5">
            {MOCK_EXAM_LEVELS.map((l) => (
              <label className={`option option-level option-level-${l.toLowerCase()}`} key={l}>
                <input type="radio" name="level" checked={level === l} onChange={() => setLevel(l)} />
                {l}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>문항 수</legend>
          <div className="option-grid option-grid-5">
            {COUNT_OPTIONS.map((opt) => (
              <label className="option" key={opt}>
                <input type="radio" name="count" checked={count === opt} onChange={() => setCount(opt)} />
                {opt}문항
              </label>
            ))}
          </div>
          <p className="hint">
            한자·단어·문법에서 약 {Math.round(count / 3)}문항씩 뽑아 섞음 · 제한시간{' '}
            {Math.round((count * SECONDS_PER_QUESTION) / 60)}분
          </p>
        </fieldset>

        <button type="button" className="start-button" onClick={startExam}>
          시작하기
        </button>
      </div>
    )
  }

  if (phase === 'running') {
    const question = questions[index]
    if (!question) return null
    const totalSeconds = Math.ceil(remainingMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const timeLow = remainingMs < 30_000

    return (
      <div className="quiz-runner">
        <div className="mock-exam-header-row">
          <div className="mock-exam-header-left">
            <button
              type="button"
              className="quiz-exit-button"
              onClick={() => {
                setPhase('setup')
                setSavedQuiz(getMockExamInProgressQuiz())
              }}
            >
              나가기
            </button>
            <div className="quiz-progress">
              {index + 1} / {questions.length}
            </div>
          </div>
          <div className={`mock-exam-timer${timeLow ? ' low' : ''}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        <div className="mock-exam-domain-badge">{DOMAIN_LABEL[question.domain]}</div>
        <div className="mock-exam-prompt">
          <span className="mock-exam-prompt-main">{question.prompt}</span>
          {question.promptSub && <span className="mock-exam-prompt-sub">{question.promptSub}</span>}
        </div>

        <div className="mock-exam-choices" ref={choicesRef}>
          {question.choices.map((choice, i) => {
            let className = 'mock-exam-choice'
            if (feedback) {
              if (choice.label === feedback.selectedLabel) {
                className += feedback.isCorrect ? ' correct' : ' incorrect'
              } else if (!feedback.isCorrect && choice.isCorrect) {
                className += ' reveal-correct'
              }
            }
            return (
              <button
                key={i}
                type="button"
                className={className}
                disabled={feedback !== null}
                onClick={() => submit(choice.label)}
              >
                <span className="quiz-choice-num">{i + 1}</span>
                {choice.label}
              </button>
            )
          })}
        </div>
        {feedback && !feedback.isCorrect && (
          <button type="button" className="quiz-next-button" onClick={handleNext}>
            다음
          </button>
        )}
        <p className="shortcut-hint">숫자키(1~4)로 선택 · 오답이면 Enter로 다음 문제</p>
      </div>
    )
  }

  // result
  const answers = result?.answers ?? []
  const correctCount = answers.filter((a) => a.isCorrect).length
  const total = answers.length
  const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0
  const breakdown = emptyBreakdown()
  for (const a of answers) {
    breakdown[a.question.domain].total += 1
    if (a.isCorrect) breakdown[a.question.domain].correct += 1
  }

  return (
    <div className="result-screen">
      <h1>모의고사 결과</h1>
      <p className="result-summary">
        {correctCount} / {total} 정답 ({rate}%) · 소요 시간 {formatElapsed(result?.elapsedMs ?? 0)}
      </p>
      {prevRate !== null && (
        <p className={`mock-exam-trend ${rate > prevRate ? 'up' : rate < prevRate ? 'down' : 'flat'}`}>
          {rate > prevRate
            ? `지난 ${level} 대비 +${rate - prevRate}%p ↑`
            : rate < prevRate
              ? `지난 ${level} 대비 ${rate - prevRate}%p ↓`
              : `지난 ${level}과 동일 (${rate}%)`}
        </p>
      )}

      <div className="mock-exam-breakdown">
        {(Object.keys(DOMAIN_LABEL) as MockExamDomain[]).map((domain) => (
          <div className="mock-exam-breakdown-item" key={domain}>
            <span className="mock-exam-breakdown-label">{DOMAIN_LABEL[domain]}</span>
            <span className="mock-exam-breakdown-score">
              {breakdown[domain].correct}/{breakdown[domain].total}
            </span>
          </div>
        ))}
      </div>

      <ul className="result-list">
        {answers.map((a, i) => {
          const correctLabel = a.question.choices.find((c) => c.isCorrect)?.label ?? ''
          return (
            <li key={`${a.question.id}-${i}`} className={a.isCorrect ? 'correct' : 'incorrect'}>
              <span className="mock-exam-result-domain">{DOMAIN_LABEL[a.question.domain]}</span>
              <span className="result-detail">
                <span className="result-detail-main">
                  {a.question.prompt} · 정답: {correctLabel}
                  {!a.isCorrect && <> · 내 답: {a.selectedLabel ?? '(미응답)'}</>}
                </span>
              </span>
            </li>
          )
        })}
      </ul>

      <button type="button" ref={restartButtonRef} className="restart-button" onClick={() => setPhase('setup')}>
        다시 응시하기
      </button>
    </div>
  )
}
