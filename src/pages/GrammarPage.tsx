import { useEffect, useMemo, useRef, useState } from 'react'
import type { GrammarPoint } from '../data/grammar'
import type { KanjiLevel } from '../data/kanji'
import { usedKanji } from '../lib/kanjiUsage'
import {
  generateGrammarQuestions,
  generateGrammarQuestionsFromIds,
  generateGrammarBlankQuestions,
  grammarAvailableLevels,
  grammarLevelPool,
  grammarBlankLevelPool,
  type GrammarQuizQuestion,
  type GrammarBlankQuestion,
} from '../lib/grammarQuizGenerator'
import {
  addGrammarQuizHistoryEntry,
  addGrammarWrongNotes,
  clearGrammarInProgressQuiz,
  clearGrammarBlankInProgressQuiz,
  getGrammarInProgressQuiz,
  getGrammarBlankInProgressQuiz,
  getGrammarStudyProgress,
  recordSrsReview,
  recordSrsSelfCheck,
  removeGrammarWrongNote,
  saveGrammarInProgressQuiz,
  saveGrammarBlankInProgressQuiz,
  setGrammarStudyProgress,
  type GrammarInProgressQuiz,
  type GrammarBlankInProgressQuiz,
} from '../lib/storage'
import '../components/QuizRunner.css'
import '../components/ResultScreen.css'
import './StudyPage.css'
import './GrammarPage.css'

const QUIZ_QUESTION_COUNT = 20
const QUIZ_COUNT_OPTIONS = [10, 20, 30, 50, 'all'] as const
const FEEDBACK_DELAY_MS = 550

type Phase = 'setup' | 'studying' | 'done' | 'browse' | 'quiz' | 'quizResult' | 'blankQuiz' | 'blankQuizResult'
type QuizType = 'meaning' | 'blank'
const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  meaning: '뜻 맞히기',
  blank: '문장 빈칸 채우기',
}

interface QuizAnswer {
  question: GrammarQuizQuestion
  selected: string
  isCorrect: boolean
}

interface BlankAnswer {
  question: GrammarBlankQuestion
  selectedId: string
  isCorrect: boolean
}

interface Props {
  retryIds?: string[] | null
  onRetryIdsConsumed?: () => void
}

// shown at the moment of a wrong answer in both grammar quiz types — the full
// grammar card (문형·뜻·해설·예문) so the miss teaches instead of just marking
// wrong. GrammarPoint already carries an explanation field, so no new data.
// .quiz-explanation styles come from the shared QuizRunner.css (already imported).
function GrammarHint({ entry }: { entry: GrammarPoint }) {
  return (
    <div className="quiz-explanation">
      <div className="quiz-explanation-row">
        <span className="quiz-explanation-label">문형</span>
        <span>{entry.pattern} · {entry.meaningKr}</span>
      </div>
      {entry.explanation && (
        <div className="quiz-explanation-row">
          <span className="quiz-explanation-label">해설</span>
          <span>{entry.explanation}</span>
        </div>
      )}
      <div className="quiz-explanation-row">
        <span className="quiz-explanation-label">예</span>
        <span>{entry.exampleJp} · {entry.exampleKr}</span>
      </div>
    </div>
  )
}

