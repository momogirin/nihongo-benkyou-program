import { useEffect, useMemo, useState } from 'react'
import { kanjiList, type Kanji, type KanjiLevel } from '../data/kanji'
import { studyContentByKanjiId } from '../data/studyContent'
import { radicalList } from '../data/radicals'
import './RadicalsPage.css'
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
              <span className="study-level-badge">{kanji.level}</span>
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
      </div>
    )
  }

  const groups = new Map<KanjiLevel, Kanji[]>()
  for (const k of sortedKanji) {
    const list = groups.get(k.level) ?? []
    list.push(k)
    groups.set(k.level, list)
  }

  return (
    <div className="page">
      <h1>한자 전체보기</h1>
      {ALL_LEVELS.filter((level) => groups.has(level)).map((level) => (
        <section key={level} className="radical-group">
          <h2>{level}</h2>
          <div className="radical-grid">
            {(groups.get(level) ?? []).map((k) => (
              <button
                type="button"
                className="radical-tile"
                key={k.id}
                onClick={() => setSelectedIndex(sortedKanji.findIndex((x) => x.id === k.id))}
              >
                <span className="radical-char">{k.kanji}</span>
                <span className="radical-label">{k.kunKr}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
