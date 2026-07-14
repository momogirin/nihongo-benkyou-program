import { useEffect, useMemo, useRef, useState } from 'react'
import { englishVocabList, type EnglishVocabWord, type EnglishLevel } from '../data/englishVocab'
import {
  generateEnglishVocabQuestions,
  generateEnglishVocabQuestionsFromIds,
  englishVocabLevelPool,
  type EnglishVocabQuizQuestion,
} from '../lib/englishVocabQuizGenerator'
import {
  addEnglishVocabQuizHistoryEntry,
  addEnglishVocabWrongNotes,
  clearEnglishVocabInProgressQuiz,
  getEnglishVocabInProgressQuiz,
  getEnglishVocabStudyProgress,
  recordSrsReview,
  removeEnglishVocabWrongNote,
  saveEnglishVocabInProgressQuiz,
  setEnglishVocabStudyProgress,
  type EnglishVocabInProgressQuiz,
} from '../lib/storage'
import '../components/QuizRunner.css'
import '../components/ResultScreen.css'
import './StudyPage.css'
import './VocabPage.css'

const ALL_LEVELS: EnglishLevel[] = ['core1', 'core2', 'core3', 'toeic']
const LEVEL_LABELS: Record<EnglishLevel, string> = {
  core1: '필수 1000',
  core2: '필수 2000',
  core3: '확장 어휘',
  toeic: '토익 특화',
}
const QUIZ_QUESTION_COUNT = 20
const QUIZ_COUNT_OPTIONS = [10, 20, 30, 50, 'all'] as const
const FEEDBACK_DELAY_MS = 550

type Phase = 'setup' | 'studying' | 'done' | 'browse' | 'quiz' | 'quizResult'

interface QuizAnswer {
  question: EnglishVocabQuizQuestion
  selected: string
  isCorrect: boolean
}

interface Props {
  retryIds?: string[] | null
  onRetryIdsConsumed?: () => void
}

