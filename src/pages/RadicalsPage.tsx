import { useEffect, useMemo, useRef, useState } from 'react'
import { radicalList, type Radical } from '../data/radicals'
import type { KanjiLevel } from '../data/kanji'
import {
  getRadicalStudyBatchSize,
  getRadicalStudyProgress,
  setRadicalStudyBatchSize,
  setRadicalStudyProgress,
} from '../lib/storage'
import './RadicalsPage.css'
import './StudyPage.css'

const ALL_LEVELS: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

function levelPool(level: KanjiLevel): Radical[] {
  return radicalList.filter((r) => r.level === level).sort((a, b) => a.number - b.number)
}

type Phase = 'setup' | 'studying' | 'done' | 'browse'

export default function RadicalsPage() {
  const [level, setLevel] = useState<KanjiLevel>(ALL_LEVELS[0])
  const pool = useMemo(() => levelPool(level), [level])
  const completedCount = Math.min(getRadicalStudyProgress(level), pool.length)
  const remaining = pool.length - completedCount

  const [batchSizeInput, setBatchSizeInput] = useState(() => getRadicalStudyBatchSize())
  const [phase, setPhase] = useState<Phase>('setup')
  const [batch, setBatch] = useState<Radical[]>([])
  const [cardIndex, setCardIndex] = useState(0)
  const donePrimaryButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (phase === 'done') donePrimaryButtonRef.current?.focus()
  }, [phase])

  function startBatch(fromLevel: KanjiLevel, fromCompleted: number) {
    const fromPool = levelPool(fromLevel)
    const size = Math.max(1, Math.min(batchSizeInput || 1, fromPool.length - fromCompleted))
    setRadicalStudyBatchSize(size)
    setBatch(fromPool.slice(fromCompleted, fromCompleted + size))
    setCardIndex(0)
    setPhase('studying')
  }

  function finishBatch() {
    const newCompleted = completedCount + batch.length
    setRadicalStudyProgress(level, newCompleted)
    setPhase('done')
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

  if (phase === 'browse') {
    const groups = new Map<number, Radical[]>()
    for (const r of radicalList) {
      const list = groups.get(r.strokeCount) ?? []
      list.push(r)
      groups.set(r.strokeCount, list)
    }
    return (
      <div className="page">
        <div className="page-header">
          <h1>부수 전체 목록</h1>
          <button type="button" onClick={() => setPhase('setup')}>
            ← 학습으로
          </button>
        </div>
        {[...groups.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([strokeCount, items]) => (
            <section key={strokeCount} className="radical-group">
              <h2>{strokeCount}획</h2>
              <div className="radical-grid">
                {items.map((r) => (
                  <div className="radical-tile" key={r.number}>
                    <span className="radical-char">{r.radical}</span>
                    <span className="radical-label">{r.meaningKr}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
      </div>
    )
  }

  if (phase === 'studying') {
    const radical = batch[cardIndex]
    const isLast = cardIndex + 1 === batch.length

    return (
      <div className="page study-page">
        <div className="quiz-progress">
          {cardIndex + 1} / {batch.length}
        </div>
        <div className="study-card">
          <div className="study-kanji">{radical.radical}</div>
          <dl className="study-fields">
            <div className="study-field">
              <dt>훈음</dt>
              <dd>{radical.meaningKr}</dd>
            </div>
            <div className="study-field">
              <dt>영문 뜻</dt>
              <dd>{radical.meaningEn}</dd>
            </div>
            <div className="study-field">
              <dt>획수</dt>
              <dd>{radical.strokeCount}획</dd>
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
    // completedCount is re-read from storage on every render, so by now it
    // already reflects finishBatch()'s write — no need to add batch.length again
    const hasMore = completedCount < pool.length

    return (
      <div className="page">
        <h1>수고했어요!</h1>
        <p className="page-placeholder">부수 {batch.length}개를 학습했습니다.</p>
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

  const isLevelFinished = pool.length > 0 && remaining <= 0

  return (
    <div className="page study-setup">
      <div className="page-header">
        <h1>부수</h1>
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
        {level} · {completedCount} / {pool.length}개 학습함
      </p>

      {isLevelFinished ? (
        <p className="page-placeholder">이 급수 부수를 모두 학습했습니다.</p>
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
    </div>
  )
}
