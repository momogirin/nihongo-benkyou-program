import { useEffect, useMemo, useRef, useState } from 'react'
import { grammarList, type GrammarPoint } from '../data/grammar'
import type { KanjiLevel } from '../data/kanji'
import {
  generateGrammarQuestions,
  generateGrammarQuestionsFromIds,
  grammarAvailableLevels,
  grammarLevelPool,
  type GrammarQuizQuestion,
} from '../lib/grammarQuizGenerator'
import {
  addGrammarWrongNotes,
  getGrammarStudyBatchSize,
  getGrammarStudyProgress,
  removeGrammarWrongNote,
  setGrammarStudyBatchSize,
  setGrammarStudyProgress,
} from '../lib/storage'
import '../components/QuizRunner.css'
import '../components/ResultScreen.css'
import './StudyPage.css'
import './GrammarPage.css'

const QUIZ_QUESTION_COUNT = 20
const FEEDBACK_DELAY_MS = 550

type Phase = 'setup' | 'studying' | 'done' | 'browse' | 'quiz' | 'quizResult'

interface QuizAnswer {
  question: GrammarQuizQuestion
  selected: string
  isCorrect: boolean
}

interface Props {
  retryIds?: string[] | null
  onRetryIdsConsumed?: () => void
}

export default function GrammarPage({ retryIds, onRetryIdsConsumed }: Props) {
  const [level, setLevel] = useState<KanjiLevel>(grammarAvailableLevels[0])
  const pool = useMemo(() => grammarLevelPool(level), [level])
  const completedCount = Math.min(getGrammarStudyProgress(level), pool.length)
  const remaining = pool.length - completedCount

  const [batchSizeInput, setBatchSizeInput] = useState(() => getGrammarStudyBatchSize())
  const [phase, setPhase] = useState<Phase>('setup')
  const [batch, setBatch] = useState<GrammarPoint[]>([])
  const [cardIndex, setCardIndex] = useState(0)
  const donePrimaryButtonRef = useRef<HTMLButtonElement>(null)

  const [quizQuestions, setQuizQuestions] = useState<GrammarQuizQuestion[]>([])
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([])
  const [quizFeedback, setQuizFeedback] = useState<{ isCorrect: boolean; selected: string } | null>(null)
  const choicesRef = useRef<HTMLDivElement>(null)
  const restartButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (phase === 'done') donePrimaryButtonRef.current?.focus()
    if (phase === 'quizResult') restartButtonRef.current?.focus()
  }, [phase])

  function startBatch(fromLevel: KanjiLevel, fromCompleted: number) {
    const fromPool = grammarLevelPool(fromLevel)
    const size = Math.max(1, Math.min(batchSizeInput || 1, fromPool.length - fromCompleted))
    setGrammarStudyBatchSize(size)
    setBatch(fromPool.slice(fromCompleted, fromCompleted + size))
    setCardIndex(0)
    setPhase('studying')
  }

  function finishBatch() {
    setGrammarStudyProgress(level, completedCount + batch.length)
    setPhase('done')
  }

  function startQuiz() {
    setQuizQuestions(generateGrammarQuestions(level, QUIZ_QUESTION_COUNT))
    setQuizIndex(0)
    setQuizAnswers([])
    setQuizFeedback(null)
    setPhase('quiz')
  }

  useEffect(() => {
    if (!retryIds || retryIds.length === 0) return
    setQuizQuestions(generateGrammarQuestionsFromIds(retryIds))
    setQuizIndex(0)
    setQuizAnswers([])
    setQuizFeedback(null)
    setPhase('quiz')
    onRetryIdsConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryIds])

  useEffect(() => {
    if (phase !== 'quizResult') return
    const wrongIds = quizAnswers.filter((a) => !a.isCorrect).map((a) => a.question.entry.id)
    addGrammarWrongNotes(wrongIds)
    // a grammar point answered correctly this round is no longer a standing weak point
    quizAnswers.filter((a) => a.isCorrect).forEach((a) => removeGrammarWrongNote(a.question.entry.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (phase !== 'studying') return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        setCardIndex((i) => (i + 1 < batch.length ? i + 1 : i))
      } else if (e.key === 'ArrowLeft') {
        setCardIndex((i) => (i > 0 ? i - 1 : i))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, batch.length])

  useEffect(() => {
    if (phase !== 'quiz') return
    setQuizFeedback(null)
    choicesRef.current?.querySelector('button')?.focus()
  }, [phase, quizIndex])

  function submitQuizAnswer(selected: string) {
    if (quizFeedback) return
    const question = quizQuestions[quizIndex]
    const isCorrect = selected === question.entry.meaningKr
    setQuizFeedback({ isCorrect, selected })
    setQuizAnswers((prev) => [...prev, { question, selected, isCorrect }])

    setTimeout(() => {
      const nextIndex = quizIndex + 1
      if (nextIndex < quizQuestions.length) {
        setQuizIndex(nextIndex)
      } else {
        setPhase('quizResult')
      }
    }, FEEDBACK_DELAY_MS)
  }

  useEffect(() => {
    if (phase !== 'quiz') return
    function handleKeyDown(e: KeyboardEvent) {
      if (quizFeedback) return
      const choiceIndex = Number(e.key) - 1
      const choice = quizQuestions[quizIndex]?.choices[choiceIndex]
      if (choice) submitQuizAnswer(choice.meaningKr)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, quizIndex, quizFeedback])

  if (phase === 'browse') {
    return (
      <div className="page">
        <div className="page-header">
          <h1>문법 전체 목록 · {level}</h1>
          <button type="button" onClick={() => setPhase('setup')}>
            ← 학습으로
          </button>
        </div>
        <ul className="grammar-browse-list">
          {grammarList
            .filter((g) => g.level === level)
            .map((g) => (
              <li key={g.id} className="grammar-browse-item">
                <span className="grammar-browse-pattern">{g.pattern}</span>
                <span className="grammar-browse-meaning">{g.meaningKr}</span>
              </li>
            ))}
        </ul>
      </div>
    )
  }

  if (phase === 'studying') {
    const point = batch[cardIndex]
    const isLast = cardIndex + 1 === batch.length

    return (
      <div className="page study-page">
        <div className="quiz-progress">
          {cardIndex + 1} / {batch.length}
        </div>
        <div className="study-card">
          <div className="grammar-pattern">{point.pattern}</div>
          <dl className="study-fields">
            <div className="study-field">
              <dt>뜻</dt>
              <dd>{point.meaningKr}</dd>
            </div>
            <div className="study-field">
              <dt>영문 뜻</dt>
              <dd>{point.meaningEn}</dd>
            </div>
            <div className="study-field">
              <dt>설명</dt>
              <dd>{point.explanation}</dd>
            </div>
            <div className="study-field">
              <dt>예문</dt>
              <dd>
                {point.exampleJp}
                <br />
                <span className="grammar-example-kr">{point.exampleKr}</span>
              </dd>
            </div>
          </dl>
        </div>
        <div className="study-nav">
          <button type="button" onClick={() => setCardIndex((i) => i - 1)} disabled={cardIndex === 0}>
            이전
          </button>
          {isLast ? (
            <button type="button" className="study-nav-primary" onClick={finishBatch}>
              학습 완료
            </button>
          ) : (
            <button type="button" className="study-nav-primary" onClick={() => setCardIndex((i) => i + 1)}>
              다음
            </button>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const hasMore = completedCount < pool.length
    return (
      <div className="page">
        <h1>수고했어요!</h1>
        <p className="page-placeholder">문법 {batch.length}개를 학습했습니다.</p>
        <div className="study-done-actions">
          {hasMore && (
            <button
              type="button"
              ref={donePrimaryButtonRef}
              className="study-nav-primary"
              onClick={() => startBatch(level, completedCount)}
            >
              계속하기
            </button>
          )}
          <button
            type="button"
            ref={hasMore ? undefined : donePrimaryButtonRef}
            className={hasMore ? undefined : 'study-nav-primary'}
            onClick={() => setPhase('setup')}
          >
            그만하기
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'quiz') {
    const question = quizQuestions[quizIndex]
    return (
      <div className="quiz-runner">
        <div className="quiz-progress">
          {quizIndex + 1} / {quizQuestions.length}
        </div>
        <div className="grammar-quiz-prompt">
          <span className="grammar-quiz-prompt-pattern">{question.entry.pattern}</span>
          <span className="grammar-quiz-prompt-example">{question.entry.exampleJp}</span>
        </div>
        <div className="grammar-quiz-choices" ref={choicesRef}>
          {question.choices.map((choice, i) => {
            let className = 'grammar-quiz-choice'
            if (quizFeedback) {
              if (choice.meaningKr === quizFeedback.selected) {
                className += quizFeedback.isCorrect ? ' correct' : ' incorrect'
              } else if (!quizFeedback.isCorrect && choice.meaningKr === question.entry.meaningKr) {
                className += ' reveal-correct'
              }
            }
            return (
              <button
                key={choice.id}
                type="button"
                className={className}
                disabled={quizFeedback !== null}
                onClick={() => submitQuizAnswer(choice.meaningKr)}
              >
                <span className="quiz-choice-num">{i + 1}</span>
                {choice.meaningKr}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (phase === 'quizResult') {
    const correctCount = quizAnswers.filter((a) => a.isCorrect).length
    const total = quizAnswers.length
    const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0

    return (
      <div className="result-screen">
        <h1>문법 퀴즈 결과</h1>
        <p className="result-summary">
          {correctCount} / {total} 정답 ({rate}%)
        </p>
        <ul className="result-list">
          {quizAnswers.map((a, i) => (
            <li key={`${a.question.entry.id}-${i}`} className={a.isCorrect ? 'correct' : 'incorrect'}>
              <span className="grammar-result-pattern">{a.question.entry.pattern}</span>
              <span className="result-detail">
                <span className="result-detail-main">
                  정답: {a.question.entry.meaningKr}
                  {!a.isCorrect && <> · 내 답: {a.selected}</>}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <button type="button" ref={restartButtonRef} className="restart-button" onClick={() => setPhase('setup')}>
          다시 설정하기
        </button>
      </div>
    )
  }

  const isLevelFinished = pool.length > 0 && remaining <= 0

  return (
    <div className="page study-setup">
      <div className="page-header">
        <h1>문법</h1>
        <button type="button" onClick={() => setPhase('browse')}>
          전체 목록 보기
        </button>
      </div>

      <div className="study-level-picker">
        {grammarAvailableLevels.map((l) => (
          <button
            key={l}
            type="button"
            className={`study-level-btn${l === level ? ' active' : ''}`}
            onClick={() => setLevel(l)}
          >
            {l}
          </button>
        ))}
      </div>

      <p className="study-progress-summary">
        {level} · {completedCount} / {pool.length}개 학습함
      </p>

      {isLevelFinished ? (
        <p className="page-placeholder">이 급수 문법을 모두 학습했습니다.</p>
      ) : (
        <>
          <label className="study-batch-size">
            한 번에
            <input
              type="number"
              min={1}
              max={remaining}
              value={batchSizeInput}
              onChange={(e) => setBatchSizeInput(Number(e.target.value))}
            />
            개씩
          </label>
          <button type="button" className="study-start-button" onClick={() => startBatch(level, completedCount)}>
            {completedCount > 0 ? '이어하기' : '시작하기'}
          </button>
        </>
      )}

      <button type="button" className="grammar-quiz-button" onClick={startQuiz}>
        문법 퀴즈 풀기 ({Math.min(QUIZ_QUESTION_COUNT, pool.length)}문제)
      </button>
    </div>
  )
}
