import { useEffect, useMemo, useRef, useState } from 'react'
import { kanjiList, type Kanji, type KanjiLevel } from '../data/kanji'
import { studyContentByKanjiId } from '../data/studyContent'
import { radicalList } from '../data/radicals'
import { kanjiIdsQuizConfig } from '../lib/quizGenerator'
import { getStudyProgress, setStudyProgress } from '../lib/storage'
import type { QuizConfig } from '../types'
import './StudyPage.css'

interface Props {
  onStartQuiz: (config: QuizConfig) => void
}

const ALL_LEVELS: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

function levelPool(level: KanjiLevel): Kanji[] {
  return kanjiList
    .filter((k) => k.level === level && studyContentByKanjiId[k.id])
    .sort((a, b) => a.num - b.num)
}

type Phase = 'setup' | 'studying' | 'done'

export default function StudyPage({ onStartQuiz }: Props) {
  const availableLevels = useMemo(() => ALL_LEVELS.filter((l) => levelPool(l).length > 0), [])
  const [level, setLevel] = useState<KanjiLevel | null>(availableLevels[0] ?? null)
  const pool = useMemo(() => (level ? levelPool(level) : []), [level])
  const completedCount = level ? Math.min(getStudyProgress(level), pool.length) : 0
  const remaining = pool.length - completedCount

  const [phase, setPhase] = useState<Phase>('setup')
  const [batch, setBatch] = useState<Kanji[]>([])
  const [cardIndex, setCardIndex] = useState(0)
  const donePrimaryButtonRef = useRef<HTMLButtonElement>(null)

  // "done" lands on a fresh screen with nothing focused (the last study-nav
  // button belongs to the previous phase), so Enter/Space wouldn't do
  // anything without a mouse click first
  useEffect(() => {
    if (phase === 'done') donePrimaryButtonRef.current?.focus({ preventScroll: true })
  }, [phase])

  function startBatch() {
    if (!level) return
    setBatch(pool.slice(completedCount))
    setCardIndex(0)
    setPhase('studying')
  }

  function finishBatch() {
    if (!level) return
    setStudyProgress(level, Math.min(completedCount + batch.length, pool.length))
    setPhase('done')
  }

  function restartBatch() {
    if (!level) return
    setBatch(pool)
    setCardIndex(0)
    setPhase('studying')
  }

  // saves progress up to (not including) the card being left, so 이어하기
  // re-shows that same card rather than skipping it
  function exitBatch() {
    if (!level) return
    setStudyProgress(level, completedCount + cardIndex)
    setPhase('setup')
  }

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

  if (!level) {
    return (
      <div className="page">
        <h1>학습</h1>
        <p className="page-placeholder">아직 준비된 학습 콘텐츠가 없습니다.</p>
      </div>
    )
  }

  if (phase === 'studying') {
    const kanji = batch[cardIndex]
    const content = studyContentByKanjiId[kanji.id]
    const radical = radicalList.find((r) => r.number === content.radicalNumber)
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
              <span className={`study-level-badge study-level-badge-${kanji.level.toLowerCase()}`}>{kanji.level}</span>
              {radical && (
                <span className="study-radical-chip">
                  부수 {radical.radical} · {radical.strokeCount}획
                </span>
              )}
            </div>
            <div className="study-kanji">{kanji.kanji}</div>
            <dl className="study-fields study-fields-core">
              <div className="study-field">
                <dt>한국 훈음</dt>
                <dd>{kanji.kunKr}</dd>
              </div>
              <div className="study-field">
                <dt>일본 훈독</dt>
                <dd>{kanji.kunJp}</dd>
              </div>
              <div className="study-field">
                <dt>일본 음독</dt>
                <dd>{kanji.onJp}</dd>
              </div>
            </dl>
            <dl className="study-fields study-fields-sub">
              <div className="study-field">
                <dt>유래</dt>
                <dd>{content.etymology}</dd>
              </div>
              {kanji.exampleKanji && (
                <div className="study-field">
                  <dt>예문</dt>
                  <dd>
                    {kanji.exampleKanji}
                    {kanji.exampleJp && (
                      <>
                        (<span className="study-example-reading">{kanji.exampleJp}</span>)
                      </>
                    )}
                    {kanji.exampleKr && ` · ${kanji.exampleKr}`}
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
        <p className="page-placeholder">{batch.length}자를 학습했습니다. 방금 배운 한자로 퀴즈를 풀어볼까요?</p>
        <div className="study-done-actions">
          <button
            type="button"
            ref={donePrimaryButtonRef}
            className="study-nav-primary"
            onClick={() => onStartQuiz(kanjiIdsQuizConfig(batch.map((k) => k.id)))}
          >
            퀴즈 풀기
          </button>
          <button type="button" onClick={() => setPhase('setup')}>
            나중에
          </button>
        </div>
      </div>
    )
  }

  const isLevelFinished = pool.length > 0 && remaining <= 0

  return (
    <div className="page study-setup">
      <h1>학습</h1>

      {availableLevels.length > 1 && (
        <div className="study-level-picker">
          {availableLevels.map((l) => (
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
      )}

      <p className="study-progress-summary">
        {level} · {completedCount} / {pool.length}자 학습함
      </p>

      {isLevelFinished ? (
        <>
          <p className="page-placeholder">이 급수를 모두 학습했습니다.</p>
          <button type="button" className="study-start-button" onClick={restartBatch}>
            처음부터 다시 학습하기
          </button>
        </>
      ) : (
        <>
          <button type="button" className="study-start-button" onClick={startBatch}>
            {completedCount > 0 ? '이어하기' : '시작하기'}
          </button>
        </>
      )}
    </div>
  )
}
