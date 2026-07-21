import { useEffect, useMemo, useState } from 'react'
import { kanjiList, type KanjiLevel } from '../data/kanji'
import { studyContentByKanjiId } from '../data/studyContent'
import { radicalList } from '../data/radicals'
import './StudyPage.css'

const ALL_LEVELS: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

export default function KanjiListPage() {
  // only kanji with study content have a detail card to show, same guard
  // the 학습 flow uses (src/pages/StudyPage.tsx)
  const sortedKanji = useMemo(
    () =>
      ALL_LEVELS.flatMap((level) =>
        kanjiList
          .filter((k) => k.level === level && studyContentByKanjiId[k.id])
          .sort((a, b) => a.num - b.num),
      ),
    [],
  )
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (selectedIndex === null) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        setSelectedIndex((i) => (i !== null && i + 1 < sortedKanji.length ? i + 1 : i))
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i))
      } else if (e.key === 'Escape') {
        setSelectedIndex(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, sortedKanji.length])

  if (selectedIndex !== null) {
    const kanji = sortedKanji[selectedIndex]
    const content = studyContentByKanjiId[kanji.id]
    const radical = radicalList.find((r) => r.number === content.radicalNumber)

    return (
      <div className="page study-page">
        <div className="study-content">
          <div className="study-topbar">
            <button type="button" className="study-exit-button" onClick={() => setSelectedIndex(null)}>
              ← 목록으로
            </button>
            <div className="quiz-progress">
              {selectedIndex + 1} / {sortedKanji.length}
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
            onClick={() => setSelectedIndex((i) => (i !== null && i + 1 < sortedKanji.length ? i + 1 : i))}
            disabled={selectedIndex === sortedKanji.length - 1}
          >
            다음
          </button>
        </div>
        <p className="shortcut-hint">← → 로 이전/다음 · Esc로 목록으로</p>
      </div>
    )
  }

  const normalizedQuery = query.trim().toLowerCase()
  const filteredKanji = normalizedQuery
    ? sortedKanji.filter(
        (k) =>
          k.kanji.includes(normalizedQuery) ||
          k.kunKr.toLowerCase().includes(normalizedQuery) ||
          k.kunJp.toLowerCase().includes(normalizedQuery) ||
          k.onJp.toLowerCase().includes(normalizedQuery),
      )
    : sortedKanji

  return (
    <div className="page">
      <h1>한자 전체보기</h1>
      <input
        type="text"
        className="browse-search-input"
        placeholder="한자, 훈음, 훈독, 음독으로 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {normalizedQuery && filteredKanji.length === 0 ? (
        <p className="page-placeholder">검색 결과가 없습니다.</p>
      ) : (
        <div className="browse-table-wrap">
          <table className="browse-table">
            <thead>
              <tr>
                <th>급수</th>
                <th>한자</th>
                <th>한국 훈음</th>
                <th>일본 훈독</th>
                <th>일본 음독</th>
              </tr>
            </thead>
            <tbody>
              {filteredKanji.map((k) => (
                <tr
                  key={k.id}
                  tabIndex={0}
                  className={`browse-table-row browse-table-row-${k.level.toLowerCase()}`}
                  onClick={() => setSelectedIndex(sortedKanji.findIndex((x) => x.id === k.id))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setSelectedIndex(sortedKanji.findIndex((x) => x.id === k.id))
                  }}
                >
                  <td>{k.level}</td>
                  <td className="browse-table-cell-main">{k.kanji}</td>
                  <td>{k.kunKr}</td>
                  <td>{k.kunJp}</td>
                  <td>{k.onJp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
