import { useMemo } from 'react'
import { kanjiList } from '../data/kanji'
import { kanjiIdsQuizConfig } from '../lib/quizGenerator'
import { getQuizHistory, getWrongNotes } from '../lib/storage'
import type { QuizConfig } from '../types'
import './HomePage.css'

interface Props {
  onStartQuiz: (config: QuizConfig) => void
}

// 오답 재도전/학습 배치/기록 재시도는 전부 levels 없이 kanjiIds로 직접 지정하니,
// 이 경우엔 급수 대신 글자 수를 보여준다
function configSummary(config: QuizConfig): string {
  if (config.kanjiIds) return `한자 ${config.kanjiIds.length}자`
  return config.levels.length === 5 ? '전체 급수' : config.levels.join('·')
}

function countLabel(count: QuizConfig['count']): string {
  return count === 'all' ? '전체' : `${count}문항`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HomePage({ onStartQuiz }: Props) {
  const history = useMemo(() => getQuizHistory(), [])

  const wrongNoteIds = useMemo(() => {
    const validIds = new Set(kanjiList.map((k) => k.id))
    return getWrongNotes()
      .map((n) => n.kanjiId)
      .filter((id) => validIds.has(id))
  }, [])

  if (history.length === 0 && wrongNoteIds.length === 0) {
    return (
      <div className="page">
        <h1>홈</h1>
        <p className="page-placeholder">사이드바의 '퀴즈'에서 학습을 시작하세요.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>홈</h1>

      {wrongNoteIds.length > 0 && (
        <div className="home-entry-grid">
          <button
            type="button"
            className="home-entry-card"
            onClick={() => onStartQuiz(kanjiIdsQuizConfig(wrongNoteIds))}
          >
            <span className="home-entry-title">오답 재도전</span>
            <span className="home-entry-detail">{wrongNoteIds.length}자</span>
          </button>
        </div>
      )}

      {history.length > 0 && (
        <section className="home-history">
          <h2 className="home-history-title">최근 기록</h2>
          <ul className="home-history-list">
            {history.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="home-history-item"
                  onClick={() => onStartQuiz(entry.config)}
                >
                  <span className="home-history-main">
                    <span className="home-history-summary">
                      {configSummary(entry.config)} · {countLabel(entry.config.count)}
                    </span>
                    <span className="home-history-date">{formatDate(entry.finishedAt)}</span>
                  </span>
                  <span className="home-history-score">
                    {entry.correct}/{entry.total}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
