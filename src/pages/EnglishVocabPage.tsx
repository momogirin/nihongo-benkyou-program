import { useEffect, useMemo, useRef, useState } from 'react'
import { englishVocabList, type EnglishVocabWord, type EnglishLevel } from '../data/englishVocab'
import {
  generateEnglishVocabQuestions,
  generateEnglishVocabQuestionsFromIds,
  generateEnglishVocabDerivationQuestions,
  englishVocabLevelPool,
  englishVocabDerivationLevelPool,
  type EnglishVocabQuizQuestion,
  type EnglishVocabDerivationQuestion,
} from '../lib/englishVocabQuizGenerator'
import {
  addEnglishVocabQuizHistoryEntry,
  addEnglishVocabWrongNotes,
  clearEnglishVocabInProgressQuiz,
  clearEnglishVocabDerivationInProgressQuiz,
  getEnglishVocabInProgressQuiz,
  getEnglishVocabDerivationInProgressQuiz,
  getEnglishVocabStudyProgress,
  recordSrsReview,
  removeEnglishVocabWrongNote,
  saveEnglishVocabInProgressQuiz,
  saveEnglishVocabDerivationInProgressQuiz,
  setEnglishVocabStudyProgress,
  type EnglishVocabInProgressQuiz,
  type EnglishVocabDerivationInProgressQuiz,
} from '../lib/storage'
import '../components/QuizRunner.css'
import '../components/ResultScreen.css'
import './StudyPage.css'
import './VocabPage.css'

// wordFamilyId가 같은 단어들을 표제어 순서(word 알파벳순)로 묶어 학습/상세 카드에
// "파생어 세트"로 보여주기 위한 헬퍼 — 새 인덱스를 만들지 않고 매번 필터링(단어 수가
// 4,059개라 렌더당 필터 비용이 무시할 만한 수준, kanjiUsage.ts의 usedKanji와 같은 패턴)
function wordFamilyMembers(word: EnglishVocabWord): EnglishVocabWord[] {
  if (!word.wordFamilyId) return []
  return englishVocabList
    .filter((w) => w.wordFamilyId === word.wordFamilyId && w.id !== word.id)
    .sort((a, b) => a.word.localeCompare(b.word))
}

// 파생어 세트는 절반 이상이 급수 경계를 넘나들어서(예: core1 표제어의 파생형이
// core3에 있는 경우) 전체보기 상세 화면에서 다른 파생어를 클릭하면 지금 보고 있는
// 급수 밖의 단어일 수 있음 — 그 단어의 급수로 전환한 뒤 그 급수 목록 기준 인덱스로 이동
function jumpToWord(target: EnglishVocabWord, setLevel: (l: EnglishLevel) => void, setBrowseIndex: (i: number) => void) {
  setLevel(target.level)
  const siblings = englishVocabList.filter((w) => w.level === target.level)
  setBrowseIndex(siblings.findIndex((w) => w.id === target.id))
}

// 발음 듣기(2단계 후보였던 TTS) — 브라우저 내장 Web Speech API라 데이터/서버
// 추가 없이 구현 가능. 미지원 브라우저에서도 조용히 실패하지 않게 speak()
// 호출 전 지원 여부를 UI 쪽(canSpeak)에서 먼저 걸러 버튼 자체를 숨김
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
function speak(word: string) {
  if (!canSpeak) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = 'en-US'
  window.speechSynthesis.speak(utterance)
}

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

type Phase = 'setup' | 'studying' | 'done' | 'browse' | 'quiz' | 'quizResult' | 'derivationQuiz' | 'derivationQuizResult'
type QuizType = 'meaning' | 'derivation'
const QUIZ_TYPE_LABELS: Record<QuizType, string> = { meaning: '뜻 맞히기', derivation: '품사 변환 빈칸형' }

interface QuizAnswer {
  question: EnglishVocabQuizQuestion
  selected: string
  isCorrect: boolean
}

interface DerivationAnswer {
  question: EnglishVocabDerivationQuestion
  selectedId: string
  isCorrect: boolean
}

interface Props {
  retryIds?: string[] | null
  onRetryIdsConsumed?: () => void
}

