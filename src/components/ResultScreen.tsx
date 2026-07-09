import { useEffect, useRef } from 'react'
import { correctAnswerLabel } from '../lib/answerMatching'
import { addWrongNotes, recordSrsReview, removeWrongNote } from '../lib/storage'
import type { AnsweredQuestion, QuestionType } from '../types'
import './ResultScreen.css'

interface Props {
  answers: AnsweredQuestion[]
  elapsedMs: number
  questionType: QuestionType
  onRestart: () => void
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}분 ${seconds}초`
}

function exampleLabel(a: AnsweredQuestion): string | null {
  const { exampleKanji, exampleJp, exampleKr } = a.kanji
  if (!exampleKanji) return null
  return `${exampleKanji}${exampleJp ? `(${exampleJp})` : ''}${exampleKr ? ` · ${exampleKr}` : ''}`
}

export default function ResultScreen({ answers, elapsedMs, questionType, onRestart }: Props) {
  const correctCount = answers.filter((a) => a.isCorrect).length
  const total = answers.length
  const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0
  const restartButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const wrongIds = answers.filter((a) => !a.isCorrect).map((a) => a.kanji.id)
    addWrongNotes(wrongIds)
    // a kanji answered correctly this round is no longer a standing weak point
    answers.filter((a) => a.isCorrect).forEach((a) => removeWrongNote(a.kanji.id))
    answers.forEach((a) => recordSrsReview('kanji', a.kanji.id, a.isCorrect))
    // focus the restart button so Enter/Space works right away — the quiz's
    // last choice button was disabled/unmounted, so nothing carries focus over.
    // preventScroll: true because this button sits at the end of the answer
    // list, and a long list (20/30/50/all) would otherwise get scrolled past
    // the score summary right as the results screen appears.
    restartButtonRef.current?.focus({ preventScroll: true })
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
              <span className="result-detail-main">
                정답: {correctAnswerLabel(questionType, a.kanji)}
                {!a.isCorrect && <> · 내 답: {a.userAnswer || '(미입력)'}</>}
              </span>
              {!a.isCorrect && exampleLabel(a) && (
                <span className="result-example">예: {exampleLabel(a)}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <button type="button" ref={restartButtonRef} className="restart-button" onClick={onRestart}>
        다시 설정하기
      </button>
    </div>
  )
}
