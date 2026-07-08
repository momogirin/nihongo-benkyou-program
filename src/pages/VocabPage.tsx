import { useEffect, useMemo, useRef, useState } from 'react'
import { vocabList, type VocabWord } from '../data/vocab'
import type { KanjiLevel } from '../data/kanji'
import { usedKanji } from '../lib/kanjiUsage'
import {
  generateVocabQuestions,
  generateVocabQuestionsFromIds,
  vocabLevelPool,
  type VocabQuizQuestion,
} from '../lib/vocabQuizGenerator'
import {
  addVocabQuizHistoryEntry,
  addVocabWrongNotes,
  getVocabStudyBatchSize,
  getVocabStudyProgress,
  removeVocabWrongNote,
  setVocabStudyBatchSize,
  setVocabStudyProgress,
} from '../lib/storage'
import '../components/QuizRunner.css'
import '../components/ResultScreen.css'
import './StudyPage.css'
import './VocabPage.css'

const ALL_LEVELS: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
const QUIZ_QUESTION_COUNT = 20
const FEEDBACK_DELAY_MS = 550

type Phase = 'setup' | 'studying' | 'done' | 'browse' | 'quiz' | 'quizResult'

interface QuizAnswer {
  question: VocabQuizQuestion
  selected: string
  isCorrect: boolean
}

interface Props {
  retryIds?: string[] | null
  onRetryIdsConsumed?: () => void
}

export default function VocabPage({ retryIds, onRetryIdsConsumed }: Props) {
  const [level, setLevel] = useState<KanjiLevel>(ALL_LEVELS[0])
  const pool = useMemo(() => vocabLevelPool(level), [level])
  const completedCount = Math.min(getVocabStudyProgress(level), pool.length)
  const remaining = pool.length - completedCount

  const [batchSizeInput, setBatchSizeInput] = useState(() => getVocabStudyBatchSize())
  const [phase, setPhase] = useState<Phase>('setup')
  const [batch, setBatch] = useState<VocabWord[]>([])
  const [cardIndex, setCardIndex] = useState(0)
  const donePrimaryButtonRef = useRef<HTMLButtonElement>(null)

  const [quizQuestions, setQuizQuestions] = useState<VocabQuizQuestion[]>([])
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
    const fromPool = vocabLevelPool(fromLevel)
    const size = Math.max(1, Math.min(batchSizeInput || 1, fromPool.length - fromCompleted))
    setVocabStudyBatchSize(size)
    setBatch(fromPool.slice(fromCompleted, fromCompleted + size))
    setCardIndex(0)
    setPhase('studying')
  }

  function finishBatch() {
    setVocabStudyProgress(level, completedCount + batch.length)
    setPhase('done')
  }

  function startQuiz() {
    setQuizQuestions(generateVocabQuestions(level, QUIZ_QUESTION_COUNT))
    setQuizIndex(0)
    setQuizAnswers([])
    setQuizFeedback(null)
    quizStartRef.current = Date.now()
    setPhase('quiz')
  }

  useEffect(() => {
    if (!retryIds || retryIds.length === 0) return
    setQuizQuestions(generateVocabQuestionsFromIds(retryIds))
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
    addVocabWrongNotes(wrongIds)
    addVocabQuizHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      total: quizAnswers.length,
      correct: quizAnswers.filter((a) => a.isCorrect).length,
      elapsedMs: Date.now() - quizStartRef.current,
      finishedAt: new Date().toISOString(),
    })
    // a word answered correctly this round is no longer a standing weak point
    quizAnswers.filter((a) => a.isCorrect).forEach((a) => removeVocabWrongNote(a.question.entry.id))
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
          <h1>
            단어 전체 목록 · {level}
          </h1>
          <button type="button" onClick={() => setPhase('setup')}>
            ← 학습으로
          </button>
        </div>
        <ul className="vocab-browse-list">
          {vocabList
            .filter((w) => w.level === level)
            .map((w) => (
              <li key={w.id} className="vocab-browse-item">
                <span className="vocab-browse-word">{w.word}</span>
                <span className="vocab-browse-reading">{w.reading}</span>
                <span className="vocab-browse-meaning">{w.meaningKr}</span>
              </li>
            ))}
        </ul>
      </div>
    )
  }

  if (phase === 'studying') {
    const word = batch[cardIndex]
    const isLast = cardIndex + 1 === batch.length

    return (
      <div className="page study-page">
        <div className="study-content">
          <div className="quiz-progress">
            {cardIndex + 1} / {batch.length}
          </div>
          <div className="study-card">
            <div className="vocab-word-jp">{word.word}</div>
            <div className="vocab-word-reading">{word.reading}</div>
            <dl className="study-fields">
              <div className="study-field">
                <dt>뜻</dt>
                <dd>{word.meaningKr}</dd>
              </div>
              <div className="study-field">
                <dt>영문 뜻</dt>
                <dd>{word.meaningEn}</dd>
              </div>
              {usedKanji(word.word).length > 0 && (
                <div className="study-field">
                  <dt>한자</dt>
                  <dd>
                    <div className="study-used-kanji">
                      {usedKanji(word.word).map((k) => (
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
    const hasMore = completedCount < pool.length
    return (
      <div className="page">
        <h1>수고했어요!</h1>
        <p className="page-placeholder">단어 {batch.length}개를 학습했습니다.</p>
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
        <div className="vocab-quiz-prompt">
          <span className="vocab-quiz-prompt-word">{question.entry.word}</span>
          <span className="vocab-quiz-prompt-reading">{question.entry.reading}</span>
        </div>
        <div className="vocab-quiz-choices" ref={choicesRef}>
          {question.choices.map((choice, i) => {
            let className = 'vocab-quiz-choice'
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
        <h1>단어 퀴즈 결과</h1>
        <p className="result-summary">
          {correctCount} / {total} 정답 ({rate}%)
        </p>
        <ul className="result-list">
          {quizAnswers.map((a, i) => (
            <li key={`${a.question.entry.id}-${i}`} className={a.isCorrect ? 'correct' : 'incorrect'}>
              <span className="vocab-result-word">
                {a.question.entry.word}
                <span className="vocab-result-reading">{a.question.entry.reading}</span>
              </span>
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
        <h1>단어</h1>
        <button type="button" onClick={() => setPhase('browse')}>
          전체 목록 보기
        </button>
      </div>

      <div className="study-level-picker">
        {ALL_LEVELS.map((l) => (
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
        {level} · {completedCount} / {pool.length}단어 학습함
      </p>

      {isLevelFinished ? (
        <p className="page-placeholder">이 급수 단어를 모두 학습했습니다.</p>
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

      <button type="button" className="vocab-quiz-button" onClick={startQuiz}>
        단어 퀴즈 풀기 ({Math.min(QUIZ_QUESTION_COUNT, pool.length)}문제)
      </button>
    </div>
  )
}
