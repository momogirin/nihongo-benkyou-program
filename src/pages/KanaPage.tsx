import { useEffect, useMemo, useRef, useState } from 'react'
import { kanaList, type Kana } from '../data/kana'
import { kanaPairList } from '../data/kanaPairs'
import {
  addKanaQuizHistoryEntry,
  addKanaWrongNotes,
  getDueSrsIds,
  recordSrsReview,
  removeKanaWrongNote,
} from '../lib/storage'
import './StudyPage.css'
import './VocabPage.css'
import './KanjiPage.css'
import './KanaPage.css'

type SubTab = 'study' | 'chart' | 'quiz'
type Script = 'hiragana' | 'katakana'
// 탁음/반탁음은 같은 학습 묶음으로 다룸(반탁음은 5자뿐이라 따로 급수를 두면 산만)
type GroupFilter = 'all' | 'gojuon' | 'dakuten' | 'youon'
type QuizDirection = 'toRomaji' | 'toKana'
type QuizCount = 10 | 20 | 'all'
type Phase = 'setup' | 'running' | 'result'

const QUIZ_COUNTS: QuizCount[] = [10, 20, 'all']

const SCRIPT_LABELS: Record<Script, string> = {
  hiragana: '히라가나',
  katakana: '가타카나',
}

const GROUP_FILTERS: { id: GroupFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'gojuon', label: '청음' },
  { id: 'dakuten', label: '탁음·반탁음' },
  { id: 'youon', label: '요음' },
]

const DIRECTION_LABELS: Record<QuizDirection, string> = {
  toRomaji: '가나 → 로마자',
  toKana: '로마자 → 가나',
}

// gojūon chart row order (consonant groups), plus the youon combo rows
const GOJUON_ROW_ORDER = ['a', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w']
const DAKUTEN_ROW_ORDER = ['g', 'z', 'd', 'b', 'p']
const YOUON_ROW_ORDER = ['ky', 'sh', 'ch', 'ny', 'hy', 'my', 'ry', 'gy', 'j', 'by', 'py']

function inGroup(kana: Kana, filter: GroupFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'gojuon') return kana.group === 'gojuon'
  if (filter === 'dakuten') return kana.group === 'dakuten' || kana.group === 'handakuten'
  return kana.group === 'youon'
}

function displayChar(kana: Kana, script: Script): string {
  return script === 'hiragana' ? kana.hiragana : kana.katakana
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}


export default function KanaPage() {
  const [subTab, setSubTab] = useState<SubTab>('chart')
  const [script, setScript] = useState<Script>('hiragana')

  return (
    <>
      <div className="kanji-tabs">
        <button type="button" className={`kanji-tab${subTab === 'chart' ? ' active' : ''}`} onClick={() => setSubTab('chart')}>
          표
        </button>
        <button type="button" className={`kanji-tab${subTab === 'study' ? ' active' : ''}`} onClick={() => setSubTab('study')}>
          학습
        </button>
        <button type="button" className={`kanji-tab${subTab === 'quiz' ? ' active' : ''}`} onClick={() => setSubTab('quiz')}>
          퀴즈
        </button>
      </div>

      {subTab === 'chart' && <KanaChart script={script} onScriptChange={setScript} />}
      {subTab === 'study' && <KanaStudy script={script} onScriptChange={setScript} />}
      {subTab === 'quiz' && <KanaQuiz script={script} onScriptChange={setScript} />}
    </>
  )
}

interface ScriptToggleProps {
  script: Script
  onScriptChange: (s: Script) => void
}

