import { useEffect } from 'react'
import { addWrongNotes } from '../lib/storage'
import type { AnsweredQuestion } from '../types'
import './ResultScreen.css'

interface Props {
  answers: AnsweredQuestion[]
  elapsedMs: number
  onRestart: () => void
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}분 ${seconds}초`
}

export default function ResultScreen({ answers, elapsedMs, onRestart }: Props) {
  const correctCount = answers.filter((a) => a.isCorrect).length
  const total = answers.length
  const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0

  useEffect(() => {
    const wrongIds = answers.filter((a) => !a.isCorrect).map((a) => a.kanji.id)
    addWrongNotes(wrongIds)
    // run once when results are shown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="result-screen">
      <h1>결과</h1>
      <p className="result-summary">
        {correctCount} / {total} 정답 ({rate}%) · 소요 시간 {formatElapsed(elapsedMs)}
      </p>

      <ul className="result-list">
        {answers.map((a, i) => (
          <li key={`${a.kanji.id}-${i}`} className={a.isCorrect ? 'correct' : 'incorrect'}>
            <span className="result-kanji">{a.kanji.kanji}</span>
            <span className="result-detail">
              정답: {a.kanji.kunKr}
              {!a.isCorrect && <> · 내 답: {a.userAnswer || '(미입력)'}</>}
            </span>
          </li>
        ))}
      </ul>

      <button type="button" className="restart-button" onClick={onRestart}>
        다시 설정하기
      </button>
    </div>
  )
}
