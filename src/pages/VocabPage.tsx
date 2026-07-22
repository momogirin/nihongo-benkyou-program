import { useEffect, useMemo, useRef, useState } from 'react'
import { vocabList, type VocabWord } from '../data/vocab'
import type { KanjiLevel } from '../data/kanji'
import { usedKanji } from '../lib/kanjiUsage'
import {
  generateVocabQuestions,
  generateVocabQuestionsFromIds,
  generateVocabBlankQuestions,
  vocabLevelPool,
  vocabBlankLevelPool,
  type VocabQuizQuestion,
  type VocabBlankQuestion,
} from '../lib/vocabQuizGenerator'
import {
  addVocabQuizHistoryEntry,
  addVocabWrongNotes,
  clearVocabInProgressQuiz,
  clearVocabBlankInProgressQuiz,
  getVocabInProgressQuiz,
  getVocabBlankInProgressQuiz,
  getVocabStudyProgress,
  recordSrsReview,
  removeVocabWrongNote,
  saveVocabInProgressQuiz,
  saveVocabBlankInProgressQuiz,
  setVocabStudyProgress,
  type VocabInProgressQuiz,
  type VocabBlankInProgressQuiz,
} from '../lib/storage'
import '../components/QuizRunner.css'
import '../components/ResultScreen.css'
import './StudyPage.css'
import './VocabPage.css'

const ALL_LEVELS: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
const QUIZ_QUESTION_COUNT = 20
const QUIZ_COUNT_OPTIONS = [10, 20, 30, 50, 'all'] as const
const FEEDBACK_DELAY_MS = 550

type Phase = 'setup' | 'studying' | 'done' | 'browse' | 'quiz' | 'quizResult' | 'blankQuiz' | 'blankQuizResult'
type QuizType = 'meaning' | 'blank'
const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  meaning: '뜻 맞히기',
  blank: '문맥 빈칸 채우기',
}

interface QuizAnswer {
  question: VocabQuizQuestion
  selected: string
  isCorrect: boolean
}

interface BlankAnswer {
  question: VocabBlankQuestion
  selectedId: string
  isCorrect: boolean
}

interface Props {
  retryIds?: string[] | null
  onRetryIdsConsumed?: () => void
}

