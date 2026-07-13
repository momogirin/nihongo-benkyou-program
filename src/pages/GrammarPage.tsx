import { useEffect, useMemo, useRef, useState } from 'react'
import type { GrammarPoint } from '../data/grammar'
import type { KanjiLevel } from '../data/kanji'
import { usedKanji } from '../lib/kanjiUsage'
import {
  generateGrammarQuestions,
  generateGrammarQuestionsFromIds,
  grammarAvailableLevels,
  grammarLevelPool,
  type GrammarQuizQuestion,
} from '../lib/grammarQuizGenerator'
import {
  addGrammarQuizHistoryEntry,
  addGrammarWrongNotes,
  getGrammarStudyProgress,
  recordSrsReview,
  removeGrammarWrongNote,
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

  const [phase, setPhase] = useState<Phase>('setup')
  const [batch, setBatch] = useState<GrammarPoint[]>([])
  const [cardIndex, setCardIndex] = useState(0)
  const donePrimaryButtonRef = useRef<HTMLButtonElement>(null)

  const [browseIndex, setBrowseIndex] = useState<number | null>(null)

  const [quizQuestions, setQuizQuestions] = useState<GrammarQuizQuestion[]>([])
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([])
  const [quizFeedback, setQuizFeedback] = useState<{ isCorrect: boolean; selected: string } | null>(null)
  const choicesRef = useRef<HTMLDivElement>(null)
  const restartButtonRef = useRef<HTMLButtonElement>(null)
  const quizStartRef = useRef(0)

  useEffect(() => {
    if (phase === 'done') donePrimaryButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'quizResult') restartButtonRef.current?.focus({ preventScroll: true })
  }, [phase])

  function startBatch(fromLevel: KanjiLevel, fromCompleted: number) {
    const fromPool = grammarLevelPool(fromLevel)
    setBatch(fromPool.slice(fromCompleted))
    setCardIndex(0)
    setPhase('studying')
  }

  function finishBatch() {
    setGrammarStudyProgress(level, Math.min(completedCount + batch.length, pool.length))
    setPhase('done')
  }

  function restartBatch(fromLevel: KanjiLevel) {
    const fromPool = grammarLevelPool(fromLevel)
    setBatch(fromPool)
    setCardIndex(0)
    setPhase('studying')
  }

  // saves progress up to (not including) the card being left, so 이어하기
  // re-shows that same card rather than skipping it
  function exitBatch() {
    setGrammarStudyProgress(level, completedCount + cardIndex)
    setPhase('setup')
  }

  function startQuiz() {
    setQuizQuestions(generateGrammarQuestions(level, QUIZ_QUESTION_COUNT))
    setQuizIndex(0)
    setQuizAnswers([])
    setQuizFeedback(null)
    quizStartRef.current = Date.now()
    setPhase('quiz')
  }

  useEffect(() => {
    if (!retryIds || retryIds.length === 0) return
    setQuizQuestions(generateGrammarQuestionsFromIds(retryIds))
    setQuizIndex(0)
    setQuizAnswers([])
    setQuizFeedback(null)
    quizStartRef.current = Date.now()
    setPhase('quiz')
    onRetryIdsConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryIds])

  useEffect(() => {
    if (phase !== 'quizResult') return
    const wrongIds = quizAnswers.filter((a) => !a.isCorrect).map((a) => a.question.entry.id)
    addGrammarWrongNotes(wrongIds, `문법 퀴즈 · ${level}`)
    addGrammarQuizHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      total: quizAnswers.length,
      correct: quizAnswers.filter((a) => a.isCorrect).length,
      elapsedMs: Date.now() - quizStartRef.current,
      finishedAt: new Date().toISOString(),
    })
    // a grammar point answered correctly this round is no longer a standing weak point
    quizAnswers.filter((a) => a.isCorrect).forEach((a) => removeGrammarWrongNote(a.question.entry.id))
    quizAnswers.forEach((a) => recordSrsReview('grammar', a.question.entry.id, a.isCorrect))
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
    if (phase !== 'browse' || browseIndex === null) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        setBrowseIndex((i) => (i !== null && i + 1 < pool.length ? i + 1 : i))
      } else if (e.key === 'ArrowLeft') {
        setBrowseIndex((i) => (i !== null && i > 0 ? i - 1 : i))
      } else if (e.key === 'Escape') {
        setBrowseIndex(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, browseIndex, pool.length])

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

  if (phase === 'browse' && browseIndex !== null) {
    const point = pool[browseIndex]
    const isFirst = browseIndex === 0
    const isLast = browseIndex + 1 === pool.length

    return (
      <div className="page study-page">
        <div className="study-content">
          <div className="study-topbar">
            <button type="button" className="study-exit-button" onClick={() => setBrowseIndex(null)}>
              ← 목록으로
            </button>
            <div className="quiz-progress">
              {browseIndex + 1} / {pool.length}
            </div>
          </div>
          <div className="study-card">
            <div className="study-top">
              <span className={`study-level-badge study-level-badge-${point.level.toLowerCase()}`}>{point.level}</span>
            </div>
            <div className="grammar-pattern-label">문형</div>
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
              {usedKanji(point.exampleJp).length > 0 && (
                <div className="study-field">
                  <dt>예문 한자</dt>
                  <dd>
                    <div className="study-used-kanji">
                      {usedKanji(point.exampleJp).map((k) => (
                        <span key={k.id} className="study-used-kanji-chip">
                          <span className="study-used-kanji-char">{k.kanji}</span>
                          <span className="study-used-kanji-info">
                            {k.level} · {k.kunKr}
                          </span>
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
        <div className="study-nav">
          <button type="button" onClick={() => setBrowseIndex((i) => (i !== null && i > 0 ? i - 1 : i))} disabled={isFirst}>
            이전
          </button>
          <button
            type="button"
            className="study-nav-primary"
            onClick={() => setBrowseIndex((i) => (i !== null && i + 1 < pool.length ? i + 1 : i))}
            disabled={isLast}
          >
            다음
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'browse') {
    return (
      <div className="page">
        <div className="page-header">
          <h1>문법 전체 목록 · {level}</h1>
          <button type="button" onClick={() => setPhase('setup')}>
            ← 학습으로
          </button>
        </div>
        <div className="grammar-browse-grid">
          {pool.map((g, i) => (
            <button
              type="button"
              className={`grammar-browse-tile grammar-browse-tile-${g.level.toLowerCase()}`}
              key={g.id}
              onClick={() => setBrowseIndex(i)}
            >
              <span className="grammar-browse-tile-pattern">{g.pattern}</span>
              <span className="grammar-browse-tile-meaning">{g.meaningKr}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'studying') {
    const point = batch[cardIndex]
    const isLast = cardIndex + 1 === batch.length

    return (
      <div className="page study-page">
        <div className="study-content">
          <div className="study-topbar">
            <button type="button" className="study-exit-button" onClick={exitBatch}>
              나가기
            </button>
            <div className="quiz-progress">
              {cardIndex + 1} / {batch.length}
            </div>
          </div>
          <div className="study-card">
            <div className="study-top">
              <span className={`study-level-badge study-level-badge-${point.level.toLowerCase()}`}>{point.level}</span>
            </div>
            <div className="grammar-pattern-label">문형</div>
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
              {usedKanji(point.exampleJp).length > 0 && (
                <div className="study-field">
                  <dt>예문 한자</dt>
                  <dd>
                    <div className="study-used-kanji">
                      {usedKanji(point.exampleJp).map((k) => (
                        <span key={k.id} className="study-used-kanji-chip">
                          <span className="study-used-kanji-char">{k.kanji}</span>
                          <span className="study-used-kanji-info">
                            {k.level} · {k.kunKr}
                          </span>
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}
            </dl>
          </div>
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
    return (
      <div className="page">
        <h1>수고했어요!</h1>
        <p className="page-placeholder">문법 {batch.length}개를 학습했습니다.</p>
        <div className="study-done-actions">
          <button
            type="button"
            ref={donePrimaryButtonRef}
            className="study-nav-primary"
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
        <button
          type="button"
          onClick={() => {
            setBrowseIndex(null)
            setPhase('browse')
          }}
        >
          전체 목록 보기
        </button>
      </div>

      <div className="study-level-picker">
        {grammarAvailableLevels.map((l) => (
          <button
            key={l}
            type="button"
            className={`study-level-btn study-level-btn-${l.toLowerCase()}${l === level ? ' active' : ''}`}
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
        <>
          <p className="page-placeholder">이 급수 문법을 모두 학습했습니다.</p>
          <button type="button" className="study-start-button" onClick={() => restartBatch(level)}>
            처음부터 다시 학습하기
          </button>
        </>
      ) : (
        <button type="button" className="study-start-button" onClick={() => startBatch(level, completedCount)}>
          {completedCount > 0 ? '이어하기' : '시작하기'}
        </button>
      )}

      <button type="button" className="grammar-quiz-button" onClick={startQuiz}>
        문법 퀴즈 풀기 ({Math.min(QUIZ_QUESTION_COUNT, pool.length)}문제)
      </button>
    </div>
  )
}
