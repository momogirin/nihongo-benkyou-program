import { useMemo } from 'react'
import { kanjiList } from '../data/kanji'
import { kanjiIdsQuizConfig } from '../lib/quizGenerator'
import { getLastQuizConfig, getWrongNotes } from '../lib/storage'
import type { QuizConfig } from '../types'
import './HomePage.css'

interface Props {
  onStartQuiz: (config: QuizConfig) => void
}

function levelLabel(levels: QuizConfig['levels']): string {
  return levels.length === 5 ? '전체 급수' : levels.join('·')
}

function countLabel(count: QuizConfig['count']): string {
  return count === 'all' ? '전체' : `${count}문항`
}

export default function HomePage({ onStartQuiz }: Props) {
  const lastConfig = useMemo(() => getLastQuizConfig(), [])

  const wrongNoteIds = useMemo(() => {
    const validIds = new Set(kanjiList.map((k) => k.id))
    return getWrongNotes()
      .map((n) => n.kanjiId)
      .filter((id) => validIds.has(id))
  }, [])

  if (!lastConfig && wrongNoteIds.length === 0) {
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
      <div className="home-entry-grid">
        {lastConfig && (
          <button type="button" className="home-entry-card" onClick={() => onStartQuiz(lastConfig)}>
            <span className="home-entry-title">이어하기</span>
            <span className="home-entry-detail">
              {levelLabel(lastConfig.levels)} · {countLabel(lastConfig.count)}
            </span>
          </button>
        )}
        {wrongNoteIds.length > 0 && (
          <button
            type="button"
            className="home-entry-card"
            onClick={() => onStartQuiz(kanjiIdsQuizConfig(wrongNoteIds))}
          >
            <span className="home-entry-title">오답 재도전</span>
            <span className="home-entry-detail">{wrongNoteIds.length}자</span>
          </button>
        )}
      </div>
    </div>
  )
}