function ScriptToggle({ script, onScriptChange }: ScriptToggleProps) {
  return (
    <div className="study-view-toggle kana-script-toggle">
      {(['hiragana', 'katakana'] as Script[]).map((s) => (
        <button
          key={s}
          type="button"
          className={`study-view-toggle-btn${script === s ? ' active' : ''}`}
          onClick={() => onScriptChange(s)}
        >
          {SCRIPT_LABELS[s]}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────── 표(오십음도) ───────────────────

function KanaChart({ script, onScriptChange }: ScriptToggleProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  // flat navigation order for the detail view (chart reading order)
  const flat = useMemo(() => kanaList, [])

  useEffect(() => {
    if (selectedIndex === null) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setSelectedIndex((i) => (i !== null && i + 1 < flat.length ? i + 1 : i))
      else if (e.key === 'ArrowLeft') setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i))
      else if (e.key === 'Escape') setSelectedIndex(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, flat.length])

  if (selectedIndex !== null) {
    return <KanaDetail kana={flat[selectedIndex]} index={selectedIndex} total={flat.length} onExit={() => setSelectedIndex(null)} onNav={setSelectedIndex} />
  }

  const openDetail = (kana: Kana) => setSelectedIndex(flat.findIndex((k) => k.id === kana.id))

  return (
    <div className="page">
      <h1>가나</h1>
      <ScriptToggle script={script} onScriptChange={onScriptChange} />

      <section className="kana-chart-section">
        <h2>청음 (五十音)</h2>
        <GojuonGrid script={script} onSelect={openDetail} />
      </section>
      <section className="kana-chart-section">
        <h2>탁음·반탁음</h2>
        <ComboGrid rows={DAKUTEN_ROW_ORDER} cols={5} filter={(k) => k.group === 'dakuten' || k.group === 'handakuten'} script={script} onSelect={openDetail} />
      </section>
      <section className="kana-chart-section">
        <h2>요음</h2>
        <ComboGrid rows={YOUON_ROW_ORDER} cols={3} filter={(k) => k.group === 'youon'} script={script} onSelect={openDetail} />
      </section>
      <p className="shortcut-hint">칸을 누르면 상세 · 상세에서 ← → 로 이동</p>
    </div>
  )
}

interface GridProps {
  script: Script
  onSelect: (kana: Kana) => void
}

// gojūon: 10 consonant rows × 5 vowel columns + standalone ん
function GojuonGrid({ script, onSelect }: GridProps) {
  const nKana = kanaList.find((k) => k.rowKey === 'n-final')!
  return (
    <div className="kana-grid kana-grid-5">
      {GOJUON_ROW_ORDER.map((rowKey) => {
        const rowKana = kanaList.filter((k) => k.group === 'gojuon' && k.rowKey === rowKey)
        return Array.from({ length: 5 }, (_, col) => {
          const kana = rowKana.find((k) => k.col === col)
          return kana ? (
            <KanaCell key={`${rowKey}-${col}`} kana={kana} script={script} onSelect={onSelect} />
          ) : (
            <div key={`${rowKey}-${col}`} className="kana-cell kana-cell-empty" aria-hidden="true" />
          )
        })
      })}
      <KanaCell kana={nKana} script={script} onSelect={onSelect} />
    </div>
  )
}

interface ComboGridProps extends GridProps {
  rows: string[]
  cols: number
  filter: (k: Kana) => boolean
}

function ComboGrid({ rows, cols, filter, script, onSelect }: ComboGridProps) {
  return (
    <div className={`kana-grid kana-grid-${cols}`}>
      {rows.map((rowKey) => {
        const rowKana = kanaList.filter((k) => filter(k) && k.rowKey === rowKey)
        return Array.from({ length: cols }, (_, col) => {
          const kana = rowKana.find((k) => k.col === col)
          return kana ? (
            <KanaCell key={`${rowKey}-${col}`} kana={kana} script={script} onSelect={onSelect} />
          ) : (
            <div key={`${rowKey}-${col}`} className="kana-cell kana-cell-empty" aria-hidden="true" />
          )
        })
      })}
    </div>
  )
}

function KanaCell({ kana, script, onSelect }: { kana: Kana } & GridProps) {
  return (
    <button type="button" className="kana-cell" onClick={() => onSelect(kana)}>
      <span className="kana-cell-char">{displayChar(kana, script)}</span>
      <span className="kana-cell-romaji">{kana.romaji}</span>
    </button>
  )
}

interface KanaDetailProps {
  kana: Kana
  index: number
  total: number
  onExit: () => void
  onNav: (updater: (i: number | null) => number | null) => void
}

function KanaDetail({ kana, index, total, onExit, onNav }: KanaDetailProps) {
  return (
    <div className="page study-page">
      <div className="study-content">
        <div className="study-topbar">
          <button type="button" className="study-exit-button" onClick={onExit}>
            ← 목록으로
          </button>
          <div className="quiz-progress">
            {index + 1} / {total}
          </div>
        </div>
        <div className="study-card">
          <div className="kana-detail-char">{kana.hiragana}</div>
          <dl className="study-fields study-fields-core">
            <div className="study-field">
              <dt>히라가나</dt>
              <dd>{kana.hiragana}</dd>
            </div>
            <div className="study-field">
              <dt>가타카나</dt>
              <dd>{kana.katakana}</dd>
            </div>
            <div className="study-field">
              <dt>로마자</dt>
              <dd>{kana.romaji}</dd>
            </div>
          </dl>
          {kana.exampleJp && (
            <dl className="study-fields study-fields-sub">
              <div className="study-field">
                <dt>예시 단어</dt>
                <dd>
                  {kana.exampleJp}
                  {kana.exampleKr && ` · ${kana.exampleKr}`}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </div>
      <div className="study-nav">
        <button type="button" onClick={() => onNav((i) => (i !== null && i > 0 ? i - 1 : i))} disabled={index === 0}>
          이전
        </button>
        <button
          type="button"
          className="study-nav-primary"
          onClick={() => onNav((i) => (i !== null && i + 1 < total ? i + 1 : i))}
          disabled={index === total - 1}
        >
          다음
        </button>
      </div>
      <p className="shortcut-hint">← → 로 이전/다음 · Esc로 목록으로</p>
    </div>
  )
}

// ─────────────────────────────────────────── 학습(플래시카드) ───────────────

function KanaStudy({ script, onScriptChange }: ScriptToggleProps) {
  const [group, setGroup] = useState<GroupFilter>('gojuon')
  const [studying, setStudying] = useState(false)
  const [cardIndex, setCardIndex] = useState(0)

  const pool = useMemo(() => kanaList.filter((k) => inGroup(k, group)), [group])

  useEffect(() => {
    if (!studying) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'Enter') setCardIndex((i) => (i + 1 < pool.length ? i + 1 : i))
      else if (e.key === 'ArrowLeft') setCardIndex((i) => (i > 0 ? i - 1 : i))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [studying, pool.length])

  function start() {
    setCardIndex(0)
    setStudying(true)
  }

  if (studying) {
    const kana = pool[cardIndex]
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
            <div className="kana-detail-char">{displayChar(kana, script)}</div>
            <dl className="study-fields study-fields-core">
              <div className="study-field">
                <dt>로마자</dt>
                <dd>{kana.romaji}</dd>
              </div>
              <div className="study-field">
                <dt>{script === 'hiragana' ? '가타카나' : '히라가나'}</dt>
                <dd>{script === 'hiragana' ? kana.katakana : kana.hiragana}</dd>
              </div>
            </dl>
            {kana.exampleJp && (
              <dl className="study-fields study-fields-sub">
                <div className="study-field">
                  <dt>예시 단어</dt>
                  <dd>
                    {kana.exampleJp}
                    {kana.exampleKr && ` · ${kana.exampleKr}`}
                  </dd>
                </div>
              </dl>
            )}
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
      <h1>가나 학습</h1>
      <ScriptToggle script={script} onScriptChange={onScriptChange} />
      <div className="study-level-picker">
        {GROUP_FILTERS.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`study-level-btn${g.id === group ? ' active' : ''}`}
            onClick={() => setGroup(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
      <p className="study-progress-summary">
        {SCRIPT_LABELS[script]} · {GROUP_FILTERS.find((g) => g.id === group)!.label} · {pool.length}자
      </p>
      <button type="button" className="study-start-button" onClick={start}>
        시작하기
      </button>
    </div>
  )
}

// ─────────────────────────────────────────── 퀴즈 ──────────────────────────

// 두 퀴즈 유형(가나↔로마자 / 표기 구분)을 한 러너로 처리하기 위한 정규화 문제.
type QuizType = 'romaji' | 'pairs'
interface NormChoice {
  key: string
  main: string
}
interface NormQuestion {
  promptMain: string
  promptSub?: string
  choices: NormChoice[]
  answerKey: string
  resultMain: string
  resultSub?: string
}

const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  romaji: '가나 ↔ 로마자',
  pairs: '표기 구분',
}

function KanaQuiz({ script, onScriptChange }: ScriptToggleProps) {
  const [quizType, setQuizType] = useState<QuizType>('romaji')
  const [group, setGroup] = useState<GroupFilter>('gojuon')
  const [direction, setDirection] = useState<QuizDirection>('toRomaji')
  const [count, setCount] = useState<QuizCount>(20)
  const [phase, setPhase] = useState<Phase>('setup')
  const [questions, setQuestions] = useState<NormQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<{ selectedKey: string; isCorrect: boolean } | null>(null)
  const [answers, setAnswers] = useState<
    { answerKey: string; resultMain: string; resultSub?: string; isCorrect: boolean }[]
  >([])
  const advanceTimer = useRef<number | null>(null)
  const quizStartRef = useRef(0)

  const pool = useMemo(() => kanaList.filter((k) => inGroup(k, group)), [group])
  const setupCount = quizType === 'pairs' ? kanaPairList.length : pool.length

  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
    },
    [],
  )

  function buildRomajiQuestionsFrom(sourceKana: Kana[], distractorPool: Kana[]): NormQuestion[] {
    const toRomaji = direction === 'toRomaji'
    return sourceKana.map((kana) => {
      const distractors = shuffle(distractorPool.filter((k) => k.romaji !== kana.romaji)).slice(0, 3)
      const all = shuffle([kana, ...distractors])
      return {
        promptMain: toRomaji ? displayChar(kana, script) : kana.romaji,
        choices: all.map((k) => ({ key: k.id, main: toRomaji ? k.romaji : displayChar(k, script) })),
        answerKey: kana.id,
        resultMain: displayChar(kana, script),
        resultSub: kana.romaji,
      }
    })
  }

  function buildRomajiQuestions(): NormQuestion[] {
    const picked = count === 'all' ? shuffle(pool) : shuffle(pool).slice(0, count)
    return buildRomajiQuestionsFrom(picked, pool)
  }

  function startFrom(questionList: NormQuestion[]) {
    setQuestions(questionList)
    setIndex(0)
    setFeedback(null)
    setAnswers([])
    quizStartRef.current = Date.now()
    setPhase('running')
  }

  // 복습: SRS가 지금 복습하라고 지목한 가나만 뽑아 로마자 퀴즈로. 오답 선택지는
  // 전체 가나에서(그룹 무관) 뽑아 변별력 유지.
  function startReview(dueKana: Kana[]) {
    setQuizType('romaji')
    startFrom(buildRomajiQuestionsFrom(shuffle(dueKana), kanaList))
  }

  function buildPairQuestions(): NormQuestion[] {
    const picked = count === 'all' ? shuffle(kanaPairList) : shuffle(kanaPairList).slice(0, count)
    return picked.map((pair) => {
      const spellings = shuffle([pair.word, ...pair.variants])
      return {
        promptMain: pair.meaningKr,
        promptSub: `${pair.type} 구분`,
        choices: spellings.map((s) => ({ key: s, main: s })),
        answerKey: pair.word,
        resultMain: pair.word,
        resultSub: pair.meaningKr,
      }
    })
  }

  function startQuiz() {
    startFrom(quizType === 'pairs' ? buildPairQuestions() : buildRomajiQuestions())
  }

  function submitAnswer(choice: NormChoice) {
    if (feedback) return
    const question = questions[index]
    const isCorrect = choice.key === question.answerKey
    // 로마자 모드는 answerKey가 가나 id라 SRS 기록 대상(가나 낱자 재인). 표기 구분
    // (pairs) 모드는 낱자 재인이 아니고 answerKey가 표기 문자열이라 기록하지 않음.
    if (quizType === 'romaji') recordSrsReview('kana', question.answerKey, isCorrect)
    setFeedback({ selectedKey: choice.key, isCorrect })
    setAnswers((prev) => [
      ...prev,
      { answerKey: question.answerKey, resultMain: question.resultMain, resultSub: question.resultSub, isCorrect },
    ])
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

  // 로마자 퀴즈 결과 화면 진입 시 오답을 오답노트에 쌓고, 이번 회차에 맞힌
  // 낱자는 더 이상 약점이 아니므로 제거 — 다른 도메인과 같은 패턴(GrammarPage 등).
  useEffect(() => {
    if (phase !== 'result' || quizType !== 'romaji') return
    const wrongIds = answers.filter((a) => !a.isCorrect).map((a) => a.answerKey)
    addKanaWrongNotes(wrongIds, `가나 퀴즈 · ${QUIZ_TYPE_LABELS[quizType]}`)
    answers.filter((a) => a.isCorrect).forEach((a) => removeKanaWrongNote(a.answerKey))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // 주간 통계·최근 기록에 가나 퀴즈도 잡히도록 회차 기록 — 두 유형(로마자/표기 구분)
  // 모두 대상(오답노트/SRS와 달리 pairs도 실제 학습이므로 통계엔 포함)
  useEffect(() => {
    if (phase !== 'result' || answers.length === 0) return
    addKanaQuizHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mode: QUIZ_TYPE_LABELS[quizType],
      total: answers.length,
      correct: answers.filter((a) => a.isCorrect).length,
      elapsedMs: Date.now() - quizStartRef.current,
      finishedAt: new Date().toISOString(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // window-level key handling (no auto-focus on choices — avoids the "same
  // Enter keyup clicks the freshly focused choice" bug seen elsewhere)
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
    const isPairPrompt = quizType === 'pairs'
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
          <span className={isPairPrompt ? 'kana-pair-prompt-meaning' : 'kana-quiz-prompt-char'}>
            {question.promptMain}
          </span>
          {question.promptSub && <span className="kana-pair-prompt-hint">{question.promptSub}</span>}
        </div>
        <div className="vocab-quiz-choices">
          {question.choices.map((choice, i) => {
            let className = 'vocab-quiz-choice'
            if (feedback) {
              if (choice.key === feedback.selectedKey) className += feedback.isCorrect ? ' correct' : ' incorrect'
              else if (!feedback.isCorrect && choice.key === question.answerKey) className += ' reveal-correct'
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
                {choice.main}
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
        <h1>가나 퀴즈 결과</h1>
        <p className="result-summary">
          {correctCount} / {total} 정답 ({rate}%)
        </p>
        <ul className="result-list">
          {answers.map((a, i) => (
            <li key={`${a.resultMain}-${i}`} className={a.isCorrect ? 'correct' : 'incorrect'}>
              <span className="kana-result-char">{a.resultMain}</span>
              {a.resultSub && <span className="kana-result-romaji">{a.resultSub}</span>}
            </li>
          ))}
        </ul>
        <button type="button" className="study-start-button" onClick={() => setPhase('setup')}>
          다시 풀기
        </button>
      </div>
    )
  }

  // SRS가 지금 복습하라고 지목한 가나(로마자 퀴즈로 한 번이라도 틀렸거나 복습주기가
  // 된 낱자). setup이 다시 그려질 때마다 최신 상태를 읽는다.
  const dueSet = new Set(getDueSrsIds('kana', kanaList.map((k) => k.id)))
  const dueKana = kanaList.filter((k) => dueSet.has(k.id))

  return (
    <div className="page study-setup">
      <h1>가나 퀴즈</h1>
      {quizType === 'romaji' && dueKana.length > 0 && (
        <button type="button" className="kana-review-banner" onClick={() => startReview(dueKana)}>
          복습할 가나 <strong>{dueKana.length}자</strong> — 지금 복습하기
        </button>
      )}
      <div className="kana-quiz-field">
        <span className="kana-quiz-field-label">유형</span>
        <div className="study-level-picker">
          {(['romaji', 'pairs'] as QuizType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`study-level-btn${t === quizType ? ' active' : ''}`}
              onClick={() => setQuizType(t)}
            >
              {QUIZ_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {quizType === 'romaji' ? (
        <>
          <ScriptToggle script={script} onScriptChange={onScriptChange} />
          <div className="kana-quiz-field">
            <span className="kana-quiz-field-label">범위</span>
            <div className="study-level-picker">
              {GROUP_FILTERS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`study-level-btn${g.id === group ? ' active' : ''}`}
                  onClick={() => setGroup(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className="kana-quiz-field">
            <span className="kana-quiz-field-label">방향</span>
            <div className="study-level-picker">
              {(['toRomaji', 'toKana'] as QuizDirection[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`study-level-btn${d === direction ? ' active' : ''}`}
                  onClick={() => setDirection(d)}
                >
                  {DIRECTION_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="kana-pair-desc">촉음(っ)·장음(ー)·요음(ゃゅょ)이 헷갈리는 최소대립쌍 — 뜻을 보고 올바른 표기를 고르세요.</p>
      )}

      <div className="kana-quiz-field">
        <span className="kana-quiz-field-label">문항 수</span>
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
        {quizType === 'romaji' ? `${SCRIPT_LABELS[script]} · ${DIRECTION_LABELS[direction]}` : '표기 구분'} ·{' '}
        {count === 'all' ? setupCount : Math.min(count, setupCount)}문항
      </p>
      <button type="button" className="study-start-button" onClick={startQuiz}>
        퀴즈 풀기
      </button>
    </div>
  )
}
