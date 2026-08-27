import { useEffect, useMemo, useRef, useState } from 'react'
import { vocabList, type VocabWord } from '../data/vocab'
import type { KanjiLevel } from '../data/kanji'
import { usedKanji } from '../lib/kanjiUsage'
import { acceptableReadings, isCorrectAnswer } from '../lib/answerMatching'
import { isComposingEnter, swallowNextEnterKeyup } from '../lib/imeGuard'
import QuizVerdict from '../components/QuizVerdict'
import { TYPE_LABELS } from '../lib/conjugation'
import {
  generateVocabQuestions,
  generateVocabQuestionsFromIds,
  generateVocabBlankQuestions,
  generateVocabReadingQuestions,
  generateVocabWritingQuestions,
  generateVocabTransitivityQuestions,
  generateVocabSynonymQuestions,
  generateVocabUsageQuestions,
  vocabLevelPool,
  vocabBlankLevelPool,
  vocabReadingLevelPool,
  vocabWritingLevelPool,
  vocabTransitivityLevelPool,
  vocabSynonymLevelPool,
  vocabUsageLevelPool,
  type VocabQuizQuestion,
  type VocabBlankQuestion,
  type VocabWritingQuestion,
  type VocabTransitivityQuestion,
  type VocabSynonymQuestion,
  type VocabUsageQuestion,
} from '../lib/vocabQuizGenerator'
import {
  addVocabQuizHistoryEntry,
  addVocabWrongNotes,
  clearVocabInProgressQuiz,
  clearVocabBlankInProgressQuiz,
  clearVocabReadingInProgressQuiz,
  clearVocabWritingInProgressQuiz,
  clearVocabTransitivityInProgressQuiz,
  clearVocabSynonymInProgressQuiz,
  clearVocabUsageInProgressQuiz,
  getVocabInProgressQuiz,
  getVocabBlankInProgressQuiz,
  getVocabReadingInProgressQuiz,
  getVocabWritingInProgressQuiz,
  getVocabTransitivityInProgressQuiz,
  getVocabSynonymInProgressQuiz,
  getVocabUsageInProgressQuiz,
  getSetupPrefs,
  getStudyBatchSize,
  getVocabStudyProgress,
  recordSrsReview,
  recordSrsSelfCheck,
  removeVocabWrongNote,
  saveVocabInProgressQuiz,
  saveVocabBlankInProgressQuiz,
  saveVocabReadingInProgressQuiz,
  saveVocabWritingInProgressQuiz,
  saveVocabTransitivityInProgressQuiz,
  saveVocabSynonymInProgressQuiz,
  saveVocabUsageInProgressQuiz,
  setSetupPrefs,
  setStudyBatchSize,
  setVocabStudyProgress,
  type VocabInProgressQuiz,
  type VocabBlankInProgressQuiz,
  type VocabReadingInProgressQuiz,
  type VocabWritingInProgressQuiz,
  type VocabTransitivityInProgressQuiz,
  type VocabSynonymInProgressQuiz,
  type VocabUsageInProgressQuiz,
} from '../lib/storage'
import '../components/QuizRunner.css'
import '../components/ResultScreen.css'
import './StudyPage.css'
import './VocabPage.css'

const ALL_LEVELS: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
const QUIZ_QUESTION_COUNT = 20
const QUIZ_COUNT_OPTIONS = [10, 20, 30, 50, 'all'] as const
// 한 세션에 학습할 카드 수 — 한자/문법 화면과 같은 선택지
// 0 = 전체(남은 전부를 한 세션으로) — 진도가 기록되므로 중간에 나가도 이어서 볼 수 있다
const STUDY_BATCH_OPTIONS = [5, 10, 20, 30, 0] as const
const FEEDBACK_DELAY_MS = 550

type Phase =
  | 'setup'
  | 'studying'
  | 'done'
  | 'browse'
  | 'quiz'
  | 'quizResult'
  | 'blankQuiz'
  | 'blankQuizResult'
  | 'readingQuiz'
  | 'readingQuizResult'
  | 'writingQuiz'
  | 'writingQuizResult'
  | 'transitivityQuiz'
  | 'transitivityQuizResult'
  | 'synonymQuiz'
  | 'synonymQuizResult'
  | 'usageQuiz'
  | 'usageQuizResult'
type QuizType = 'meaning' | 'blank' | 'reading' | 'writing' | 'transitivity' | 'synonym' | 'usage'
const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  meaning: '뜻 맞히기',
  blank: '문맥 빈칸 채우기',
  reading: '읽기 입력',
  writing: '표기 고르기',
  transitivity: '자타동사 구분',
  synonym: '유의어',
  usage: '용법',
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

interface ReadingAnswer {
  entry: VocabWord
  userAnswer: string
  isCorrect: boolean
}

interface WritingAnswer {
  question: VocabWritingQuestion
  selectedId: string
  isCorrect: boolean
}

interface TransitivityAnswer {
  question: VocabTransitivityQuestion
  selectedId: string
  isCorrect: boolean
}

interface SynonymAnswer {
  question: VocabSynonymQuestion
  selectedId: string
  isCorrect: boolean
}

interface UsageAnswer {
  question: VocabUsageQuestion
  selectedId: string
  isCorrect: boolean
}

interface Props {
  retryIds?: string[] | null
  onRetryIdsConsumed?: () => void
}

// shown at the moment of a wrong answer across all vocab quiz types — the full
// word card (단어·뜻·예문) so the miss becomes a learning point (elaborative
// feedback) instead of just a red X. Uses only existing VocabWord fields.
// .quiz-explanation styles come from the shared QuizRunner.css (already imported).
function VocabHint({ entry }: { entry: VocabWord }) {
  return (
    <div className="quiz-explanation">
      <div className="quiz-explanation-row">
        <span className="quiz-explanation-label">단어</span>
        <span>{entry.word} · {entry.reading}</span>
      </div>
      <div className="quiz-explanation-row">
        <span className="quiz-explanation-label">뜻</span>
        <span>{entry.meaningKr}</span>
      </div>
      {entry.exampleJp && (
        <div className="quiz-explanation-row">
          <span className="quiz-explanation-label">예</span>
          <span>{entry.exampleJp}{entry.exampleKr ? ` · ${entry.exampleKr}` : ''}</span>
        </div>
      )}
    </div>
  )
}

// setup 화면에서 마지막으로 고른 값 — 다음 진입 시 되살린다(GrammarPage와 동일 패턴).
// 이 화면은 퀴즈 종류만 7종이라 매번 고르는 부담이 특히 크다.
interface VocabSetupPrefs {
  level: KanjiLevel
  quizType: QuizType
  quizCount: (typeof QUIZ_COUNT_OPTIONS)[number]
  quizOrder: 'random' | 'sequential'
}

const QUIZ_TYPES = ['meaning', 'blank', 'reading', 'writing', 'transitivity', 'synonym', 'usage'] as const

function loadVocabPrefs(): Partial<VocabSetupPrefs> {
  const saved = getSetupPrefs<VocabSetupPrefs>('vocab')
  if (!saved) return {}
  return {
    level: ALL_LEVELS.includes(saved.level as KanjiLevel) ? saved.level : undefined,
    quizType: QUIZ_TYPES.includes(saved.quizType as QuizType) ? saved.quizType : undefined,
    quizCount: QUIZ_COUNT_OPTIONS.includes(saved.quizCount as (typeof QUIZ_COUNT_OPTIONS)[number])
      ? saved.quizCount
      : undefined,
    quizOrder: saved.quizOrder === 'random' || saved.quizOrder === 'sequential' ? saved.quizOrder : undefined,
  }
}