export default function VocabPage({ retryIds, onRetryIdsConsumed }: Props) {
  const [level, setLevel] = useState<KanjiLevel>(ALL_LEVELS[0])
  const pool = useMemo(() => vocabLevelPool(level), [level])
  const blankPool = useMemo(() => vocabBlankLevelPool(level), [level])
  const completedCount = Math.min(getVocabStudyProgress(level), pool.length)
  const remaining = pool.length - completedCount

  const [phase, setPhase] = useState<Phase>('setup')
  const [batch, setBatch] = useState<VocabWord[]>([])
  const [cardIndex, setCardIndex] = useState(0)
  const donePrimaryButtonRef = useRef<HTMLButtonElement>(null)

  const levelWords = useMemo(() => vocabList.filter((w) => w.level === level), [level])
  const [browseIndex, setBrowseIndex] = useState<number | null>(null)
  const [browseQuery, setBrowseQuery] = useState('')

  const [quizCount, setQuizCount] = useState<(typeof QUIZ_COUNT_OPTIONS)[number]>(QUIZ_QUESTION_COUNT)
  const [quizOrder, setQuizOrder] = useState<'random' | 'sequential'>('random')
  const [quizQuestions, setQuizQuestions] = useState<VocabQuizQuestion[]>([])
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
  const [savedQuiz, setSavedQuiz] = useState(() => getVocabInProgressQuiz())

  // 문맥 빈칸 채우기 퀴즈 — 뜻 맞히기 퀴즈와 질문/정답 shape이 달라 상태를 따로 둠
  // (GrammarPage의 뜻맞히기/빈칸채우기 퀴즈와 같은 병렬 구조)
  const [quizType, setQuizType] = useState<QuizType>('meaning')
  const [blankQuestions, setBlankQuestions] = useState<VocabBlankQuestion[]>([])
  const [blankIndex, setBlankIndex] = useState(0)
  const [blankAnswers, setBlankAnswers] = useState<BlankAnswer[]>([])
  const [blankFeedback, setBlankFeedback] = useState<{ isCorrect: boolean; selectedId: string } | null>(null)
  const blankChoicesRef = useRef<HTMLDivElement>(null)
  const blankRestartButtonRef = useRef<HTMLButtonElement>(null)
  const blankStartRef = useRef(0)
  const lastAdvancedBlankIndexRef = useRef(-1)
  const [savedBlankQuiz, setSavedBlankQuiz] = useState(() => getVocabBlankInProgressQuiz())

  useEffect(() => {
    if (phase === 'done') donePrimaryButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'quizResult') restartButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'blankQuizResult') blankRestartButtonRef.current?.focus({ preventScroll: true })
  }, [phase])

  function startBatch(fromLevel: KanjiLevel, fromCompleted: number) {
    const fromPool = vocabLevelPool(fromLevel)
    setBatch(fromPool.slice(fromCompleted))
    setCardIndex(0)
    setPhase('studying')
  }

  function finishBatch() {
    setVocabStudyProgress(level, Math.min(completedCount + batch.length, pool.length))
    setPhase('done')
  }

  function restartBatch(fromLevel: KanjiLevel) {
    const fromPool = vocabLevelPool(fromLevel)
    setBatch(fromPool)
    setCardIndex(0)
    setPhase('studying')
  }

  // saves progress up to (not including) the card being left, so 이어하기
  // re-shows that same card rather than skipping it
  function exitBatch() {
    setVocabStudyProgress(level, completedCount + cardIndex)
    setPhase('setup')
  }

  function startQuiz() {
    clearVocabInProgressQuiz()
    setSavedQuiz(null)
    const count = quizCount === 'all' ? pool.length : quizCount
    setQuizQuestions(generateVocabQuestions(level, count, quizOrder))
    setQuizIndex(0)
    setQuizAnswers([])
    setQuizFeedback(null)
    lastAdvancedQuizIndexRef.current = -1
    quizStartRef.current = Date.now()
    setPhase('quiz')
  }

  // reloads the exact saved questions/choices/answers so resuming isn't a
  // re-roll — same idea as the kanji quiz's 마무리못한 퀴즈 이어하기
  function resumeQuiz(saved: VocabInProgressQuiz) {
    setQuizQuestions(saved.questions)
    setQuizIndex(saved.index)
    setQuizAnswers(saved.answers)
    setQuizFeedback(null)
    lastAdvancedQuizIndexRef.current = -1
    quizStartRef.current = new Date(saved.startedAt).getTime()
    setPhase('quiz')
  }

  function startBlankQuiz() {
    clearVocabBlankInProgressQuiz()
    setSavedBlankQuiz(null)
    const count = quizCount === 'all' ? blankPool.length : quizCount
    setBlankQuestions(generateVocabBlankQuestions(level, count, quizOrder))
    setBlankIndex(0)
    setBlankAnswers([])
    setBlankFeedback(null)
    lastAdvancedBlankIndexRef.current = -1
    blankStartRef.current = Date.now()
    setPhase('blankQuiz')
  }

  function resumeBlankQuiz(saved: VocabBlankInProgressQuiz) {
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
    clearVocabInProgressQuiz()
    setSavedQuiz(null)
    setQuizQuestions(generateVocabQuestionsFromIds(retryIds))
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
    clearVocabInProgressQuiz()
    setSavedQuiz(null)
    const wrongIds = quizAnswers.filter((a) => !a.isCorrect).map((a) => a.question.entry.id)
    addVocabWrongNotes(wrongIds, `단어 퀴즈 · ${level}`)
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
    quizAnswers.forEach((a) => recordSrsReview('vocab', a.question.entry.id, a.isCorrect))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (phase !== 'blankQuizResult') return
    clearVocabBlankInProgressQuiz()
    setSavedBlankQuiz(null)
    const wrongIds = blankAnswers.filter((a) => !a.isCorrect).map((a) => a.question.entry.id)
    addVocabWrongNotes(wrongIds, `단어 문맥 빈칸 퀴즈 · ${level}`)
    addVocabQuizHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      total: blankAnswers.length,
      correct: blankAnswers.filter((a) => a.isCorrect).length,
      elapsedMs: Date.now() - blankStartRef.current,
      finishedAt: new Date().toISOString(),
    })
    blankAnswers.filter((a) => a.isCorrect).forEach((a) => removeVocabWrongNote(a.question.entry.id))
    blankAnswers.forEach((a) => recordSrsReview('vocab', a.question.entry.id, a.isCorrect))
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
      saveVocabInProgressQuiz({
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
      saveVocabBlankInProgressQuiz({
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
              <span className={`study-level-badge study-level-badge-${word.level.toLowerCase()}`}>{word.level}</span>
            </div>
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
              {word.exampleJp && (
                <div className="study-field">
                  <dt>예문</dt>
                  <dd>
                    {word.exampleJp}
                    <br />
                    <span className="vocab-example-kr">{word.exampleKr}</span>
                  </dd>
                </div>
              )}
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
              {word.exampleJp && usedKanji(word.exampleJp).length > 0 && (
                <div className="study-field">
                  <dt>예문 한자</dt>
                  <dd>
                    <div className="study-used-kanji">
                      {usedKanji(word.exampleJp).map((k) => (
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
            w.word.includes(normalizedBrowseQuery) ||
            w.reading.toLowerCase().includes(normalizedBrowseQuery) ||
            w.meaningKr.toLowerCase().includes(normalizedBrowseQuery),
        )
      : levelWords

    return (
      <div className="page">
        <div className="page-header">
          <h1>
            단어 전체 목록 · {level}
          </h1>
          <button type="button" className="study-exit-button" onClick={() => setPhase('setup')}>
            ← 학습으로
          </button>
        </div>
        <input
          type="text"
          className="browse-search-input"
          placeholder="단어, 읽기, 뜻으로 검색"
          value={browseQuery}
          onChange={(e) => setBrowseQuery(e.target.value)}
        />
        {normalizedBrowseQuery && filteredWords.length === 0 ? (
          <p className="page-placeholder">검색 결과가 없습니다.</p>
        ) : (
          <div className="browse-table-wrap">
            <table className="browse-table">
              <thead>
                <tr>
                  <th>단어</th>
                  <th>읽기</th>
                  <th>뜻</th>
                </tr>
              </thead>
              <tbody>
                {filteredWords.map((w) => (
                  <tr
                    key={w.id}
                    tabIndex={0}
                    className={`browse-table-row browse-table-row-${w.level.toLowerCase()}`}
                    onClick={() => setBrowseIndex(levelWords.findIndex((x) => x.id === w.id))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setBrowseIndex(levelWords.findIndex((x) => x.id === w.id))
                    }}
                  >
                    <td className="browse-table-cell-main">{w.word}</td>
                    <td>{w.reading}</td>
                    <td className="browse-table-cell-meaning">{w.meaningKr}</td>
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
              <span className={`study-level-badge study-level-badge-${word.level.toLowerCase()}`}>{word.level}</span>
            </div>
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
              {word.exampleJp && (
                <div className="study-field">
                  <dt>예문</dt>
                  <dd>
                    {word.exampleJp}
                    <br />
                    <span className="vocab-example-kr">{word.exampleKr}</span>
                  </dd>
                </div>
              )}
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
              {word.exampleJp && usedKanji(word.exampleJp).length > 0 && (
                <div className="study-field">
                  <dt>예문 한자</dt>
                  <dd>
                    <div className="study-used-kanji">
                      {usedKanji(word.exampleJp).map((k) => (
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
              setSavedQuiz(getVocabInProgressQuiz())
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
              setSavedBlankQuiz(getVocabBlankInProgressQuiz())
            }}
          >
            나가기
          </button>
          <div className="quiz-progress">
            {blankIndex + 1} / {blankQuestions.length}
          </div>
        </div>
        <div className="vocab-quiz-prompt">
          <span className="vocab-derivation-sentence">{question.blankedSentence}</span>
        </div>
        <div className="vocab-quiz-choices" ref={blankChoicesRef}>
          {question.choices.map((choice, i) => {
            let className = 'vocab-quiz-choice'
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
                {choice.word}
              </button>
            )
          })}
        </div>
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
        <h1>단어 문맥 빈칸 퀴즈 결과</h1>
        <p className="result-summary">
          {correctCount} / {total} 정답 ({rate}%)
        </p>
        <ul className="result-list">
          {blankAnswers.map((a, i) => {
            const selectedChoice = a.question.choices.find((c) => c.id === a.selectedId)
            return (
              <li key={`${a.question.entry.id}-${i}`} className={a.isCorrect ? 'correct' : 'incorrect'}>
                <span className="vocab-result-word">
                  {a.question.entry.word}
                  <span className="vocab-result-reading">{a.question.entry.reading}</span>
                </span>
                <span className="result-detail">
                  <span className="result-detail-main">
                    정답: {a.question.entry.word}
                    {!a.isCorrect && selectedChoice && <> · 내 답: {selectedChoice.word}</>}
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
        <h1>단어</h1>
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
            진행 중이던 단어 퀴즈가 있어요 ({savedQuiz.level} · {savedQuiz.index}/{savedQuiz.questions.length}문제)
          </p>
          <button type="button" className="study-start-button" onClick={() => resumeQuiz(savedQuiz)}>
            이어서 풀기
          </button>
        </>
      )}

      {savedBlankQuiz && (
        <>
          <p className="page-placeholder">
            진행 중이던 단어 문맥 빈칸 퀴즈가 있어요 ({savedBlankQuiz.level} · {savedBlankQuiz.index}/
            {savedBlankQuiz.questions.length}문제)
          </p>
          <button type="button" className="study-start-button" onClick={() => resumeBlankQuiz(savedBlankQuiz)}>
            이어서 풀기
          </button>
        </>
      )}

      <div className="study-level-picker">
        {ALL_LEVELS.map((l) => (
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
        {level} · {completedCount} / {pool.length}단어 학습함
      </p>

      {isLevelFinished ? (
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
        <p className="page-placeholder">이 급수는 아직 빈칸 퀴즈로 낼 수 있는 단어가 없습니다.</p>
      ) : quizType === 'meaning' ? (
        <button type="button" className="vocab-quiz-button" onClick={startQuiz}>
          단어 퀴즈 풀기 ({quizCount === 'all' ? pool.length : Math.min(quizCount, pool.length)}문제)
        </button>
      ) : (
        <button type="button" className="vocab-quiz-button" onClick={startBlankQuiz}>
          문맥 빈칸 퀴즈 풀기 ({quizCount === 'all' ? blankPool.length : Math.min(quizCount, blankPool.length)}문제)
        </button>
      )}
    </div>
  )
}
