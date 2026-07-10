import { useMemo, useState } from 'react'
import { kanjiList, type Kanji } from '../data/kanji'
import { vocabList, type VocabWord } from '../data/vocab'
import { grammarList, type GrammarPoint } from '../data/grammar'
import { kanjiIdsQuizConfig } from '../lib/quizGenerator'
import {
  getGrammarWrongNotes,
  getVocabWrongNotes,
  getWrongNotes,
  removeGrammarWrongNote,
  removeVocabWrongNote,
  removeWrongNote,
} from '../lib/storage'
import type { QuizConfig } from '../types'
import './WrongNotePage.css'

interface Props {
  onStartQuiz: (config: QuizConfig) => void
  onRetryVocab: (ids: string[]) => void
  onRetryGrammar: (ids: string[]) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export default function WrongNotePage({ onStartQuiz, onRetryVocab, onRetryGrammar }: Props) {
  const [wrongNotes, setWrongNotes] = useState(() => getWrongNotes())
  const [vocabWrongNotes, setVocabWrongNotes] = useState(() => getVocabWrongNotes())
  const [grammarWrongNotes, setGrammarWrongNotes] = useState(() => getGrammarWrongNotes())

  const kanjiById = useMemo(() => new Map(kanjiList.map((k) => [k.id, k])), [])
  const vocabById = useMemo(() => new Map(vocabList.map((w) => [w.id, w])), [])
  const grammarById = useMemo(() => new Map(grammarList.map((g) => [g.id, g])), [])

  const kanjiEntries = useMemo(
    () =>
      wrongNotes
        .map((note) => ({ note, kanji: kanjiById.get(note.kanjiId) }))
        .filter((e): e is { note: (typeof wrongNotes)[number]; kanji: Kanji } => e.kanji !== undefined)
        .sort((a, b) => b.note.wrongAt.localeCompare(a.note.wrongAt)),
    [wrongNotes, kanjiById],
  )

  const vocabEntries = useMemo(
    () =>
      vocabWrongNotes
        .map((note) => ({ note, word: vocabById.get(note.vocabId) }))
        .filter((e): e is { note: (typeof vocabWrongNotes)[number]; word: VocabWord } => e.word !== undefined)
        .sort((a, b) => b.note.wrongAt.localeCompare(a.note.wrongAt)),
    [vocabWrongNotes, vocabById],
  )

  const grammarEntries = useMemo(
    () =>
      grammarWrongNotes
        .map((note) => ({ note, point: grammarById.get(note.grammarId) }))
        .filter((e): e is { note: (typeof grammarWrongNotes)[number]; point: GrammarPoint } => e.point !== undefined)
        .sort((a, b) => b.note.wrongAt.localeCompare(a.note.wrongAt)),
    [grammarWrongNotes, grammarById],
  )

  function handleRemoveKanji(kanjiId: string) {
    removeWrongNote(kanjiId)
    setWrongNotes(getWrongNotes())
  }

  function handleRemoveVocab(vocabId: string) {
    removeVocabWrongNote(vocabId)
    setVocabWrongNotes(getVocabWrongNotes())
  }

  function handleRemoveGrammar(grammarId: string) {
    removeGrammarWrongNote(grammarId)
    setGrammarWrongNotes(getGrammarWrongNotes())
  }

  function handleRetryKanji() {
    onStartQuiz(kanjiIdsQuizConfig(kanjiEntries.map((e) => e.kanji.id)))
  }

  if (kanjiEntries.length === 0 && vocabEntries.length === 0 && grammarEntries.length === 0) {
    return (
      <div className="page">
        <h1>오답노트</h1>
        <p className="page-placeholder">아직 틀린 문제가 없습니다. 퀴즈를 풀면 여기에 쌓입니다.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>오답노트</h1>

      {kanjiEntries.length > 0 && (
        <section className="wrong-note-section">
          <div className="page-header">
            <h2>한자</h2>
            <button type="button" className="retry-button" onClick={handleRetryKanji}>
              오답만 재도전 ({kanjiEntries.length})
            </button>
          </div>
          <ul className="wrong-note-list">
            {kanjiEntries.map(({ note, kanji }) => (
              <li key={kanji.id} className={`wrong-note-item wrong-note-item-${kanji.level.toLowerCase()}`}>
                <span className="wrong-note-kanji">{kanji.kanji}</span>
                <span className="wrong-note-detail">
                  {kanji.level} · {kanji.kunKr}
                </span>
                <span className="wrong-note-date">{formatDate(note.wrongAt)}</span>
                <button
                  type="button"
                  className="wrong-note-remove"
                  aria-label={`${kanji.kanji} 오답노트에서 제거`}
                  onClick={() => handleRemoveKanji(kanji.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {vocabEntries.length > 0 && (
        <section className="wrong-note-section">
          <div className="page-header">
            <h2>단어</h2>
            <button
              type="button"
              className="retry-button"
              onClick={() => onRetryVocab(vocabEntries.map((e) => e.word.id))}
            >
              오답만 재도전 ({vocabEntries.length})
            </button>
          </div>
          <ul className="wrong-note-list">
            {vocabEntries.map(({ note, word }) => (
              <li key={word.id} className={`wrong-note-item wrong-note-item-${word.level.toLowerCase()}`}>
                <span className="wrong-note-word">{word.word}</span>
                <span className="wrong-note-detail">
                  {word.level} · {word.reading} · {word.meaningKr}
                </span>
                <span className="wrong-note-date">{formatDate(note.wrongAt)}</span>
                <button
                  type="button"
                  className="wrong-note-remove"
                  aria-label={`${word.word} 오답노트에서 제거`}
                  onClick={() => handleRemoveVocab(word.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {grammarEntries.length > 0 && (
        <section className="wrong-note-section">
          <div className="page-header">
            <h2>문법</h2>
            <button
              type="button"
              className="retry-button"
              onClick={() => onRetryGrammar(grammarEntries.map((e) => e.point.id))}
            >
              오답만 재도전 ({grammarEntries.length})
            </button>
          </div>
          <ul className="wrong-note-list">
            {grammarEntries.map(({ note, point }) => (
              <li key={point.id} className={`wrong-note-item wrong-note-item-${point.level.toLowerCase()}`}>
                <span className="wrong-note-pattern">{point.pattern}</span>
                <span className="wrong-note-detail">
                  {point.level} · {point.meaningKr}
                </span>
                <span className="wrong-note-date">{formatDate(note.wrongAt)}</span>
                <button
                  type="button"
                  className="wrong-note-remove"
                  aria-label={`${point.pattern} 오답노트에서 제거`}
                  onClick={() => handleRemoveGrammar(point.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