export default function VocabPage({ retryIds, onRetryIdsConsumed }: Props) {
  const prefs = useMemo(loadVocabPrefs, [])
  const [level, setLevel] = useState<KanjiLevel>(prefs.level ?? ALL_LEVELS[0])
  const pool = useMemo(() => vocabLevelPool(level), [level])
  const blankPool = useMemo(() => vocabBlankLevelPool(level), [level])
  const readingPool = useMemo(() => vocabReadingLevelPool(level), [level])
  const writingPool = useMemo(() => vocabWritingLevelPool(level), [level])
  const transitivityPool = useMemo(() => vocabTransitivityLevelPool(level), [level])
  const synonymPool = useMemo(() => vocabSynonymLevelPool(level), [level])
  const usagePool = useMemo(() => vocabUsageLevelPool(level), [level])
  const completedCount = Math.min(getVocabStudyProgress(level), pool.length)
  const remaining = pool.length - completedCount

  const [phase, setPhase] = useState<Phase>('setup')
  const [batch, setBatch] = useState<VocabWord[]>([])
  const [cardIndex, setCardIndex] = useState(0)
  // 방금 학습 카드로 넘긴 항목들 — done 화면에서 바로 퀴즈로 확인시키기 위해 보관
  // (GrammarPage와 동일한 이유·동일한 패턴)
  const [studiedBatch, setStudiedBatch] = useState<VocabWord[]>([])
  const donePrimaryButtonRef = useRef<HTMLButtonElement>(null)

  const levelWords = useMemo(() => vocabList.filter((w) => w.level === level), [level])
  const [browseIndex, setBrowseIndex] = useState<number | null>(null)
  const [browseQuery, setBrowseQuery] = useState('')

  const [quizCount, setQuizCount] = useState<(typeof QUIZ_COUNT_OPTIONS)[number]>(
    prefs.quizCount ?? QUIZ_QUESTION_COUNT,
  )
  const [quizOrder, setQuizOrder] = useState<'random' | 'sequential'>(prefs.quizOrder ?? 'random')
  // 퀴즈 세부 설정은 기본으로 접어 둔다 — 값은 마지막 선택이 복원되므로 대부분
  // 펼칠 일 없이 바로 풀기 버튼만 누르면 된다
  const [quizSettingsOpen, setQuizSettingsOpen] = useState(false)
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
  // saved quiz session from a previous visit that was never finished — shown
  // on the setup screen as an 이어하기 option instead of silently losing it
  const [savedQuiz, setSavedQuiz] = useState(() => getVocabInProgressQuiz())

  // 문맥 빈칸 채우기 퀴즈 — 뜻 맞히기 퀴즈와 질문/정답 shape이 달라 상태를 따로 둠
  // (GrammarPage의 뜻맞히기/빈칸채우기 퀴즈와 같은 병렬 구조)
  const [quizType, setQuizType] = useState<QuizType>(prefs.quizType ?? 'meaning')
  // 한 번에 학습할 카드 수 — 급수 전체를 한 세션에 열지 않기 위한 단위
  const [batchSize, setBatchSize] = useState(() => getStudyBatchSize('vocab'))
  // batchSize 0 = "전체" — 남은 전부를 한 세션으로 연다
  const takeCount = (poolLength: number) => (batchSize === 0 ? poolLength : batchSize)
  const [blankQuestions, setBlankQuestions] = useState<VocabBlankQuestion[]>([])
  const [blankIndex, setBlankIndex] = useState(0)
  const [blankAnswers, setBlankAnswers] = useState<BlankAnswer[]>([])
  const [blankFeedback, setBlankFeedback] = useState<{ isCorrect: boolean; selectedId: string } | null>(null)
  const blankChoicesRef = useRef<HTMLDivElement>(null)
  const blankRestartButtonRef = useRef<HTMLButtonElement>(null)
  const blankStartRef = useRef(0)
  const lastAdvancedBlankIndexRef = useRef(-1)
  const [savedBlankQuiz, setSavedBlankQuiz] = useState(() => getVocabBlankInProgressQuiz())

  // 읽기 입력 퀴즈 — 4지선다가 아니라 텍스트 입력(산출 훈련), 한자 QuizRunner의
  // promptToAnswer(훈음 입력) 모드와 동일한 구조를 이 페이지 안에 미러링
  const [readingQuestions, setReadingQuestions] = useState<VocabWord[]>([])
  const [readingIndex, setReadingIndex] = useState(0)
  const [readingInputValue, setReadingInputValue] = useState('')
  const [readingAnswers, setReadingAnswers] = useState<ReadingAnswer[]>([])
  const [readingFeedback, setReadingFeedback] = useState<{ isCorrect: boolean; userAnswer: string } | null>(null)
  const readingInputRef = useRef<HTMLInputElement>(null)
  const readingNextButtonRef = useRef<HTMLButtonElement>(null)
  const readingRestartButtonRef = useRef<HTMLButtonElement>(null)
  const readingStartRef = useRef(0)
  const lastAdvancedReadingIndexRef = useRef(-1)
  const lastSubmittedReadingIndexRef = useRef(-1)
  const [savedReadingQuiz, setSavedReadingQuiz] = useState(() => getVocabReadingInProgressQuiz())

  // 표기 퀴즈(히라가나 → 한자) — 나머지 세 퀴즈와 나란한 병렬 구조
  const [writingQuestions, setWritingQuestions] = useState<VocabWritingQuestion[]>([])
  const [writingIndex, setWritingIndex] = useState(0)
  const [writingAnswers, setWritingAnswers] = useState<WritingAnswer[]>([])
  const [writingFeedback, setWritingFeedback] = useState<{ isCorrect: boolean; selectedId: string } | null>(null)
  const writingChoicesRef = useRef<HTMLDivElement>(null)
  const writingRestartButtonRef = useRef<HTMLButtonElement>(null)
  const writingStartRef = useRef(0)
  const lastAdvancedWritingIndexRef = useRef(-1)
  const [savedWritingQuiz, setSavedWritingQuiz] = useState(() => getVocabWritingInProgressQuiz())

  // 자타동사 구분 퀴즈 — 나머지 네 퀴즈와 나란한 병렬 구조
  const [transitivityQuestions, setTransitivityQuestions] = useState<VocabTransitivityQuestion[]>([])
  const [transitivityIndex, setTransitivityIndex] = useState(0)
  const [transitivityAnswers, setTransitivityAnswers] = useState<TransitivityAnswer[]>([])
  const [transitivityFeedback, setTransitivityFeedback] = useState<{ isCorrect: boolean; selectedId: string } | null>(
    null,
  )
  const transitivityChoicesRef = useRef<HTMLDivElement>(null)
  const transitivityRestartButtonRef = useRef<HTMLButtonElement>(null)
  const transitivityStartRef = useRef(0)
  const lastAdvancedTransitivityIndexRef = useRef(-1)
  const [savedTransitivityQuiz, setSavedTransitivityQuiz] = useState(() => getVocabTransitivityInProgressQuiz())

  // 유의어 퀴즈 — 나머지 다섯 퀴즈와 나란한 병렬 구조. 다른 유형과 달리 정답이
  // entry(프롬프트)가 아니라 answer(유의어)라는 점만 다름
  const [synonymQuestions, setSynonymQuestions] = useState<VocabSynonymQuestion[]>([])
  const [synonymIndex, setSynonymIndex] = useState(0)
  const [synonymAnswers, setSynonymAnswers] = useState<SynonymAnswer[]>([])
  const [synonymFeedback, setSynonymFeedback] = useState<{ isCorrect: boolean; selectedId: string } | null>(null)
  const synonymChoicesRef = useRef<HTMLDivElement>(null)
  const synonymRestartButtonRef = useRef<HTMLButtonElement>(null)
  const synonymStartRef = useRef(0)
  const lastAdvancedSynonymIndexRef = useRef(-1)
  const [savedSynonymQuiz, setSavedSynonymQuiz] = useState(() => getVocabSynonymInProgressQuiz())

  // 용법(用法) 퀴즈 — 제시 단어가 자연스럽게 들어갈 예문(빈칸)을 고른다. 선택지가
  // 단어가 아니라 빈칸 문장이라는 점만 다르고 나머지 배선은 유의어와 동일
  const [usageQuestions, setUsageQuestions] = useState<VocabUsageQuestion[]>([])
  const [usageIndex, setUsageIndex] = useState(0)
  const [usageAnswers, setUsageAnswers] = useState<UsageAnswer[]>([])
  const [usageFeedback, setUsageFeedback] = useState<{ isCorrect: boolean; selectedId: string } | null>(null)
  const usageChoicesRef = useRef<HTMLDivElement>(null)
  const usageRestartButtonRef = useRef<HTMLButtonElement>(null)
  const usageStartRef = useRef(0)
  const lastAdvancedUsageIndexRef = useRef(-1)
  const [savedUsageQuiz, setSavedUsageQuiz] = useState(() => getVocabUsageInProgressQuiz())

  useEffect(() => {
    if (phase === 'done') donePrimaryButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'quizResult') restartButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'blankQuizResult') blankRestartButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'readingQuizResult') readingRestartButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'writingQuizResult') writingRestartButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'transitivityQuizResult') transitivityRestartButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'synonymQuizResult') synonymRestartButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'usageQuizResult') usageRestartButtonRef.current?.focus({ preventScroll: true })
  }, [phase])

  // setup 선택이 바뀔 때마다 저장 (GrammarPage와 동일 패턴)
  useEffect(() => {
    setSetupPrefs<VocabSetupPrefs>('vocab', { level, quizType, quizCount, quizOrder })
  }, [level, quizType, quizCount, quizOrder])

  // 급수 전체가 아니라 batchSize개씩 끊어서 학습한다 — 예전에는 남은 전체를 한
  // 세션으로 열어(N5 단어 718개) "오늘 여기까지"라는 단위가 없었다
  function startBatch(fromLevel: KanjiLevel, fromCompleted: number) {
    const fromPool = vocabLevelPool(fromLevel)
    setBatch(fromPool.slice(fromCompleted, fromCompleted + takeCount(fromPool.length)))
    setCardIndex(0)
    setPhase('studying')
  }

  function finishBatch() {
    setVocabStudyProgress(level, Math.min(completedCount + batch.length, pool.length))
    setStudiedBatch(batch)
    setPhase('done')
  }

  // 자가평가(알겠음/모르겠음) — StudyPage(한자)와 동일한 패턴, recordSrsSelfCheck는
  // 퀴즈 채점보다 신뢰도를 낮게 봐서 박스를 최대 1까지만 올린다
  function selfCheck(vocabId: string, knows: boolean) {
    recordSrsSelfCheck('vocab', vocabId, knows)
    if (cardIndex + 1 < batch.length) {
      setCardIndex((i) => i + 1)
    } else {
      finishBatch()
    }
  }

  function restartBatch(fromLevel: KanjiLevel) {
    const fromPool = vocabLevelPool(fromLevel)
    setBatch(fromPool.slice(0, takeCount(fromPool.length)))
    setCardIndex(0)
    setPhase('studying')
  }

  // saves progress up to (not including) the card being left, so 이어하기
  // re-shows that same card rather than skipping it
  // 중간에 나가도 지금까지 본 카드만 대상으로 done 화면을 거친다 — 배치가 "남은
  // 전체"(N5 단어면 718개)라 끝까지 넘기는 일이 없어서, 이렇게 하지 않으면
  // "방금 배운 것 확인하기"를 볼 기회가 사실상 없다 (GrammarPage와 동일)
  function exitBatch() {
    setVocabStudyProgress(level, completedCount + cardIndex)
    if (cardIndex > 0) {
      setStudiedBatch(batch.slice(0, cardIndex))
      setPhase('done')
    } else {
      setPhase('setup')
    }
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

  function startReadingQuiz() {
    clearVocabReadingInProgressQuiz()
    setSavedReadingQuiz(null)
    const count = quizCount === 'all' ? readingPool.length : quizCount
    setReadingQuestions(generateVocabReadingQuestions(level, count, quizOrder))
    setReadingIndex(0)
    setReadingInputValue('')
    setReadingAnswers([])
    setReadingFeedback(null)
    lastAdvancedReadingIndexRef.current = -1
    lastSubmittedReadingIndexRef.current = -1
    readingStartRef.current = Date.now()
    setPhase('readingQuiz')
  }

  function resumeReadingQuiz(saved: VocabReadingInProgressQuiz) {
    setReadingQuestions(saved.questions)
    setReadingIndex(saved.index)
    setReadingInputValue('')
    setReadingAnswers(saved.answers)
    setReadingFeedback(null)
    lastAdvancedReadingIndexRef.current = -1
    lastSubmittedReadingIndexRef.current = -1
    readingStartRef.current = new Date(saved.startedAt).getTime()
    setPhase('readingQuiz')
  }

  function startWritingQuiz() {
    clearVocabWritingInProgressQuiz()
    setSavedWritingQuiz(null)
    const count = quizCount === 'all' ? writingPool.length : quizCount
    setWritingQuestions(generateVocabWritingQuestions(level, count, quizOrder))
    setWritingIndex(0)
    setWritingAnswers([])
    setWritingFeedback(null)
    lastAdvancedWritingIndexRef.current = -1
    writingStartRef.current = Date.now()
    setPhase('writingQuiz')
  }

  function resumeWritingQuiz(saved: VocabWritingInProgressQuiz) {
    setWritingQuestions(saved.questions)
    setWritingIndex(saved.index)
    setWritingAnswers(saved.answers)
    setWritingFeedback(null)
    lastAdvancedWritingIndexRef.current = -1
    writingStartRef.current = new Date(saved.startedAt).getTime()
    setPhase('writingQuiz')
  }

  function startTransitivityQuiz() {
    clearVocabTransitivityInProgressQuiz()
    setSavedTransitivityQuiz(null)
    const count = quizCount === 'all' ? transitivityPool.length : quizCount
    setTransitivityQuestions(generateVocabTransitivityQuestions(level, count, quizOrder))
    setTransitivityIndex(0)
    setTransitivityAnswers([])
    setTransitivityFeedback(null)
    lastAdvancedTransitivityIndexRef.current = -1
    transitivityStartRef.current = Date.now()
    setPhase('transitivityQuiz')
  }

  function resumeTransitivityQuiz(saved: VocabTransitivityInProgressQuiz) {
    setTransitivityQuestions(saved.questions)
    setTransitivityIndex(saved.index)
    setTransitivityAnswers(saved.answers)
    setTransitivityFeedback(null)
    lastAdvancedTransitivityIndexRef.current = -1
    transitivityStartRef.current = new Date(saved.startedAt).getTime()
    setPhase('transitivityQuiz')
  }

  function startSynonymQuiz() {
    clearVocabSynonymInProgressQuiz()
    setSavedSynonymQuiz(null)
    const count = quizCount === 'all' ? synonymPool.length : quizCount
    setSynonymQuestions(generateVocabSynonymQuestions(level, count, quizOrder))
    setSynonymIndex(0)
    setSynonymAnswers([])
    setSynonymFeedback(null)
    lastAdvancedSynonymIndexRef.current = -1
    synonymStartRef.current = Date.now()
    setPhase('synonymQuiz')
  }

  function resumeSynonymQuiz(saved: VocabSynonymInProgressQuiz) {
    setSynonymQuestions(saved.questions)
    setSynonymIndex(saved.index)
    setSynonymAnswers(saved.answers)
    setSynonymFeedback(null)
    lastAdvancedSynonymIndexRef.current = -1
    synonymStartRef.current = new Date(saved.startedAt).getTime()
    setPhase('synonymQuiz')
  }

  function startUsageQuiz() {
    clearVocabUsageInProgressQuiz()
    setSavedUsageQuiz(null)
    const count = quizCount === 'all' ? usagePool.length : quizCount
    setUsageQuestions(generateVocabUsageQuestions(level, count, quizOrder))
    setUsageIndex(0)
    setUsageAnswers([])
    setUsageFeedback(null)
    lastAdvancedUsageIndexRef.current = -1
    usageStartRef.current = Date.now()
    setPhase('usageQuiz')
  }

  function resumeUsageQuiz(saved: VocabUsageInProgressQuiz) {
    setUsageQuestions(saved.questions)
    setUsageIndex(saved.index)
    setUsageAnswers(saved.answers)
    setUsageFeedback(null)
    lastAdvancedUsageIndexRef.current = -1
    usageStartRef.current = new Date(saved.startedAt).getTime()
    setPhase('usageQuiz')
  }

  // 특정 id 집합만 출제 — 오답 재도전(retryIds)과 학습 직후 "방금 배운 것 확인"이
  // 공유한다. 뜻 맞히기는 모든 단어가 출제 가능하므로 이 유형으로 고정한다
  // (읽기/표기/자타동사 등은 조건을 만족하는 단어만 남아 문항 수가 들쭉날쭉해짐).
  function startQuizFromIds(ids: string[]) {
    clearVocabInProgressQuiz()
    setSavedQuiz(null)
    setQuizQuestions(generateVocabQuestionsFromIds(ids))
    setQuizIndex(0)
    setQuizAnswers([])
    setQuizFeedback(null)
    lastAdvancedQuizIndexRef.current = -1
    quizStartRef.current = Date.now()
    setPhase('quiz')
  }

  useEffect(() => {
    if (!retryIds || retryIds.length === 0) return
    startQuizFromIds(retryIds)
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
    if (phase !== 'readingQuizResult') return
    clearVocabReadingInProgressQuiz()
    setSavedReadingQuiz(null)
    const wrongIds = readingAnswers.filter((a) => !a.isCorrect).map((a) => a.entry.id)
    addVocabWrongNotes(wrongIds, `단어 읽기 입력 퀴즈 · ${level}`)
    addVocabQuizHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      total: readingAnswers.length,
      correct: readingAnswers.filter((a) => a.isCorrect).length,
      elapsedMs: Date.now() - readingStartRef.current,
      finishedAt: new Date().toISOString(),
    })
    readingAnswers.filter((a) => a.isCorrect).forEach((a) => removeVocabWrongNote(a.entry.id))
    readingAnswers.forEach((a) => recordSrsReview('vocab', a.entry.id, a.isCorrect))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (phase !== 'writingQuizResult') return
    clearVocabWritingInProgressQuiz()
    setSavedWritingQuiz(null)
    const wrongIds = writingAnswers.filter((a) => !a.isCorrect).map((a) => a.question.entry.id)
    addVocabWrongNotes(wrongIds, `단어 표기 퀴즈 · ${level}`)
    addVocabQuizHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      total: writingAnswers.length,
      correct: writingAnswers.filter((a) => a.isCorrect).length,
      elapsedMs: Date.now() - writingStartRef.current,
      finishedAt: new Date().toISOString(),
    })
    writingAnswers.filter((a) => a.isCorrect).forEach((a) => removeVocabWrongNote(a.question.entry.id))
    writingAnswers.forEach((a) => recordSrsReview('vocab', a.question.entry.id, a.isCorrect))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (phase !== 'transitivityQuizResult') return
    clearVocabTransitivityInProgressQuiz()
    setSavedTransitivityQuiz(null)
    const wrongIds = transitivityAnswers.filter((a) => !a.isCorrect).map((a) => a.question.entry.id)
    addVocabWrongNotes(wrongIds, `단어 자타동사 구분 퀴즈 · ${level}`)
    addVocabQuizHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      total: transitivityAnswers.length,
      correct: transitivityAnswers.filter((a) => a.isCorrect).length,
      elapsedMs: Date.now() - transitivityStartRef.current,
      finishedAt: new Date().toISOString(),
    })
    transitivityAnswers.filter((a) => a.isCorrect).forEach((a) => removeVocabWrongNote(a.question.entry.id))
    transitivityAnswers.forEach((a) => recordSrsReview('vocab', a.question.entry.id, a.isCorrect))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (phase !== 'synonymQuizResult') return
    clearVocabSynonymInProgressQuiz()
    setSavedSynonymQuiz(null)
    // 오답노트/SRS 단위는 제시 단어(entry) — 다른 단어 퀴즈 유형과 공유(vocab 도메인)
    const wrongIds = synonymAnswers.filter((a) => !a.isCorrect).map((a) => a.question.entry.id)
    addVocabWrongNotes(wrongIds, `단어 유의어 퀴즈 · ${level}`)
    addVocabQuizHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      total: synonymAnswers.length,
      correct: synonymAnswers.filter((a) => a.isCorrect).length,
      elapsedMs: Date.now() - synonymStartRef.current,
      finishedAt: new Date().toISOString(),
    })
    synonymAnswers.filter((a) => a.isCorrect).forEach((a) => removeVocabWrongNote(a.question.entry.id))
    synonymAnswers.forEach((a) => recordSrsReview('vocab', a.question.entry.id, a.isCorrect))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (phase !== 'usageQuizResult') return
    clearVocabUsageInProgressQuiz()
    setSavedUsageQuiz(null)
    // 오답노트/SRS 단위는 제시 단어(entry) — 다른 단어 퀴즈 유형과 공유(vocab 도메인)
    const wrongIds = usageAnswers.filter((a) => !a.isCorrect).map((a) => a.question.entry.id)
    addVocabWrongNotes(wrongIds, `단어 용법 퀴즈 · ${level}`)
    addVocabQuizHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      total: usageAnswers.length,
      correct: usageAnswers.filter((a) => a.isCorrect).length,
      elapsedMs: Date.now() - usageStartRef.current,
      finishedAt: new Date().toISOString(),
    })
    usageAnswers.filter((a) => a.isCorrect).forEach((a) => removeVocabWrongNote(a.question.entry.id))
    usageAnswers.forEach((a) => recordSrsReview('vocab', a.question.entry.id, a.isCorrect))
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

  useEffect(() => {
    if (phase !== 'blankQuiz') return
    blankChoicesRef.current?.querySelector('button')?.focus()
  }, [phase, blankIndex])

  // 읽기 입력 퀴즈는 선택지 버튼이 아니라 텍스트 입력에 포커스(한자 QuizRunner의
  // promptToAnswer 모드와 동일한 이유로 자동 포커스 필요)
  useEffect(() => {
    if (phase !== 'readingQuiz') return
    readingInputRef.current?.focus()
  }, [phase, readingIndex])

  // 오답이 뜨면 <input disabled>로 바뀌며 브라우저가 강제로 blur시켜 포커스가
  // 완전히 유실된다(disabled 요소는 focus 불가) — 오답 확정 순간 "다음"
  // 버튼으로 포커스를 옮겨 Enter 흐름이 끊기지 않게 한다 (QuizRunner.tsx와 동일 이유)
  useEffect(() => {
    if (readingFeedback && !readingFeedback.isCorrect) {
      readingNextButtonRef.current?.focus()
    }
  }, [readingFeedback])

  useEffect(() => {
    if (phase !== 'writingQuiz') return
    writingChoicesRef.current?.querySelector('button')?.focus()
  }, [phase, writingIndex])

  useEffect(() => {
    if (phase !== 'transitivityQuiz') return
    transitivityChoicesRef.current?.querySelector('button')?.focus()
  }, [phase, transitivityIndex])

  useEffect(() => {
    if (phase !== 'synonymQuiz') return
    synonymChoicesRef.current?.querySelector('button')?.focus()
  }, [phase, synonymIndex])

  useEffect(() => {
    if (phase !== 'usageQuiz') return
    usageChoicesRef.current?.querySelector('button')?.focus()
  }, [phase, usageIndex])

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
    swallowNextEnterKeyup()
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
      if (isComposingEnter(e)) return
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
    swallowNextEnterKeyup()
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
      if (isComposingEnter(e)) return
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

  function goNextReading(nextIndex: number) {
    if (nextIndex < readingQuestions.length) {
      // input을 setIndex와 같은 배치로 동기 클리어 — 오답→다음 진행 중 Enter를
      // 연타하면 이전 문제 입력값이 다음 문제에 재제출되는 걸 방지
      // (QuizRunner.tsx의 goNext와 동일한 이유)
      setReadingInputValue('')
      setReadingFeedback(null)
      setReadingIndex(nextIndex)
    } else {
      setPhase('readingQuizResult')
    }
  }

  function handleNextReading() {
    if (lastAdvancedReadingIndexRef.current === readingIndex) return
    lastAdvancedReadingIndexRef.current = readingIndex
    swallowNextEnterKeyup()
    goNextReading(readingIndex + 1)
  }

  function submitReadingAnswer(rawAnswer: string) {
    if (lastSubmittedReadingIndexRef.current === readingIndex) return
    lastSubmittedReadingIndexRef.current = readingIndex
    const entry = readingQuestions[readingIndex]
    const isCorrect = isCorrectAnswer(rawAnswer, acceptableReadings(entry.reading))
    setReadingFeedback({ isCorrect, userAnswer: rawAnswer })
    const updatedAnswers = [...readingAnswers, { entry, userAnswer: rawAnswer, isCorrect }]
    setReadingAnswers(updatedAnswers)

    const nextIndex = readingIndex + 1
    if (nextIndex < readingQuestions.length) {
      saveVocabReadingInProgressQuiz({
        level,
        questions: readingQuestions,
        index: nextIndex,
        answers: updatedAnswers,
        startedAt: new Date(readingStartRef.current).toISOString(),
      })
    }

    if (isCorrect) {
      setTimeout(() => goNextReading(nextIndex), FEEDBACK_DELAY_MS)
    }
  }

  useEffect(() => {
    if (phase !== 'readingQuiz') return
    function handleKeyDown(e: KeyboardEvent) {
      if (isComposingEnter(e)) return
      if (readingFeedback) {
        if (!readingFeedback.isCorrect && e.key === 'Enter' && !e.repeat) handleNextReading()
        return
      }
      if (e.key === 'Enter' && !e.repeat && readingInputValue.trim() !== '') {
        submitReadingAnswer(readingInputValue)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, readingIndex, readingFeedback, readingInputValue])

  function goNextWriting(nextIndex: number) {
    if (nextIndex < writingQuestions.length) {
      setWritingFeedback(null)
      setWritingIndex(nextIndex)
    } else {
      setPhase('writingQuizResult')
    }
  }

  function handleNextWriting() {
    if (lastAdvancedWritingIndexRef.current === writingIndex) return
    lastAdvancedWritingIndexRef.current = writingIndex
    swallowNextEnterKeyup()
    goNextWriting(writingIndex + 1)
  }

  function submitWritingAnswer(selectedId: string) {
    if (writingFeedback) return
    const question = writingQuestions[writingIndex]
    const isCorrect = selectedId === question.entry.id
    setWritingFeedback({ isCorrect, selectedId })
    const updatedAnswers = [...writingAnswers, { question, selectedId, isCorrect }]
    setWritingAnswers(updatedAnswers)

    const nextIndex = writingIndex + 1
    if (nextIndex < writingQuestions.length) {
      saveVocabWritingInProgressQuiz({
        level,
        questions: writingQuestions,
        index: nextIndex,
        answers: updatedAnswers,
        startedAt: new Date(writingStartRef.current).toISOString(),
      })
    }

    if (isCorrect) {
      setTimeout(() => goNextWriting(nextIndex), FEEDBACK_DELAY_MS)
    }
  }

  useEffect(() => {
    if (phase !== 'writingQuiz') return
    function handleKeyDown(e: KeyboardEvent) {
      if (isComposingEnter(e)) return
      if (writingFeedback) {
        if (!writingFeedback.isCorrect && e.key === 'Enter' && !e.repeat) handleNextWriting()
        return
      }
      const choiceIndex = Number(e.key) - 1
      const choice = writingQuestions[writingIndex]?.choices[choiceIndex]
      if (choice) submitWritingAnswer(choice.id)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, writingIndex, writingFeedback])

  function goNextTransitivity(nextIndex: number) {
    if (nextIndex < transitivityQuestions.length) {
      setTransitivityFeedback(null)
      setTransitivityIndex(nextIndex)
    } else {
      setPhase('transitivityQuizResult')
    }
  }

  function handleNextTransitivity() {
    if (lastAdvancedTransitivityIndexRef.current === transitivityIndex) return
    lastAdvancedTransitivityIndexRef.current = transitivityIndex
    swallowNextEnterKeyup()
    goNextTransitivity(transitivityIndex + 1)
  }

  function submitTransitivityAnswer(selectedId: string) {
    if (transitivityFeedback) return
    const question = transitivityQuestions[transitivityIndex]
    const isCorrect = selectedId === question.entry.id
    setTransitivityFeedback({ isCorrect, selectedId })
    const updatedAnswers = [...transitivityAnswers, { question, selectedId, isCorrect }]
    setTransitivityAnswers(updatedAnswers)

    const nextIndex = transitivityIndex + 1
    if (nextIndex < transitivityQuestions.length) {
      saveVocabTransitivityInProgressQuiz({
        level,
        questions: transitivityQuestions,
        index: nextIndex,
        answers: updatedAnswers,
        startedAt: new Date(transitivityStartRef.current).toISOString(),
      })
    }

    if (isCorrect) {
      setTimeout(() => goNextTransitivity(nextIndex), FEEDBACK_DELAY_MS)
    }
  }

  useEffect(() => {
    if (phase !== 'transitivityQuiz') return
    function handleKeyDown(e: KeyboardEvent) {
      if (isComposingEnter(e)) return
      if (transitivityFeedback) {
        if (!transitivityFeedback.isCorrect && e.key === 'Enter' && !e.repeat) handleNextTransitivity()
        return
      }
      const choiceIndex = Number(e.key) - 1
      const choice = transitivityQuestions[transitivityIndex]?.choices[choiceIndex]
      if (choice) submitTransitivityAnswer(choice.id)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, transitivityIndex, transitivityFeedback])

  function goNextSynonym(nextIndex: number) {
    if (nextIndex < synonymQuestions.length) {
      setSynonymFeedback(null)
      setSynonymIndex(nextIndex)
    } else {
      setPhase('synonymQuizResult')
    }
  }

  function handleNextSynonym() {
    if (lastAdvancedSynonymIndexRef.current === synonymIndex) return
    lastAdvancedSynonymIndexRef.current = synonymIndex
    swallowNextEnterKeyup()
    goNextSynonym(synonymIndex + 1)
  }

  function submitSynonymAnswer(selectedId: string) {
    if (synonymFeedback) return
    const question = synonymQuestions[synonymIndex]
    // 정답은 유의어(answer) — entry는 프롬프트라 선택지에 없음
    const isCorrect = selectedId === question.answer.id
    setSynonymFeedback({ isCorrect, selectedId })
    const updatedAnswers = [...synonymAnswers, { question, selectedId, isCorrect }]
    setSynonymAnswers(updatedAnswers)

    const nextIndex = synonymIndex + 1
    if (nextIndex < synonymQuestions.length) {
      saveVocabSynonymInProgressQuiz({
        level,
        questions: synonymQuestions,
        index: nextIndex,
        answers: updatedAnswers,
        startedAt: new Date(synonymStartRef.current).toISOString(),
      })
    }

    if (isCorrect) {
      setTimeout(() => goNextSynonym(nextIndex), FEEDBACK_DELAY_MS)
    }
  }

  useEffect(() => {
    if (phase !== 'synonymQuiz') return
    function handleKeyDown(e: KeyboardEvent) {
      if (isComposingEnter(e)) return
      if (synonymFeedback) {
        if (!synonymFeedback.isCorrect && e.key === 'Enter' && !e.repeat) handleNextSynonym()
        return
      }
      const choiceIndex = Number(e.key) - 1
      const choice = synonymQuestions[synonymIndex]?.choices[choiceIndex]
      if (choice) submitSynonymAnswer(choice.id)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, synonymIndex, synonymFeedback])

  function goNextUsage(nextIndex: number) {
    if (nextIndex < usageQuestions.length) {
      setUsageFeedback(null)
      setUsageIndex(nextIndex)
    } else {
      setPhase('usageQuizResult')
    }
  }

  function handleNextUsage() {
    if (lastAdvancedUsageIndexRef.current === usageIndex) return
    lastAdvancedUsageIndexRef.current = usageIndex
    swallowNextEnterKeyup()
    goNextUsage(usageIndex + 1)
  }

  function submitUsageAnswer(selectedId: string) {
    if (usageFeedback) return
    const question = usageQuestions[usageIndex]
    // 정답은 제시 단어(entry)가 자기 예문에 들어간 선택지
    const isCorrect = selectedId === question.entry.id
    setUsageFeedback({ isCorrect, selectedId })
    const updatedAnswers = [...usageAnswers, { question, selectedId, isCorrect }]
    setUsageAnswers(updatedAnswers)

    const nextIndex = usageIndex + 1
    if (nextIndex < usageQuestions.length) {
      saveVocabUsageInProgressQuiz({
        level,
        questions: usageQuestions,
        index: nextIndex,
        answers: updatedAnswers,
        startedAt: new Date(usageStartRef.current).toISOString(),
      })
    }

    if (isCorrect) {
      setTimeout(() => goNextUsage(nextIndex), FEEDBACK_DELAY_MS)
    }
  }

  useEffect(() => {
    if (phase !== 'usageQuiz') return
    function handleKeyDown(e: KeyboardEvent) {
      if (isComposingEnter(e)) return
      if (usageFeedback) {
        if (!usageFeedback.isCorrect && e.key === 'Enter' && !e.repeat) handleNextUsage()
        return
      }
      const choiceIndex = Number(e.key) - 1
      const choice = usageQuestions[usageIndex]?.blankedChoices[choiceIndex]
      if (choice) submitUsageAnswer(choice.entry.id)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, usageIndex, usageFeedback])

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
              {word.conjugationType && <span className="study-radical-chip">{TYPE_LABELS[word.conjugationType]}</span>}
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
              {word.conjugationType && <span className="study-radical-chip">{TYPE_LABELS[word.conjugationType]}</span>}
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
          <button type="button" className="study-self-check-btn study-self-check-no" onClick={() => selfCheck(word.id, false)}>
            모르겠음
          </button>
          <button type="button" className="study-self-check-btn study-self-check-yes" onClick={() => selfCheck(word.id, true)}>
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
        <p className="page-placeholder">
          단어 {studiedBatch.length}개를 학습했습니다. 방금 배운 단어로 퀴즈를 풀어볼까요?
        </p>
        <div className="study-done-actions">
          {studiedBatch.length > 0 && (
            <button
              type="button"
              ref={donePrimaryButtonRef}
              className="study-nav-primary"
              onClick={() => startQuizFromIds(studiedBatch.map((w) => w.id))}
            >
              방금 배운 {studiedBatch.length}개 확인하기
            </button>
          )}
          <button
            type="button"
            ref={studiedBatch.length > 0 ? undefined : donePrimaryButtonRef}
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
        {quizFeedback && <QuizVerdict isCorrect={quizFeedback.isCorrect} />}
        {quizFeedback && !quizFeedback.isCorrect && <VocabHint entry={question.entry} />}
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
        {blankFeedback && <QuizVerdict isCorrect={blankFeedback.isCorrect} />}
        {blankFeedback && !blankFeedback.isCorrect && <VocabHint entry={question.entry} />}
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

  if (phase === 'readingQuiz') {
    const entry = readingQuestions[readingIndex]
    return (
      <div className="quiz-runner">
        <div className="quiz-topbar">
          <button
            type="button"
            className="quiz-exit-button"
            onClick={() => {
              setPhase('setup')
              setSavedReadingQuiz(getVocabReadingInProgressQuiz())
            }}
          >
            나가기
          </button>
          <div className="quiz-progress">
            {readingIndex + 1} / {readingQuestions.length}
          </div>
        </div>
        <div className="vocab-quiz-prompt">
          <span className="vocab-quiz-prompt-word">{entry.word}</span>
        </div>
        <input
          ref={readingInputRef}
          className="quiz-input"
          type="text"
          value={readingInputValue}
          disabled={readingFeedback !== null}
          placeholder="읽기를 히라가나로 입력하세요"
          onChange={(e) => setReadingInputValue(e.target.value)}
        />
        {readingFeedback && (
          <QuizVerdict isCorrect={readingFeedback.isCorrect} answerLabel={entry.reading} />
        )}
        {readingFeedback && !readingFeedback.isCorrect && <VocabHint entry={entry} />}
        {readingFeedback && !readingFeedback.isCorrect && (
          <button type="button" ref={readingNextButtonRef} className="quiz-next-button" onClick={handleNextReading}>
            다음
          </button>
        )}
        <p className="shortcut-hint">Enter로 제출 · 오답이면 Enter로 다음 문제</p>
      </div>
    )
  }

  if (phase === 'readingQuizResult') {
    const correctCount = readingAnswers.filter((a) => a.isCorrect).length
    const total = readingAnswers.length
    const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0

    return (
      <div className="result-screen">
        <h1>단어 읽기 입력 퀴즈 결과</h1>
        <p className="result-summary">
          {correctCount} / {total} 정답 ({rate}%)
        </p>
        <ul className="result-list">
          {readingAnswers.map((a, i) => (
            <li key={`${a.entry.id}-${i}`} className={a.isCorrect ? 'correct' : 'incorrect'}>
              <span className="vocab-result-word">{a.entry.word}</span>
              <span className="result-detail">
                <span className="result-detail-main">
                  정답: {a.entry.reading}
                  {!a.isCorrect && <> · 내 답: {a.userAnswer}</>}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          ref={readingRestartButtonRef}
          className="restart-button"
          onClick={() => setPhase('setup')}
        >
          다시 설정하기
        </button>
      </div>
    )
  }

  if (phase === 'writingQuiz') {
    const question = writingQuestions[writingIndex]
    return (
      <div className="quiz-runner">
        <div className="quiz-topbar">
          <button
            type="button"
            className="quiz-exit-button"
            onClick={() => {
              setPhase('setup')
              setSavedWritingQuiz(getVocabWritingInProgressQuiz())
            }}
          >
            나가기
          </button>
          <div className="quiz-progress">
            {writingIndex + 1} / {writingQuestions.length}
          </div>
        </div>
        <div className="vocab-quiz-prompt">
          <span className="vocab-quiz-prompt-reading">{question.entry.reading}</span>
        </div>
        <div className="vocab-quiz-choices" ref={writingChoicesRef}>
          {question.choices.map((choice, i) => {
            let className = 'vocab-quiz-choice'
            if (writingFeedback) {
              if (choice.id === writingFeedback.selectedId) {
                className += writingFeedback.isCorrect ? ' correct' : ' incorrect'
              } else if (!writingFeedback.isCorrect && choice.id === question.entry.id) {
                className += ' reveal-correct'
              }
            }
            return (
              <button
                key={choice.id}
                type="button"
                className={className}
                disabled={writingFeedback !== null}
                onClick={() => submitWritingAnswer(choice.id)}
              >
                <span className="quiz-choice-num">{i + 1}</span>
                {choice.word}
              </button>
            )
          })}
        </div>
        {writingFeedback && <QuizVerdict isCorrect={writingFeedback.isCorrect} />}
        {writingFeedback && !writingFeedback.isCorrect && <VocabHint entry={question.entry} />}
        {writingFeedback && !writingFeedback.isCorrect && (
          <button type="button" className="quiz-next-button" onClick={handleNextWriting}>
            다음
          </button>
        )}
        <p className="shortcut-hint">숫자키(1~4)로 선택 · 오답이면 Enter로 다음 문제</p>
      </div>
    )
  }

  if (phase === 'transitivityQuiz') {
    const question = transitivityQuestions[transitivityIndex]
    return (
      <div className="quiz-runner">
        <div className="quiz-topbar">
          <button
            type="button"
            className="quiz-exit-button"
            onClick={() => {
              setPhase('setup')
              setSavedTransitivityQuiz(getVocabTransitivityInProgressQuiz())
            }}
          >
            나가기
          </button>
          <div className="quiz-progress">
            {transitivityIndex + 1} / {transitivityQuestions.length}
          </div>
        </div>
        <div className="vocab-quiz-prompt">
          <span className="vocab-derivation-sentence">{question.blankedSentence}</span>
        </div>
        <div className="vocab-quiz-choices" ref={transitivityChoicesRef}>
          {question.choices.map((choice, i) => {
            let className = 'vocab-quiz-choice'
            if (transitivityFeedback) {
              if (choice.id === transitivityFeedback.selectedId) {
                className += transitivityFeedback.isCorrect ? ' correct' : ' incorrect'
              } else if (!transitivityFeedback.isCorrect && choice.id === question.entry.id) {
                className += ' reveal-correct'
              }
            }
            return (
              <button
                key={choice.id}
                type="button"
                className={className}
                disabled={transitivityFeedback !== null}
                onClick={() => submitTransitivityAnswer(choice.id)}
              >
                <span className="quiz-choice-num">{i + 1}</span>
                {choice.word}
                <span className="quiz-choice-pos">{choice.reading}</span>
              </button>
            )
          })}
        </div>
        {transitivityFeedback && <QuizVerdict isCorrect={transitivityFeedback.isCorrect} />}
        {transitivityFeedback && !transitivityFeedback.isCorrect && <VocabHint entry={question.entry} />}
        {transitivityFeedback && !transitivityFeedback.isCorrect && (
          <button type="button" className="quiz-next-button" onClick={handleNextTransitivity}>
            다음
          </button>
        )}
        <p className="shortcut-hint">숫자키(1~4)로 선택 · 오답이면 Enter로 다음 문제</p>
      </div>
    )
  }

  if (phase === 'writingQuizResult') {
    const correctCount = writingAnswers.filter((a) => a.isCorrect).length
    const total = writingAnswers.length
    const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0

    return (
      <div className="result-screen">
        <h1>단어 표기 퀴즈 결과</h1>
        <p className="result-summary">
          {correctCount} / {total} 정답 ({rate}%)
        </p>
        <ul className="result-list">
          {writingAnswers.map((a, i) => {
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
          ref={writingRestartButtonRef}
          className="restart-button"
          onClick={() => setPhase('setup')}
        >
          다시 설정하기
        </button>
      </div>
    )
  }

  if (phase === 'transitivityQuizResult') {
    const correctCount = transitivityAnswers.filter((a) => a.isCorrect).length
    const total = transitivityAnswers.length
    const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0

    return (
      <div className="result-screen">
        <h1>자타동사 구분 퀴즈 결과</h1>
        <p className="result-summary">
          {correctCount} / {total} 정답 ({rate}%)
        </p>
        <ul className="result-list">
          {transitivityAnswers.map((a, i) => {
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
          ref={transitivityRestartButtonRef}
          className="restart-button"
          onClick={() => setPhase('setup')}
        >
          다시 설정하기
        </button>
      </div>
    )
  }

  if (phase === 'synonymQuiz') {
    const question = synonymQuestions[synonymIndex]
    return (
      <div className="quiz-runner">
        <div className="quiz-topbar">
          <button
            type="button"
            className="quiz-exit-button"
            onClick={() => {
              setPhase('setup')
              setSavedSynonymQuiz(getVocabSynonymInProgressQuiz())
            }}
          >
            나가기
          </button>
          <div className="quiz-progress">
            {synonymIndex + 1} / {synonymQuestions.length}
          </div>
        </div>
        <div className="vocab-quiz-prompt">
          <span className="vocab-quiz-prompt-word">{question.entry.word}</span>
          <span className="vocab-quiz-prompt-reading">{question.entry.reading}</span>
          <span className="vocab-quiz-prompt-meaning">{question.entry.meaningKr} · 같은 뜻의 단어는?</span>
        </div>
        <div className="vocab-quiz-choices" ref={synonymChoicesRef}>
          {question.choices.map((choice, i) => {
            let className = 'vocab-quiz-choice'
            if (synonymFeedback) {
              if (choice.id === synonymFeedback.selectedId) {
                className += synonymFeedback.isCorrect ? ' correct' : ' incorrect'
              } else if (!synonymFeedback.isCorrect && choice.id === question.answer.id) {
                className += ' reveal-correct'
              }
            }
            return (
              <button
                key={choice.id}
                type="button"
                className={className}
                disabled={synonymFeedback !== null}
                onClick={() => submitSynonymAnswer(choice.id)}
              >
                <span className="quiz-choice-num">{i + 1}</span>
                {choice.word}
                <span className="quiz-choice-pos">{choice.reading}</span>
              </button>
            )
          })}
        </div>
        {synonymFeedback && <QuizVerdict isCorrect={synonymFeedback.isCorrect} />}
        {synonymFeedback && !synonymFeedback.isCorrect && <VocabHint entry={question.answer} />}
        {synonymFeedback && !synonymFeedback.isCorrect && (
          <button type="button" className="quiz-next-button" onClick={handleNextSynonym}>
            다음
          </button>
        )}
        <p className="shortcut-hint">숫자키(1~4)로 선택 · 오답이면 Enter로 다음 문제</p>
      </div>
    )
  }

  if (phase === 'synonymQuizResult') {
    const correctCount = synonymAnswers.filter((a) => a.isCorrect).length
    const total = synonymAnswers.length
    const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0

    return (
      <div className="result-screen">
        <h1>단어 유의어 퀴즈 결과</h1>
        <p className="result-summary">
          {correctCount} / {total} 정답 ({rate}%)
        </p>
        <ul className="result-list">
          {synonymAnswers.map((a, i) => {
            const selectedChoice = a.question.choices.find((c) => c.id === a.selectedId)
            return (
              <li key={`${a.question.entry.id}-${i}`} className={a.isCorrect ? 'correct' : 'incorrect'}>
                <span className="vocab-result-word">
                  {a.question.entry.word}
                  <span className="vocab-result-reading">{a.question.entry.reading}</span>
                </span>
                <span className="result-detail">
                  <span className="result-detail-main">
                    정답: {a.question.answer.word}
                    {!a.isCorrect && selectedChoice && <> · 내 답: {selectedChoice.word}</>}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          ref={synonymRestartButtonRef}
          className="restart-button"
          onClick={() => setPhase('setup')}
        >
          다시 설정하기
        </button>
      </div>
    )
  }

  if (phase === 'usageQuiz') {
    const question = usageQuestions[usageIndex]
    return (
      <div className="quiz-runner">
        <div className="quiz-topbar">
          <button
            type="button"
            className="quiz-exit-button"
            onClick={() => {
              setPhase('setup')
              setSavedUsageQuiz(getVocabUsageInProgressQuiz())
            }}
          >
            나가기
          </button>
          <div className="quiz-progress">
            {usageIndex + 1} / {usageQuestions.length}
          </div>
        </div>
        <div className="vocab-quiz-prompt">
          <span className="vocab-quiz-prompt-word">{question.entry.word}</span>
          <span className="vocab-quiz-prompt-reading">{question.entry.reading}</span>
          <span className="vocab-quiz-prompt-meaning">
            {question.entry.meaningKr} · 이 단어가 들어갈 문장은?
          </span>
        </div>
        <div className="vocab-quiz-choices" ref={usageChoicesRef}>
          {question.blankedChoices.map((choice, i) => {
            let className = 'vocab-quiz-choice'
            if (usageFeedback) {
              if (choice.entry.id === usageFeedback.selectedId) {
                className += usageFeedback.isCorrect ? ' correct' : ' incorrect'
              } else if (!usageFeedback.isCorrect && choice.entry.id === question.entry.id) {
                className += ' reveal-correct'
              }
            }
            return (
              <button
                key={choice.entry.id}
                type="button"
                className={className}
                disabled={usageFeedback !== null}
                onClick={() => submitUsageAnswer(choice.entry.id)}
              >
                <span className="quiz-choice-num">{i + 1}</span>
                <span className="vocab-derivation-sentence">{choice.blankedSentence}</span>
              </button>
            )
          })}
        </div>
        {usageFeedback && <QuizVerdict isCorrect={usageFeedback.isCorrect} />}
        {usageFeedback && !usageFeedback.isCorrect && <VocabHint entry={question.entry} />}
        {usageFeedback && !usageFeedback.isCorrect && (
          <button type="button" className="quiz-next-button" onClick={handleNextUsage}>
            다음
          </button>
        )}
        <p className="shortcut-hint">숫자키(1~4)로 선택 · 오답이면 Enter로 다음 문제</p>
      </div>
    )
  }

  if (phase === 'usageQuizResult') {
    const correctCount = usageAnswers.filter((a) => a.isCorrect).length
    const total = usageAnswers.length
    const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0

    return (
      <div className="result-screen">
        <h1>단어 용법 퀴즈 결과</h1>
        <p className="result-summary">
          {correctCount} / {total} 정답 ({rate}%)
        </p>
        <ul className="result-list">
          {usageAnswers.map((a, i) => (
            <li key={`${a.question.entry.id}-${i}`} className={a.isCorrect ? 'correct' : 'incorrect'}>
              <span className="vocab-result-word">
                {a.question.entry.word}
                <span className="vocab-result-reading">{a.question.entry.reading}</span>
              </span>
              <span className="result-detail">
                <span className="result-detail-main">{a.question.entry.exampleJp}</span>
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          ref={usageRestartButtonRef}
          className="restart-button"
          onClick={() => setPhase('setup')}
        >
          다시 설정하기
        </button>
      </div>
    )
  }

  const isLevelFinished = pool.length > 0 && remaining <= 0

  // 선택된 퀴즈 종류가 출제 대상으로 삼는 단어 풀 — 문항 수 상한/표시에 함께 쓴다
  const activePool =
    quizType === 'meaning'
      ? pool
      : quizType === 'blank'
        ? blankPool
        : quizType === 'reading'
          ? readingPool
          : quizType === 'writing'
            ? writingPool
            : quizType === 'transitivity'
              ? transitivityPool
              : quizType === 'synonym'
                ? synonymPool
                : usagePool
  const quizCountLabel = quizCount === 'all' ? `전체 ${activePool.length}문제` : `${quizCount}문제`

  // 진행 중이던 퀴즈 — 7종을 각각 배너로 쌓지 않고, 있는 것 하나만 한 줄로 보여준다.
  // 동시에 여러 종류가 남아 있을 일은 거의 없고, 있어도 하나 끝내면 다음 게 뜬다
  const resumable = savedQuiz
    ? { label: QUIZ_TYPE_LABELS.meaning, level: savedQuiz.level, index: savedQuiz.index, total: savedQuiz.questions.length, resume: () => resumeQuiz(savedQuiz) }
    : savedBlankQuiz
      ? { label: QUIZ_TYPE_LABELS.blank, level: savedBlankQuiz.level, index: savedBlankQuiz.index, total: savedBlankQuiz.questions.length, resume: () => resumeBlankQuiz(savedBlankQuiz) }
      : savedReadingQuiz
        ? { label: QUIZ_TYPE_LABELS.reading, level: savedReadingQuiz.level, index: savedReadingQuiz.index, total: savedReadingQuiz.questions.length, resume: () => resumeReadingQuiz(savedReadingQuiz) }
        : savedWritingQuiz
          ? { label: QUIZ_TYPE_LABELS.writing, level: savedWritingQuiz.level, index: savedWritingQuiz.index, total: savedWritingQuiz.questions.length, resume: () => resumeWritingQuiz(savedWritingQuiz) }
          : savedTransitivityQuiz
            ? { label: QUIZ_TYPE_LABELS.transitivity, level: savedTransitivityQuiz.level, index: savedTransitivityQuiz.index, total: savedTransitivityQuiz.questions.length, resume: () => resumeTransitivityQuiz(savedTransitivityQuiz) }
            : savedSynonymQuiz
              ? { label: QUIZ_TYPE_LABELS.synonym, level: savedSynonymQuiz.level, index: savedSynonymQuiz.index, total: savedSynonymQuiz.questions.length, resume: () => resumeSynonymQuiz(savedSynonymQuiz) }
              : savedUsageQuiz
                ? { label: QUIZ_TYPE_LABELS.usage, level: savedUsageQuiz.level, index: savedUsageQuiz.index, total: savedUsageQuiz.questions.length, resume: () => resumeUsageQuiz(savedUsageQuiz) }
                : null

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

      {resumable && (
        <div className="study-resume">
          <span className="study-resume-text">
            진행 중이던 {resumable.label} 퀴즈 ({resumable.level} · {resumable.index}/{resumable.total}문제)
          </span>
          <button type="button" className="study-resume-button" onClick={resumable.resume}>
            이어서 풀기
          </button>
        </div>
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

      <div className="study-section">
        <span className="study-section-title">새 단어 학습</span>

        <div className="quiz-option-group">
          <span className="quiz-option-label">한 번에 학습할 개수</span>
          <div className="study-level-picker">
            {STUDY_BATCH_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={`study-level-btn${batchSize === n ? ' active' : ''}`}
                onClick={() => {
                  setBatchSize(n)
                  setStudyBatchSize('vocab', n)
                }}
              >
                {n === 0 ? '전체' : n}
              </button>
            ))}
          </div>
        </div>

        {isLevelFinished ? (
          <>
            <p className="page-placeholder">이 급수 단어를 모두 학습했습니다.</p>
            <button type="button" className="study-start-button" onClick={() => restartBatch(level)}>
              처음부터 다시 학습하기
            </button>
          </>
        ) : (
          <button type="button" className="study-start-button" onClick={() => startBatch(level, completedCount)}>
            {completedCount > 0 ? '이어하기' : '시작하기'} ({batchSize === 0 ? remaining : Math.min(batchSize, remaining)}개)
          </button>
        )}
      </div>

      <div className="study-section">
        <span className="study-section-title">퀴즈로 복습</span>

        <button
          type="button"
          className="study-settings-toggle"
          aria-expanded={quizSettingsOpen}
          onClick={() => setQuizSettingsOpen((v) => !v)}
        >
          {quizSettingsOpen ? '설정 접기 ▲' : `${QUIZ_TYPE_LABELS[quizType]} · ${quizCountLabel} · ${quizOrder === 'random' ? '랜덤' : '순차'} · 설정 바꾸기 ▼`}
        </button>

        {quizSettingsOpen && (
          <>
            <div className="quiz-option-group">
              <span className="quiz-option-label">퀴즈 종류</span>
              <div className="study-level-picker">
                {QUIZ_TYPES.map((t) => (
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
          </>
        )}

      {quizType === 'blank' && blankPool.length === 0 ? (
        <p className="page-placeholder">이 급수는 아직 빈칸 퀴즈로 낼 수 있는 단어가 없습니다.</p>
      ) : quizType === 'reading' && readingPool.length === 0 ? (
        <p className="page-placeholder">이 급수는 아직 읽기 입력 퀴즈로 낼 수 있는 단어가 없습니다.</p>
      ) : quizType === 'writing' && writingPool.length === 0 ? (
        <p className="page-placeholder">이 급수는 아직 표기 퀴즈로 낼 수 있는 단어가 없습니다.</p>
      ) : quizType === 'transitivity' && transitivityPool.length === 0 ? (
        <p className="page-placeholder">이 급수는 아직 자타동사 구분 퀴즈로 낼 수 있는 단어가 없습니다.</p>
      ) : quizType === 'synonym' && synonymPool.length === 0 ? (
        <p className="page-placeholder">이 급수는 아직 유의어 퀴즈로 낼 수 있는 단어가 없습니다.</p>
      ) : quizType === 'usage' && usagePool.length === 0 ? (
        <p className="page-placeholder">이 급수는 아직 용법 퀴즈로 낼 수 있는 단어가 없습니다.</p>
      ) : quizType === 'meaning' ? (
        <button type="button" className="vocab-quiz-button" onClick={startQuiz}>
          단어 퀴즈 풀기 ({quizCount === 'all' ? pool.length : Math.min(quizCount, pool.length)}문제)
        </button>
      ) : quizType === 'blank' ? (
        <button type="button" className="vocab-quiz-button" onClick={startBlankQuiz}>
          문맥 빈칸 퀴즈 풀기 ({quizCount === 'all' ? blankPool.length : Math.min(quizCount, blankPool.length)}문제)
        </button>
      ) : quizType === 'reading' ? (
        <button type="button" className="vocab-quiz-button" onClick={startReadingQuiz}>
          읽기 입력 퀴즈 풀기 ({quizCount === 'all' ? readingPool.length : Math.min(quizCount, readingPool.length)}문제)
        </button>
      ) : quizType === 'writing' ? (
        <button type="button" className="vocab-quiz-button" onClick={startWritingQuiz}>
          표기 퀴즈 풀기 ({quizCount === 'all' ? writingPool.length : Math.min(quizCount, writingPool.length)}문제)
        </button>
      ) : quizType === 'transitivity' ? (
        <button type="button" className="vocab-quiz-button" onClick={startTransitivityQuiz}>
          자타동사 구분 퀴즈 풀기 ({quizCount === 'all' ? transitivityPool.length : Math.min(quizCount, transitivityPool.length)}
          문제)
        </button>
      ) : quizType === 'synonym' ? (
        <button type="button" className="vocab-quiz-button" onClick={startSynonymQuiz}>
          유의어 퀴즈 풀기 ({quizCount === 'all' ? synonymPool.length : Math.min(quizCount, synonymPool.length)}문제)
        </button>
      ) : (
        <button type="button" className="vocab-quiz-button" onClick={startUsageQuiz}>
          용법 퀴즈 풀기 ({quizCount === 'all' ? usagePool.length : Math.min(quizCount, usagePool.length)}문제)
        </button>
      )}
      </div>
    </div>
  )
}
