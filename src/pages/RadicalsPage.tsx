import { useEffect, useMemo, useState } from 'react'
import { radicalList, type Radical } from '../data/radicals'
import './RadicalsPage.css'
import './StudyPage.css'

export default function RadicalsPage() {
  const sortedRadicals = useMemo(() => [...radicalList].sort((a, b) => a.number - b.number), [])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (selectedIndex === null) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        setSelectedIndex((i) => (i !== null && i + 1 < sortedRadicals.length ? i + 1 : i))
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i))
      } else if (e.key === 'Escape') {
        setSelectedIndex(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, sortedRadicals.length])

  if (selectedIndex !== null) {
    const radical = sortedRadicals[selectedIndex]

    return (
      <div className="page study-page">
        <div className="study-content">
          <div className="study-topbar">
            <button type="button" className="study-exit-button" onClick={() => setSelectedIndex(null)}>
              ← 목록으로
            </button>
            <div className="quiz-progress">
              {selectedIndex + 1} / {sortedRadicals.length}
            </div>
          </div>
          <div className="study-card">
            <div className="study-top">
              <span className={`study-level-badge study-level-badge-${radical.level.toLowerCase()}`}>{radical.level}</span>
              <span className="study-radical-chip">
                제{radical.number}부수 · {radical.strokeCount}획
              </span>
            </div>
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
            </dl>
          </div>
        </div>
        <div className="study-nav">
          <button
            type="button"
            onClick={() => setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
            disabled={selectedIndex === 0}
          >
            이전
          </button>
          <button
            type="button"
            className="study-nav-primary"
            onClick={() => setSelectedIndex((i) => (i !== null && i + 1 < sortedRadicals.length ? i + 1 : i))}
            disabled={selectedIndex === sortedRadicals.length - 1}
          >
            다음
          </button>
        </div>
        <p className="shortcut-hint">← → 로 이전/다음 · Esc로 목록으로</p>
      </div>
    )
  }

  const groups = new Map<number, Radical[]>()
  for (const r of sortedRadicals) {
    const list = groups.get(r.strokeCount) ?? []
    list.push(r)
    groups.set(r.strokeCount, list)
  }

  return (
    <div className="page">
      <h1>부수</h1>
      {[...groups.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([strokeCount, items]) => (
          <section key={strokeCount} className="radical-group">
            <h2>{strokeCount}획</h2>
            <div className="radical-grid">
              {items.map((r) => (
                <button
                  type="button"
                  className="radical-tile"
                  key={r.number}
                  onClick={() => setSelectedIndex(sortedRadicals.findIndex((x) => x.number === r.number))}
                >
                  <span className="radical-char">{r.radical}</span>
                  <span className="radical-label">{r.meaningKr}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
    </div>
  )
}
