import { useMemo, useState } from 'react'
import { kanjiList, type Kanji } from '../data/kanji'
import { wrongNoteQuizConfig } from '../lib/quizGenerator'
import { getWrongNotes, removeWrongNote } from '../lib/storage'
import type { QuizConfig } from '../types'
import './WrongNotePage.css'

interface Props {
  onStartQuiz: (config: QuizConfig) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export default function WrongNotePage({ onStartQuiz }: Props) {
  const [wrongNotes, setWrongNotes] = useState(() => getWrongNotes())

  const kanjiById = useMemo(() => new Map(kanjiList.map((k) => [k.id, k])), [])

  const entries = useMemo(
    () =>
      wrongNotes
        .map((note) => ({ note, kanji: kanjiById.get(note.kanjiId) }))
        .filter((e): e is { note: (typeof wrongNotes)[number]; kanji: Kanji } => e.kanji !== undefined)
        .sort((a, b) => b.note.wrongAt.localeCompare(a.note.wrongAt)),
    [wrongNotes, kanjiById],
  )

  function handleRemove(kanjiId: string) {
    removeWrongNote(kanjiId)
    setWrongNotes(getWrongNotes())
  }

  function handleRetry() {
    onStartQuiz(wrongNoteQuizConfig(entries.map((e) => e.kanji.id)))
  }

  if (entries.length === 0) {
    return (
      <div className="page">
        <h1>오답노트</h1>
        <p className="page-placeholder">아직 틀린 한자가 없습니다. 퀴즈를 풀면 여기에 쌓입니다.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>오답노트</h1>
        <button type="button" className="retry-button" onClick={handleRetry}>
          오답만 재도전 ({entries.length})
        </button>
      </div>

      <ul className="wrong-note-list">
        {entries.map(({ note, kanji }) => (
          <li key={kanji.id} className="wrong-note-item">
            <span className="wrong-note-kanji">{kanji.kanji}</span>
            <span className="wrong-note-detail">
              {kanji.level} · {kanji.kunKr}
            </span>
            <span className="wrong-note-date">{formatDate(note.wrongAt)}</span>
            <button
              type="button"
              className="wrong-note-remove"
              aria-label={`${kanji.kanji} 오답노트에서 제거`}
              onClick={() => handleRemove(kanji.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