export default function EnglishVocabPage({ retryIds, onRetryIdsConsumed }: Props) {
  const [level, setLevel] = useState<EnglishLevel>(ALL_LEVELS[0])
  const pool = useMemo(() => englishVocabLevelPool(level), [level])
  const completedCount = Math.min(getEnglishVocabStudyProgress(level), pool.length)
  const remaining = pool.length - completedCount

  const [phase, setPhase] = useState<Phase>('setup')
  const [batch, setBatch] = useState<EnglishVocabWord[]>([])
  const [cardIndex, setCardIndex] = useState(0)
  const donePrimaryButtonRef = useRef<HTMLButtonElement>(null)

  const levelWords = useMemo(() => englishVocabList.filter((w) => w.level === level), [level])
  const [browseIndex, setBrowseIndex] = useState<number | null>(null)
  const [browseQuery, setBrowseQuery] = useState('')

  const [quizCount, setQuizCount] = useState<(typeof QUIZ_COUNT_OPTIONS)[number]>(QUIZ_QUESTION_COUNT)
  const [quizOrder, setQuizOrder] = useState<'random' | 'sequential'>('random')
  const [quizQuestions, setQuizQuestions] = useState<EnglishVocabQuizQuestion[]>([])
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([])
  const [quizFeedback, setQuizFeedback] = useState<{ isCorrect: boolean; selected: string } | null>(null)
  const choicesRef = useRef<HTMLDivElement>(null)
  const restartButtonRef = useRef<HTMLButtonElement>(null)
  const quizStartRef = useRef(0)
  // guards handleNextQuiz so a rapid/repeat Enter can't advance twice past
  // the same wrong answer
  const lastAdvancedQuizIndexRef = useRef(-1)
  // saved quiz session from a previous visit that was never finished — shown
  // on the setup screen as an 이어하기 option instead of silently losing it
  const [savedQuiz, setSavedQuiz] = useState(() => getEnglishVocabInProgressQuiz())

  useEffect(() => {
    if (phase === 'done') donePrimaryButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'quizResult') restartButtonRef.current?.focus({ preventScroll: true })
  }, [phase])

  function startBatch(fromLevel: EnglishLevel, fromCompleted: number) {
    const fromPool = englishVocabLevelPool(fromLevel)
    setBatch(fromPool.slice(fromCompleted))
    setCardIndex(0)
    setPhase('studying')
  }

  function finishBatch() {
    setEnglishVocabStudyProgress(level, Math.min(completedCount + batch.length, pool.length))
    setPhase('done')
  }

  function restartBatch(fromLevel: EnglishLevel) {
    const fromPool = englishVocabLevelPool(fromLevel)
    setBatch(fromPool)
    setCardIndex(0)
    setPhase('studying')
  }

  // saves progress up to (not including) the card being left, so 이어하기
  // re-shows that same card rather than skipping it
  function exitBatch() {
    setEnglishVocabStudyProgress(level, completedCount + cardIndex)
    setPhase('setup')
  }

  function startQuiz() {
    clearEnglishVocabInProgressQuiz()
    setSavedQuiz(null)
    const count = quizCount === 'all' ? pool.length : quizCount
    setQuizQuestions(generateEnglishVocabQuestions(level, count, quizOrder))
    setQuizIndex(0)
    setQuizAnswers([])
    setQuizFeedback(null)
    lastAdvancedQuizIndexRef.current = -1
    quizStartRef.current = Date.now()
    setPhase('quiz')
  }

  // reloads the exact saved questions/choices/answers so resuming isn't a
  // re-roll — same idea as the kanji quiz's 마무리못한 퀴즈 이어하기
  function resumeQuiz(saved: EnglishVocabInProgressQuiz) {
    setQuizQuestions(saved.questions)
    setQuizIndex(saved.index)
    setQuizAnswers(saved.answers)
    setQuizFeedback(null)
    lastAdvancedQuizIndexRef.current = -1
    quizStartRef.current = new Date(saved.startedAt).getTime()
    setPhase('quiz')
  }

  useEffect(() => {
    if (!retryIds || retryIds.length === 0) return
    clearEnglishVocabInProgressQuiz()
    setSavedQuiz(null)
    setQuizQuestions(generateEnglishVocabQuestionsFromIds(retryIds))
    setQuizIndex(0)
    setQuizAnswers([])
    setQuizFeedback(null)
    lastAdvancedQuizIndexRef.current = -1
    quizStartRef.current = Date.now()
    setPhase('quiz')
    onRetryIdsConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryIds])

  useEffect(() => {
    if (phase !== 'quizResult') return
    clearEnglishVocabInProgressQuiz()
    setSavedQuiz(null)
    const wrongIds = quizAnswers.filter((a) => !a.isCorrect).map((a) => a.question.entry.id)
    addEnglishVocabWrongNotes(wrongIds, `영어 단어 퀴즈 · ${LEVEL_LABELS[level]}`)
    addEnglishVocabQuizHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      total: quizAnswers.length,
      correct: quizAnswers.filter((a) => a.isCorrect).length,
      elapsedMs: Date.now() - quizStartRef.current,
      finishedAt: new Date().toISOString(),
    })
    // a word answered correctly this round is no longer a standing weak point
    quizAnswers.filter((a) => a.isCorrect).forEach((a) => removeEnglishVocabWrongNote(a.question.entry.id))
    quizAnswers.forEach((a) => recordSrsReview('englishVocab', a.question.entry.id, a.isCorrect))
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
        setBrowseIndex((i) => (i !== null && i + 1 < levelWords.length ? i + 1 : i))
      } else if (e.key === 'ArrowLeft') {
        setBrowseIndex((i) => (i !== null && i > 0 ? i - 1 : i))
      } else if (e.key === 'Escape') {
        setBrowseIndex(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, browseIndex, levelWords.length])

  useEffect(() => {
    if (phase !== 'quiz') return
    choicesRef.current?.querySelector('button')?.focus()
  }, [phase, quizIndex])

  function goNextQuiz(nextIndex: number) {
    if (nextIndex < quizQuestions.length) {
      // cleared here (synchronously with the index change, not in a
      // separate effect) so the new question never renders one frame with
      // the previous question's feedback/disabled state still applied
      setQuizFeedback(null)
      setQuizIndex(nextIndex)
    } else {
      setPhase('quizResult')
    }
  }

  // wrong answers wait here for an explicit 다음 click/Enter instead of
  // auto-advancing, so there's time to actually read the correct answer
  function handleNextQuiz() {
    if (lastAdvancedQuizIndexRef.current === quizIndex) return
    lastAdvancedQuizIndexRef.current = quizIndex
    goNextQuiz(quizIndex + 1)
  }

  function submitQuizAnswer(selected: string) {
    if (quizFeedback) return
    const question = quizQuestions[quizIndex]
    const isCorrect = selected === question.entry.meaningKr
    setQuizFeedback({ isCorrect, selected })
    const updatedAnswers = [...quizAnswers, { question, selected, isCorrect }]
    setQuizAnswers(updatedAnswers)

    const nextIndex = quizIndex + 1
    if (nextIndex < quizQuestions.length) {
      saveEnglishVocabInProgressQuiz({
        level,
        questions: quizQuestions,
        index: nextIndex,
        answers: updatedAnswers,
        startedAt: new Date(quizStartRef.current).toISOString(),
      })
    }

    // correct answers still auto-advance quickly; wrong answers stop and
    // wait for the 다음 button/Enter (see handleNextQuiz)
    if (isCorrect) {
      setTimeout(() => goNextQuiz(nextIndex), FEEDBACK_DELAY_MS)
    }
  }

  // single window-level keydown listener for the quiz phase — number-key
  // choice shortcuts and Enter-to-advance past a wrong answer
  useEffect(() => {
    if (phase !== 'quiz') return
    function handleKeyDown(e: KeyboardEvent) {
      if (quizFeedback) {
        if (!quizFeedback.isCorrect && e.key === 'Enter' && !e.repeat) handleNextQuiz()
        return
      }
      const choiceIndex = Number(e.key) - 1
      const choice = quizQuestions[quizIndex]?.choices[choiceIndex]
      if (choice) submitQuizAnswer(choice.meaningKr)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, quizIndex, quizFeedback])

  if (phase === 'browse' && browseIndex !== null) {
    const word = levelWords[browseIndex]
    const isFirst = browseIndex === 0
    const isLast = browseIndex + 1 === levelWords.length

    return (
      <div className="page study-page">
        <div className="study-content">
          <div className="study-topbar">
            <button type="button" className="study-exit-button" onClick={() => setBrowseIndex(null)}>
              ← 목록으로
            </button>
            <div className="quiz-progress">
              {browseIndex + 1} / {levelWords.length}
            </div>
          </div>
          <div className="study-card">
            <div className="study-top">
              <span className={`study-level-badge study-level-badge-${word.level}`}>{LEVEL_LABELS[word.level]}</span>
              <span className="study-radical-chip">{word.pos}</span>
            </div>
            <div className="vocab-word-jp">{word.word}</div>
            <dl className="study-fields">
              <div className="study-field">
                <dt>뜻</dt>
                <dd>{word.meaningKr}</dd>
              </div>
              <div className="study-field">
                <dt>영문 뜻</dt>
                <dd>{word.meaningEn}</dd>
              </div>
              <div className="study-field">
                <dt>예문</dt>
                <dd>
                  {word.exampleEn}
                  <br />
                  <span className="vocab-example-kr">{word.exampleKr}</span>
                </dd>
              </div>
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
            onClick={() => setBrowseIndex((i) => (i !== null && i + 1 < levelWords.length ? i + 1 : i))}
            disabled={isLast}
          >
            다음
          </button>
        </div>
        <p className="shortcut-hint">← → 로 이전/다음 · Esc로 목록으로</p>
      </div>
    )
  }

  if (phase === 'browse') {
    const normalizedBrowseQuery = browseQuery.trim().toLowerCase()
    const filteredWords = normalizedBrowseQuery
      ? levelWords.filter(
          (w) =>
            w.word.toLowerCase().includes(normalizedBrowseQuery) ||
            w.meaningKr.toLowerCase().includes(normalizedBrowseQuery),
        )
      : levelWords

    return (
      <div className="page">
        <div className="page-header">
          <h1>단어 전체 목록 · {LEVEL_LABELS[level]}</h1>
          <button type="button" className="study-exit-button" onClick={() => setPhase('setup')}>
            ← 학습으로
          </button>
        </div>
        <input
          type="text"
          className="browse-search-input"
          placeholder="단어, 뜻으로 검색"
          value={browseQuery}
          onChange={(e) => setBrowseQuery(e.target.value)}
        />
        {normalizedBrowseQuery && filteredWords.length === 0 ? (
          <p className="page-placeholder">검색 결과가 없습니다.</p>
        ) : (
          <div className="vocab-browse-grid">
            {filteredWords.map((w) => (
              <button
                type="button"
                className={`vocab-browse-tile vocab-browse-tile-${w.level}`}
                key={w.id}
                onClick={() => setBrowseIndex(levelWords.findIndex((x) => x.id === w.id))}
              >
                <span className="vocab-browse-tile-word">{w.word}</span>
                <span className="vocab-browse-tile-reading">{w.pos}</span>
                <span className="vocab-browse-tile-meaning">{w.meaningKr}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (phase === 'studying') {
    const word = batch[cardIndex]
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
              <span className={`study-level-badge study-level-badge-${word.level}`}>{LEVEL_LABELS[word.level]}</span>
              <span className="study-radical-chip">{word.pos}</span>
            </div>
            <div className="vocab-word-jp">{word.word}</div>
            <dl className="study-fields">
              <div className="study-field">
                <dt>뜻</dt>
                <dd>{word.meaningKr}</dd>
              </div>
              <div className="study-field">
                <dt>영문 뜻</dt>
                <dd>{word.meaningEn}</dd>
              </div>
              <div className="study-field">
                <dt>예문</dt>
                <dd>
                  {word.exampleEn}
                  <br />
                  <span className="vocab-example-kr">{word.exampleKr}</span>
                </dd>
              </div>
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
        <p className="shortcut-hint">← → 로 이전/다음 · Enter로 다음</p>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="page">
        <h1>수고했어요!</h1>
        <p className="page-placeholder">단어 {batch.length}개를 학습했습니다.</p>
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
        <div className="quiz-topbar">
          <button
            type="button"
            className="quiz-exit-button"
            onClick={() => {
              setPhase('setup')
              setSavedQuiz(getEnglishVocabInProgressQuiz())
            }}
          >
            나가기
          </button>
          <div className="quiz-progress">
            {quizIndex + 1} / {quizQuestions.length}
          </div>
        </div>
        <div className="vocab-quiz-prompt">
          <span className="vocab-quiz-prompt-word">{question.entry.word}</span>
          <span className="vocab-quiz-prompt-reading">{question.entry.pos}</span>
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
        {quizFeedback && !quizFeedback.isCorrect && (
          <button type="button" className="quiz-next-button" onClick={handleNextQuiz}>
            다음
          </button>
        )}
        <p className="shortcut-hint">숫자키(1~4)로 선택 · 오답이면 Enter로 다음 문제</p>
      </div>
    )
  }

  if (phase === 'quizResult') {
    const correctCount = quizAnswers.filter((a) => a.isCorrect).length
    const total = quizAnswers.length
    const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0

    return (
      <div className="result-screen">
        <h1>영어 단어 퀴즈 결과</h1>
        <p className="result-summary">
          {correctCount} / {total} 정답 ({rate}%)
        </p>
        <ul className="result-list">
          {quizAnswers.map((a, i) => (
            <li key={`${a.question.entry.id}-${i}`} className={a.isCorrect ? 'correct' : 'incorrect'}>
              <span className="vocab-result-word">
                {a.question.entry.word}
                <span className="vocab-result-reading">{a.question.entry.pos}</span>
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
        <h1>영어 단어</h1>
        <button
          type="button"
          className="study-exit-button"
          onClick={() => {
            setBrowseIndex(null)
            setBrowseQuery('')
            setPhase('browse')
          }}
        >
          전체 목록 보기
        </button>
      </div>

      {savedQuiz && (
        <>
          <p className="page-placeholder">
            진행 중이던 영어 단어 퀴즈가 있어요 ({LEVEL_LABELS[savedQuiz.level]} · {savedQuiz.index}/{savedQuiz.questions.length}문제)
          </p>
          <button type="button" className="study-start-button" onClick={() => resumeQuiz(savedQuiz)}>
            이어서 풀기
          </button>
        </>
      )}

      <div className="study-level-picker">
        {ALL_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            className={`study-level-btn study-level-btn-${l}${l === level ? ' active' : ''}`}
            onClick={() => setLevel(l)}
          >
            {LEVEL_LABELS[l]}
          </button>
        ))}
      </div>

      <p className="study-progress-summary">
        {LEVEL_LABELS[level]} · {completedCount} / {pool.length}단어 학습함
      </p>

      {pool.length === 0 ? (
        <p className="page-placeholder">이 급수는 아직 콘텐츠 작업 중입니다.</p>
      ) : isLevelFinished ? (
        <>
          <p className="page-placeholder">이 급수 단어를 모두 학습했습니다.</p>
          <button type="button" className="study-start-button" onClick={() => restartBatch(level)}>
            처음부터 다시 학습하기
          </button>
        </>
      ) : (
        <button type="button" className="study-start-button" onClick={() => startBatch(level, completedCount)}>
          {completedCount > 0 ? '이어하기' : '시작하기'}
        </button>
      )}

      <div className="quiz-option-group">
        <span className="quiz-option-label">문항 수</span>
        <div className="study-level-picker">
          {QUIZ_COUNT_OPTIONS.map((opt) => {
            const disabled = opt !== 'all' && opt > pool.length
            return (
              <button
                key={opt}
                type="button"
                className={`study-level-btn${quizCount === opt ? ' active' : ''}`}
                disabled={disabled}
                onClick={() => setQuizCount(opt)}
              >
                {opt === 'all' ? `전체 (${pool.length})` : opt}
              </button>
            )
          })}
        </div>
      </div>

      <div className="quiz-option-group">
        <span className="quiz-option-label">순서</span>
        <div className="study-level-picker">
          <button
            type="button"
            className={`study-level-btn${quizOrder === 'random' ? ' active' : ''}`}
            onClick={() => setQuizOrder('random')}
          >
            랜덤
          </button>
          <button
            type="button"
            className={`study-level-btn${quizOrder === 'sequential' ? ' active' : ''}`}
            onClick={() => setQuizOrder('sequential')}
          >
            순차
          </button>
        </div>
      </div>

      <button type="button" className="vocab-quiz-button" onClick={startQuiz} disabled={pool.length === 0}>
        단어 퀴즈 풀기 ({quizCount === 'all' ? pool.length : Math.min(quizCount, pool.length)}문제)
      </button>
    </div>
  )
}
