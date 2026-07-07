import { useMemo } from 'react'
import { radicalList } from '../data/radicals'
import './RadicalsPage.css'

export default function RadicalsPage() {
  const groups = useMemo(() => {
    const byStroke = new Map<number, typeof radicalList>()
    for (const r of radicalList) {
      const list = byStroke.get(r.strokeCount) ?? []
      list.push(r)
      byStroke.set(r.strokeCount, list)
    }
    return [...byStroke.entries()].sort((a, b) => a[0] - b[0])
  }, [])

  return (
    <div className="page">
      <h1>부수</h1>
      <p className="page-placeholder">강희부수 214개를 획수 순으로 정리했습니다.</p>

      {groups.map(([strokeCount, items]) => (
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