export default function EnglishVocabPage({ retryIds, onRetryIdsConsumed }: Props) {
  const [level, setLevel] = useState<EnglishLevel>(ALL_LEVELS[0])
  const pool = useMemo(() => englishVocabLevelPool(level), [level])
  const derivationPool = useMemo(() => englishVocabDerivationLevelPool(level), [level])
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
  // when the next question is reached via the 다음-button/Enter path (as
  // opposed to a fresh quiz start or a correct-answer auto-advance), skip
  // the next choicesRef auto-focus once — otherwise the still-in-flight
  // keyup of that same Enter press natively "clicks" whichever choice
  // button the focus effect just moved focus to, silently auto-answering
  // the new question (same root cause the 오답 "다음" button's own auto-focus
  // was removed for, see StudyPage/QuizRunner history — this is the same
  // race showing up via the per-question choice-focus effect instead)
  const skipNextChoiceFocusRef = useRef(false)
  // saved quiz session from a previous visit that was never finished — shown
  // on the setup screen as an 이어하기 option instead of silently losing it
  const [savedQuiz, setSavedQuiz] = useState(() => getEnglishVocabInProgressQuiz())

  // 품사 변환 빈칸형 퀴즈(파생어 세트) — 뜻 맞히기 퀴즈와 질문/정답 shape이 달라
  // 상태를 따로 둠(이 페이지 안에서도, storage.ts에서도 나란한 병렬 구조)
  const [quizType, setQuizType] = useState<QuizType>('meaning')
  const [derivationQuestions, setDerivationQuestions] = useState<EnglishVocabDerivationQuestion[]>([])
  const [derivationIndex, setDerivationIndex] = useState(0)
  const [derivationAnswers, setDerivationAnswers] = useState<DerivationAnswer[]>([])
  const [derivationFeedback, setDerivationFeedback] = useState<{ isCorrect: boolean; selectedId: string } | null>(
    null,
  )
  const derivationChoicesRef = useRef<HTMLDivElement>(null)
  const derivationRestartButtonRef = useRef<HTMLButtonElement>(null)
  const derivationStartRef = useRef(0)
  const lastAdvancedDerivationIndexRef = useRef(-1)
  const [savedDerivationQuiz, setSavedDerivationQuiz] = useState(() => getEnglishVocabDerivationInProgressQuiz())

  useEffect(() => {
    if (phase === 'done') donePrimaryButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'quizResult') restartButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'derivationQuizResult') derivationRestartButtonRef.current?.focus({ preventScroll: true })
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

  function startDerivationQuiz() {
    clearEnglishVocabDerivationInProgressQuiz()
    setSavedDerivationQuiz(null)
    const count = quizCount === 'all' ? derivationPool.length : quizCount
    setDerivationQuestions(generateEnglishVocabDerivationQuestions(level, count, quizOrder))
    setDerivationIndex(0)
    setDerivationAnswers([])
    setDerivationFeedback(null)
    lastAdvancedDerivationIndexRef.current = -1
    derivationStartRef.current = Date.now()
    setPhase('derivationQuiz')
  }

  function resumeDerivationQuiz(saved: EnglishVocabDerivationInProgressQuiz) {
    setDerivationQuestions(saved.questions)
    setDerivationIndex(saved.index)
    setDerivationAnswers(saved.answers)
    setDerivationFeedback(null)
    lastAdvancedDerivationIndexRef.current = -1
    derivationStartRef.current = new Date(saved.startedAt).getTime()
    setPhase('derivationQuiz')
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
    if (phase !== 'derivationQuizResult') return
    clearEnglishVocabDerivationInProgressQuiz()
    setSavedDerivationQuiz(null)
    const wrongIds = derivationAnswers.filter((a) => !a.isCorrect).map((a) => a.question.entry.id)
    addEnglishVocabWrongNotes(wrongIds, `영어 단어 품사 변환 퀴즈 · ${LEVEL_LABELS[level]}`)
    addEnglishVocabQuizHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      total: derivationAnswers.length,
      correct: derivationAnswers.filter((a) => a.isCorrect).length,
      elapsedMs: Date.now() - derivationStartRef.current,
      finishedAt: new Date().toISOString(),
    })
    derivationAnswers.filter((a) => a.isCorrect).forEach((a) => removeEnglishVocabWrongNote(a.question.entry.id))
    derivationAnswers.forEach((a) => recordSrsReview('englishVocab', a.question.entry.id, a.isCorrect))
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
    if (phase !== 'derivationQuiz') return
    if (skipNextChoiceFocusRef.current) {
      skipNextChoiceFocusRef.current = false
      return
    }
    derivationChoicesRef.current?.querySelector('button')?.focus()
  }, [phase, derivationIndex])

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

  function goNextDerivation(nextIndex: number) {
    if (nextIndex < derivationQuestions.length) {
      setDerivationFeedback(null)
      setDerivationIndex(nextIndex)
    } else {
      setPhase('derivationQuizResult')
    }
  }

  function handleNextDerivation() {
    if (lastAdvancedDerivationIndexRef.current === derivationIndex) return
    lastAdvancedDerivationIndexRef.current = derivationIndex
    skipNextChoiceFocusRef.current = true
    goNextDerivation(derivationIndex + 1)
  }

  function submitDerivationAnswer(selectedId: string) {
    if (derivationFeedback) return
    const question = derivationQuestions[derivationIndex]
    const isCorrect = selectedId === question.entry.id
    setDerivationFeedback({ isCorrect, selectedId })
    const updatedAnswers = [...derivationAnswers, { question, selectedId, isCorrect }]
    setDerivationAnswers(updatedAnswers)

    const nextIndex = derivationIndex + 1
    if (nextIndex < derivationQuestions.length) {
      saveEnglishVocabDerivationInProgressQuiz({
        level,
        questions: derivationQuestions,
        index: nextIndex,
        answers: updatedAnswers,
        startedAt: new Date(derivationStartRef.current).toISOString(),
      })
    }

    if (isCorrect) {
      setTimeout(() => goNextDerivation(nextIndex), FEEDBACK_DELAY_MS)
    }
  }

  useEffect(() => {
    if (phase !== 'derivationQuiz') return
    function handleKeyDown(e: KeyboardEvent) {
      if (derivationFeedback) {
        if (!derivationFeedback.isCorrect && e.key === 'Enter' && !e.repeat) handleNextDerivation()
        return
      }
      const choiceIndex = Number(e.key) - 1
      const choice = derivationQuestions[derivationIndex]?.choices[choiceIndex]
      if (choice) submitDerivationAnswer(choice.id)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, derivationIndex, derivationFeedback])

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
            <div className="vocab-word-jp vocab-word-with-speaker">
              {word.word}
              {canSpeak && (
                <button
                  type="button"
                  className="vocab-speaker-button"
                  onClick={() => speak(word.word)}
                  aria-label={`${word.word} 발음 듣기`}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-.77-3.29-2-4.24v8.47c1.23-.94 2-2.46 2-4.23zM18 4.55v1.63c2.89 1.16 5 3.98 5 7.32s-2.11 6.16-5 7.32v1.63c3.78-1.19 6.5-4.71 6.5-8.95S21.78 5.74 18 4.55z"
                    />
                  </svg>
                </button>
              )}
            </div>
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
              {wordFamilyMembers(word).length > 0 && (
                <div className="study-field">
                  <dt>파생어</dt>
                  <dd>
                    <div className="study-used-kanji">
                      {wordFamilyMembers(word).map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          className="study-used-kanji-chip study-used-kanji-chip-button"
                          onClick={() => jumpToWord(w, setLevel, setBrowseIndex)}
                        >
                          <span className="study-used-kanji-char">{w.word}</span>
                          <span className="study-used-kanji-info">
                            {LEVEL_LABELS[w.level]} · {w.derivationPos}
                          </span>
                        </button>
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
            <div className="vocab-word-jp vocab-word-with-speaker">
              {word.word}
              {canSpeak && (
                <button
                  type="button"
                  className="vocab-speaker-button"
                  onClick={() => speak(word.word)}
                  aria-label={`${word.word} 발음 듣기`}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-.77-3.29-2-4.24v8.47c1.23-.94 2-2.46 2-4.23zM18 4.55v1.63c2.89 1.16 5 3.98 5 7.32s-2.11 6.16-5 7.32v1.63c3.78-1.19 6.5-4.71 6.5-8.95S21.78 5.74 18 4.55z"
                    />
                  </svg>
                </button>
              )}
            </div>
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
              {wordFamilyMembers(word).length > 0 && (
                <div className="study-field">
                  <dt>파생어</dt>
                  <dd>
                    <div className="study-used-kanji">
                      {wordFamilyMembers(word).map((w) => (
                        <span key={w.id} className="study-used-kanji-chip">
                          <span className="study-used-kanji-char">{w.word}</span>
                          <span className="study-used-kanji-info">
                            {LEVEL_LABELS[w.level]} · {w.derivationPos}
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
          <span className="vocab-quiz-prompt-word vocab-word-with-speaker">
            {question.entry.word}
            {canSpeak && (
              <button
                type="button"
                className="vocab-speaker-button"
                onClick={() => speak(question.entry.word)}
                aria-label={`${question.entry.word} 발음 듣기`}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-.77-3.29-2-4.24v8.47c1.23-.94 2-2.46 2-4.23zM18 4.55v1.63c2.89 1.16 5 3.98 5 7.32s-2.11 6.16-5 7.32v1.63c3.78-1.19 6.5-4.71 6.5-8.95S21.78 5.74 18 4.55z"
                  />
                </svg>
              </button>
            )}
          </span>
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

  if (phase === 'derivationQuiz') {
    const question = derivationQuestions[derivationIndex]
    return (
      <div className="quiz-runner">
        <div className="quiz-topbar">
          <button
            type="button"
            className="quiz-exit-button"
            onClick={() => {
              setPhase('setup')
              setSavedDerivationQuiz(getEnglishVocabDerivationInProgressQuiz())
            }}
          >
            나가기
          </button>
          <div className="quiz-progress">
            {derivationIndex + 1} / {derivationQuestions.length}
          </div>
        </div>
        <div className="vocab-quiz-prompt">
          <span className="vocab-derivation-sentence">{question.blankedSentence}</span>
        </div>
        <div className="vocab-quiz-choices" ref={derivationChoicesRef}>
          {question.choices.map((choice, i) => {
            let className = 'vocab-quiz-choice'
            if (derivationFeedback) {
              if (choice.id === derivationFeedback.selectedId) {
                className += derivationFeedback.isCorrect ? ' correct' : ' incorrect'
              } else if (!derivationFeedback.isCorrect && choice.id === question.entry.id) {
                className += ' reveal-correct'
              }
            }
            return (
              <button
                key={choice.id}
                type="button"
                className={className}
                disabled={derivationFeedback !== null}
                onClick={() => submitDerivationAnswer(choice.id)}
              >
                <span className="quiz-choice-num">{i + 1}</span>
                {choice.word}
                <span className="quiz-choice-pos">{choice.derivationPos}</span>
              </button>
            )
          })}
        </div>
        {derivationFeedback && !derivationFeedback.isCorrect && (
          <button type="button" className="quiz-next-button" onClick={handleNextDerivation}>
            다음
          </button>
        )}
        <p className="shortcut-hint">숫자키로 선택 · 오답이면 Enter로 다음 문제</p>
      </div>
    )
  }

  if (phase === 'derivationQuizResult') {
    const correctCount = derivationAnswers.filter((a) => a.isCorrect).length
    const total = derivationAnswers.length
    const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0

    return (
      <div className="result-screen">
        <h1>영어 단어 품사 변환 퀴즈 결과</h1>
        <p className="result-summary">
          {correctCount} / {total} 정답 ({rate}%)
        </p>
        <ul className="result-list">
          {derivationAnswers.map((a, i) => {
            const selectedChoice = a.question.choices.find((c) => c.id === a.selectedId)
            return (
              <li key={`${a.question.entry.id}-${i}`} className={a.isCorrect ? 'correct' : 'incorrect'}>
                <span className="vocab-result-word">
                  {a.question.entry.word}
                  <span className="vocab-result-reading">{a.question.entry.derivationPos}</span>
                </span>
                <span className="result-detail">
                  <span className="result-detail-main">
                    정답: {a.question.entry.word} ({a.question.entry.derivationPos})
                    {!a.isCorrect && selectedChoice && (
                      <>
                        {' '}
                        · 내 답: {selectedChoice.word} ({selectedChoice.derivationPos})
                      </>
                    )}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          ref={derivationRestartButtonRef}
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

      {savedDerivationQuiz && (
        <>
          <p className="page-placeholder">
            진행 중이던 품사 변환 퀴즈가 있어요 ({LEVEL_LABELS[savedDerivationQuiz.level]} · {savedDerivationQuiz.index}/
            {savedDerivationQuiz.questions.length}문제)
          </p>
          <button type="button" className="study-start-button" onClick={() => resumeDerivationQuiz(savedDerivationQuiz)}>
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
        <span className="quiz-option-label">퀴즈 종류</span>
        <div className="study-level-picker">
          {(['meaning', 'derivation'] as const).map((t) => (
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
            const activePool = quizType === 'meaning' ? pool : derivationPool
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

      {quizType === 'derivation' && derivationPool.length === 0 ? (
        <p className="page-placeholder">이 급수는 아직 파생어 세트가 있는 단어가 없습니다.</p>
      ) : quizType === 'meaning' ? (
        <button type="button" className="vocab-quiz-button" onClick={startQuiz} disabled={pool.length === 0}>
          단어 퀴즈 풀기 ({quizCount === 'all' ? pool.length : Math.min(quizCount, pool.length)}문제)
        </button>
      ) : (
        <button
          type="button"
          className="vocab-quiz-button"
          onClick={startDerivationQuiz}
          disabled={derivationPool.length === 0}
        >
          품사 변환 퀴즈 풀기 ({quizCount === 'all' ? derivationPool.length : Math.min(quizCount, derivationPool.length)}문제)
        </button>
      )}
    </div>
  )
}