export default function GrammarPage({ retryIds, onRetryIdsConsumed }: Props) {
  const [level, setLevel] = useState<KanjiLevel>(grammarAvailableLevels[0])
  const pool = useMemo(() => grammarLevelPool(level), [level])
  const blankPool = useMemo(() => grammarBlankLevelPool(level), [level])
  const completedCount = Math.min(getGrammarStudyProgress(level), pool.length)
  const remaining = pool.length - completedCount

  const [phase, setPhase] = useState<Phase>('setup')
  const [batch, setBatch] = useState<GrammarPoint[]>([])
  const [cardIndex, setCardIndex] = useState(0)
  const donePrimaryButtonRef = useRef<HTMLButtonElement>(null)

  const [browseIndex, setBrowseIndex] = useState<number | null>(null)
  const [browseQuery, setBrowseQuery] = useState('')

  const [quizCount, setQuizCount] = useState<(typeof QUIZ_COUNT_OPTIONS)[number]>(QUIZ_QUESTION_COUNT)
  const [quizOrder, setQuizOrder] = useState<'random' | 'sequential'>('random')
  const [quizQuestions, setQuizQuestions] = useState<GrammarQuizQuestion[]>([])
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([])
  const [quizFeedback, setQuizFeedback] = useState<{ isCorrect: boolean; selected: string } | null>(null)
  const choicesRef = useRef<HTMLDivElement>(null)
  const restartButtonRef = useRef<HTMLButtonElement>(null)
  const quizStartRef = useRef(0)
  // guards handleNextQuiz so a rapid/repeat Enter can't advance twice past
  // the same wrong answer
  const lastAdvancedQuizIndexRef = useRef(-1)
  // when the next question is reached via the 다음-button/Enter path, skip
  // the next choicesRef auto-focus once — otherwise the still-in-flight
  // keyup of that same Enter press can natively "click" whichever choice
  // button the focus effect just moved focus to, silently auto-submitting
  // the new question (see EnglishVocabPage.tsx for the full writeup of how
  // this was found)
  const skipNextChoiceFocusRef = useRef(false)
  // saved quiz session from a previous visit that was never finished — shown
  // on the setup screen as an 이어하기 option instead of silently losing it
  const [savedQuiz, setSavedQuiz] = useState(() => getGrammarInProgressQuiz())

  // 문장 빈칸 채우기 퀴즈 — 뜻 맞히기 퀴즈와 질문/정답 shape이 달라 상태를 따로 둠
  // (이 페이지 안에서도, storage.ts에서도 나란한 병렬 구조 — EnglishVocabPage의
  // 뜻맞히기/품사변환 퀴즈와 같은 패턴)
  const [quizType, setQuizType] = useState<QuizType>('meaning')
  const [blankQuestions, setBlankQuestions] = useState<GrammarBlankQuestion[]>([])
  const [blankIndex, setBlankIndex] = useState(0)
  const [blankAnswers, setBlankAnswers] = useState<BlankAnswer[]>([])
  const [blankFeedback, setBlankFeedback] = useState<{ isCorrect: boolean; selectedId: string } | null>(null)
  const blankChoicesRef = useRef<HTMLDivElement>(null)
  const blankRestartButtonRef = useRef<HTMLButtonElement>(null)
  const blankStartRef = useRef(0)
  const lastAdvancedBlankIndexRef = useRef(-1)
  const [savedBlankQuiz, setSavedBlankQuiz] = useState(() => getGrammarBlankInProgressQuiz())

  useEffect(() => {
    if (phase === 'done') donePrimaryButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'quizResult') restartButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'blankQuizResult') blankRestartButtonRef.current?.focus({ preventScroll: true })
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

  // 자가평가(알겠음/모르겠음) — StudyPage(한자)/VocabPage와 동일한 패턴
  function selfCheck(grammarId: string, knows: boolean) {
    recordSrsSelfCheck('grammar', grammarId, knows)
    if (cardIndex + 1 < batch.length) {
      setCardIndex((i) => i + 1)
    } else {
      finishBatch()
    }
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
    clearGrammarInProgressQuiz()
    setSavedQuiz(null)
    const count = quizCount === 'all' ? pool.length : quizCount
    setQuizQuestions(generateGrammarQuestions(level, count, quizOrder))
    setQuizIndex(0)
    setQuizAnswers([])
    setQuizFeedback(null)
    lastAdvancedQuizIndexRef.current = -1
    quizStartRef.current = Date.now()
    setPhase('quiz')
  }

  // reloads the exact saved questions/choices/answers so resuming isn't a
  // re-roll — same idea as the kanji quiz's 마무리못한 퀴즈 이어하기
  function resumeQuiz(saved: GrammarInProgressQuiz) {
    setQuizQuestions(saved.questions)
    setQuizIndex(saved.index)
    setQuizAnswers(saved.answers)
    setQuizFeedback(null)
    lastAdvancedQuizIndexRef.current = -1
    quizStartRef.current = new Date(saved.startedAt).getTime()
    setPhase('quiz')
  }

  function startBlankQuiz() {
    clearGrammarBlankInProgressQuiz()
    setSavedBlankQuiz(null)
    const count = quizCount === 'all' ? blankPool.length : quizCount
    setBlankQuestions(generateGrammarBlankQuestions(level, count, quizOrder))
    setBlankIndex(0)
    setBlankAnswers([])
    setBlankFeedback(null)
    lastAdvancedBlankIndexRef.current = -1
    blankStartRef.current = Date.now()
    setPhase('blankQuiz')
  }

  function resumeBlankQuiz(saved: GrammarBlankInProgressQuiz) {
    setBlankQuestions(saved.questions)
    setBlankIndex(saved.index)
    setBlankAnswers(saved.answers)
    setBlankFeedback(null)
    lastAdvancedBlankIndexRef.current = -1
    blankStartRef.current = new Date(saved.startedAt).getTime()
    setPhase('blankQuiz')
  }

  useEffect(() => {
    if (!retryIds || retryIds.length === 0) return
    clearGrammarInProgressQuiz()
    setSavedQuiz(null)
    setQuizQuestions(generateGrammarQuestionsFromIds(retryIds))
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
    clearGrammarInProgressQuiz()
    setSavedQuiz(null)
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
    if (phase !== 'blankQuizResult') return
    clearGrammarBlankInProgressQuiz()
    setSavedBlankQuiz(null)
    const wrongIds = blankAnswers.filter((a) => !a.isCorrect).map((a) => a.question.entry.id)
    addGrammarWrongNotes(wrongIds, `문법 빈칸 퀴즈 · ${level}`)
    addGrammarQuizHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      total: blankAnswers.length,
      correct: blankAnswers.filter((a) => a.isCorrect).length,
      elapsedMs: Date.now() - blankStartRef.current,
      finishedAt: new Date().toISOString(),
    })
    blankAnswers.filter((a) => a.isCorrect).forEach((a) => removeGrammarWrongNote(a.question.entry.id))
    blankAnswers.forEach((a) => recordSrsReview('grammar', a.question.entry.id, a.isCorrect))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (phase !== 'studying') return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        setCardIndex((i) => (i + 1 < batch.length ? i + 1 : i))
      } else if (e.key === 'ArrowLeft') {
        setCardIndex((i) => (i > 0 ? i - 1 : i))
      } else if (e.key === 'Enter') {
        selfCheck(batch[cardIndex].id, true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, batch, cardIndex])

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
    if (skipNextChoiceFocusRef.current) {
      skipNextChoiceFocusRef.current = false
      return
    }
    choicesRef.current?.querySelector('button')?.focus()
  }, [phase, quizIndex])

  useEffect(() => {
    if (phase !== 'blankQuiz') return
    if (skipNextChoiceFocusRef.current) {
      skipNextChoiceFocusRef.current = false
      return
    }
    blankChoicesRef.current?.querySelector('button')?.focus()
  }, [phase, blankIndex])

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
    skipNextChoiceFocusRef.current = true
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
      saveGrammarInProgressQuiz({
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

  function goNextBlank(nextIndex: number) {
    if (nextIndex < blankQuestions.length) {
      setBlankFeedback(null)
      setBlankIndex(nextIndex)
    } else {
      setPhase('blankQuizResult')
    }
  }

  function handleNextBlank() {
    if (lastAdvancedBlankIndexRef.current === blankIndex) return
    lastAdvancedBlankIndexRef.current = blankIndex
    skipNextChoiceFocusRef.current = true
    goNextBlank(blankIndex + 1)
  }

  function submitBlankAnswer(selectedId: string) {
    if (blankFeedback) return
    const question = blankQuestions[blankIndex]
    const isCorrect = selectedId === question.entry.id
    setBlankFeedback({ isCorrect, selectedId })
    const updatedAnswers = [...blankAnswers, { question, selectedId, isCorrect }]
    setBlankAnswers(updatedAnswers)

    const nextIndex = blankIndex + 1
    if (nextIndex < blankQuestions.length) {
      saveGrammarBlankInProgressQuiz({
        level,
        questions: blankQuestions,
        index: nextIndex,
        answers: updatedAnswers,
        startedAt: new Date(blankStartRef.current).toISOString(),
      })
    }

    if (isCorrect) {
      setTimeout(() => goNextBlank(nextIndex), FEEDBACK_DELAY_MS)
    }
  }

  useEffect(() => {
    if (phase !== 'blankQuiz') return
    function handleKeyDown(e: KeyboardEvent) {
      if (blankFeedback) {
        if (!blankFeedback.isCorrect && e.key === 'Enter' && !e.repeat) handleNextBlank()
        return
      }
      const choiceIndex = Number(e.key) - 1
      const choice = blankQuestions[blankIndex]?.choices[choiceIndex]
      if (choice) submitBlankAnswer(choice.id)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, blankIndex, blankFeedback])

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
        <p className="shortcut-hint">← → 로 이전/다음 · Esc로 목록으로</p>
      </div>
    )
  }

  if (phase === 'browse') {
    const normalizedBrowseQuery = browseQuery.trim().toLowerCase()
    const filteredPool = normalizedBrowseQuery
      ? pool.filter(
          (g) =>
            g.pattern.toLowerCase().includes(normalizedBrowseQuery) ||
            g.meaningKr.toLowerCase().includes(normalizedBrowseQuery),
        )
      : pool

    return (
      <div className="page">
        <div className="page-header">
          <h1>문법 전체 목록 · {level}</h1>
          <button type="button" className="study-exit-button" onClick={() => setPhase('setup')}>
            ← 학습으로
          </button>
        </div>
        <input
          type="text"
          className="browse-search-input"
          placeholder="문형, 뜻으로 검색"
          value={browseQuery}
          onChange={(e) => setBrowseQuery(e.target.value)}
        />
        {normalizedBrowseQuery && filteredPool.length === 0 ? (
          <p className="page-placeholder">검색 결과가 없습니다.</p>
        ) : (
          <div className="browse-table-wrap">
            <table className="browse-table">
              <thead>
                <tr>
                  <th>문형</th>
                  <th>뜻</th>
                </tr>
              </thead>
              <tbody>
                {filteredPool.map((g) => (
                  <tr
                    key={g.id}
                    tabIndex={0}
                    className={`browse-table-row browse-table-row-${g.level.toLowerCase()}`}
                    onClick={() => setBrowseIndex(pool.findIndex((x) => x.id === g.id))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setBrowseIndex(pool.findIndex((x) => x.id === g.id))
                    }}
                  >
                    <td className="browse-table-cell-main">{g.pattern}</td>
                    <td className="browse-table-cell-meaning">{g.meaningKr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  if (phase === 'studying') {
    const point = batch[cardIndex]

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
          <button type="button" className="study-self-check-btn study-self-check-no" onClick={() => selfCheck(point.id, false)}>
            모르겠음
          </button>
          <button type="button" className="study-self-check-btn study-self-check-yes" onClick={() => selfCheck(point.id, true)}>
            알겠음
          </button>
        </div>
        <p className="shortcut-hint">← → 로 이전/다음 · Enter로 알겠음 처리 후 다음</p>
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
        <div className="quiz-topbar">
          <button
            type="button"
            className="quiz-exit-button"
            onClick={() => {
              setPhase('setup')
              setSavedQuiz(getGrammarInProgressQuiz())
            }}
          >
            나가기
          </button>
          <div className="quiz-progress">
            {quizIndex + 1} / {quizQuestions.length}
          </div>
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
        {quizFeedback && !quizFeedback.isCorrect && <GrammarHint entry={question.entry} />}
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

  if (phase === 'blankQuiz') {
    const question = blankQuestions[blankIndex]
    return (
      <div className="quiz-runner">
        <div className="quiz-topbar">
          <button
            type="button"
            className="quiz-exit-button"
            onClick={() => {
              setPhase('setup')
              setSavedBlankQuiz(getGrammarBlankInProgressQuiz())
            }}
          >
            나가기
          </button>
          <div className="quiz-progress">
            {blankIndex + 1} / {blankQuestions.length}
          </div>
        </div>
        <div className="grammar-quiz-prompt">
          <span className="grammar-quiz-prompt-example">{question.entry.blankJp}</span>
        </div>
        <div className="grammar-quiz-choices" ref={blankChoicesRef}>
          {question.choices.map((choice, i) => {
            let className = 'grammar-quiz-choice'
            if (blankFeedback) {
              if (choice.id === blankFeedback.selectedId) {
                className += blankFeedback.isCorrect ? ' correct' : ' incorrect'
              } else if (!blankFeedback.isCorrect && choice.id === question.entry.id) {
                className += ' reveal-correct'
              }
            }
            return (
              <button
                key={choice.id}
                type="button"
                className={className}
                disabled={blankFeedback !== null}
                onClick={() => submitBlankAnswer(choice.id)}
              >
                <span className="quiz-choice-num">{i + 1}</span>
                {choice.blankAnswer}
              </button>
            )
          })}
        </div>
        {blankFeedback && !blankFeedback.isCorrect && <GrammarHint entry={question.entry} />}
        {blankFeedback && !blankFeedback.isCorrect && (
          <button type="button" className="quiz-next-button" onClick={handleNextBlank}>
            다음
          </button>
        )}
        <p className="shortcut-hint">숫자키(1~4)로 선택 · 오답이면 Enter로 다음 문제</p>
      </div>
    )
  }

  if (phase === 'blankQuizResult') {
    const correctCount = blankAnswers.filter((a) => a.isCorrect).length
    const total = blankAnswers.length
    const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0

    return (
      <div className="result-screen">
        <h1>문법 빈칸 퀴즈 결과</h1>
        <p className="result-summary">
          {correctCount} / {total} 정답 ({rate}%)
        </p>
        <ul className="result-list">
          {blankAnswers.map((a, i) => {
            const selectedChoice = a.question.choices.find((c) => c.id === a.selectedId)
            return (
              <li key={`${a.question.entry.id}-${i}`} className={a.isCorrect ? 'correct' : 'incorrect'}>
                <span className="grammar-result-pattern">{a.question.entry.pattern}</span>
                <span className="result-detail">
                  <span className="result-detail-main">
                    정답: {a.question.entry.blankAnswer}
                    {!a.isCorrect && selectedChoice && <> · 내 답: {selectedChoice.blankAnswer}</>}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          ref={blankRestartButtonRef}
          className="restart-button"
          onClick={() => setPhase('setup')}
        >
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
            진행 중이던 문법 퀴즈가 있어요 ({savedQuiz.level} · {savedQuiz.index}/{savedQuiz.questions.length}문제)
          </p>
          <button type="button" className="study-start-button" onClick={() => resumeQuiz(savedQuiz)}>
            이어서 풀기
          </button>
        </>
      )}

      {savedBlankQuiz && (
        <>
          <p className="page-placeholder">
            진행 중이던 문법 빈칸 퀴즈가 있어요 ({savedBlankQuiz.level} · {savedBlankQuiz.index}/
            {savedBlankQuiz.questions.length}문제)
          </p>
          <button type="button" className="study-start-button" onClick={() => resumeBlankQuiz(savedBlankQuiz)}>
            이어서 풀기
          </button>
        </>
      )}

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

      <div className="quiz-option-group">
        <span className="quiz-option-label">퀴즈 종류</span>
        <div className="study-level-picker">
          {(['meaning', 'blank'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`study-level-btn${quizType === t ? ' active' : ''}`}
              onClick={() => setQuizType(t)}
            >
              {QUIZ_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="quiz-option-group">
        <span className="quiz-option-label">문항 수</span>
        <div className="study-level-picker">
          {QUIZ_COUNT_OPTIONS.map((opt) => {
            const activePool = quizType === 'meaning' ? pool : blankPool
            const disabled = opt !== 'all' && opt > activePool.length
            return (
              <button
                key={opt}
                type="button"
                className={`study-level-btn${quizCount === opt ? ' active' : ''}`}
                disabled={disabled}
                onClick={() => setQuizCount(opt)}
              >
                {opt === 'all' ? `전체 (${activePool.length})` : opt}
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

      {quizType === 'blank' && blankPool.length === 0 ? (
        <p className="page-placeholder">이 급수는 아직 빈칸 퀴즈용 문형이 없습니다.</p>
      ) : quizType === 'meaning' ? (
        <button type="button" className="grammar-quiz-button" onClick={startQuiz}>
          문법 퀴즈 풀기 ({quizCount === 'all' ? pool.length : Math.min(quizCount, pool.length)}문제)
        </button>
      ) : (
        <button type="button" className="grammar-quiz-button" onClick={startBlankQuiz}>
          문장 빈칸 채우기 퀴즈 풀기 ({quizCount === 'all' ? blankPool.length : Math.min(quizCount, blankPool.length)}문제)
        </button>
      )}
    </div>
  )
}
