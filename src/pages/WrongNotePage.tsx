import { useEffect, useMemo, useState } from 'react'
import { kanjiList, type Kanji } from '../data/kanji'
import { vocabList, type VocabWord } from '../data/vocab'
import { grammarList, type GrammarPoint } from '../data/grammar'
import { studyContentByKanjiId } from '../data/studyContent'
import { radicalList } from '../data/radicals'
import { usedKanji } from '../lib/kanjiUsage'
import { kanjiIdsQuizConfig } from '../lib/quizGenerator'
import {
  getGrammarWrongNotes,
  getVocabWrongNotes,
  getWrongNotes,
  removeGrammarWrongNote,
  removeVocabWrongNote,
  removeWrongNote,
  type GrammarWrongNoteEntry,
  type VocabWrongNoteEntry,
  type WrongNoteEntry,
} from '../lib/storage'
import type { QuizConfig } from '../types'
import './StudyPage.css'
import './VocabPage.css'
import './GrammarPage.css'
import './WrongNotePage.css'

interface Props {
  onStartQuiz: (config: QuizConfig) => void
  onRetryVocab: (ids: string[]) => void
  onRetryGrammar: (ids: string[]) => void
}

type DetailTarget =
  | { kind: 'kanji'; kanji: Kanji }
  | { kind: 'vocab'; word: VocabWord }
  | { kind: 'grammar'; point: GrammarPoint }

interface Session<TNote, TItem> {
  wrongAt: string
  source?: string
  items: { note: TNote; item: TItem }[]
}

// yyyy-MM-dd HH:mm:ss — 오답노트는 "언제 무슨 시험을 틀렸는지"가 핵심이라 초 단위까지 보여준다
function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// wrongAt은 addWrongNotes 계열 함수가 한 번의 퀴즈 결과 처리마다 한 번씩만
// 생성하므로, 같은 wrongAt을 가진 항목들은 곧 같은 퀴즈 회차(세션)에서 틀린 것이다
function groupBySession<TNote extends { wrongAt: string; source?: string }, TItem>(
  entries: { note: TNote; item: TItem }[],
): Session<TNote, TItem>[] {
  const map = new Map<string, Session<TNote, TItem>>()
  for (const entry of entries) {
    const existing = map.get(entry.note.wrongAt)
    if (existing) existing.items.push(entry)
    else map.set(entry.note.wrongAt, { wrongAt: entry.note.wrongAt, source: entry.note.source, items: [entry] })
  }
  return [...map.values()].sort((a, b) => b.wrongAt.localeCompare(a.wrongAt))
}

export default function WrongNotePage({ onStartQuiz, onRetryVocab, onRetryGrammar }: Props) {
  const [wrongNotes, setWrongNotes] = useState(() => getWrongNotes())
  const [vocabWrongNotes, setVocabWrongNotes] = useState(() => getVocabWrongNotes())
  const [grammarWrongNotes, setGrammarWrongNotes] = useState(() => getGrammarWrongNotes())
  const [detail, setDetail] = useState<DetailTarget | null>(null)

  const kanjiById = useMemo(() => new Map(kanjiList.map((k) => [k.id, k])), [])
  const vocabById = useMemo(() => new Map(vocabList.map((w) => [w.id, w])), [])
  const grammarById = useMemo(() => new Map(grammarList.map((g) => [g.id, g])), [])

  useEffect(() => {
    if (!detail) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDetail(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [detail])

  const kanjiSessions = useMemo(
    () =>
      groupBySession<WrongNoteEntry, Kanji>(
        wrongNotes
          .map((note) => ({ note, item: kanjiById.get(note.kanjiId) }))
          .filter((e): e is { note: WrongNoteEntry; item: Kanji } => e.item !== undefined),
      ),
    [wrongNotes, kanjiById],
  )

  const vocabSessions = useMemo(
    () =>
      groupBySession<VocabWrongNoteEntry, VocabWord>(
        vocabWrongNotes
          .map((note) => ({ note, item: vocabById.get(note.vocabId) }))
          .filter((e): e is { note: VocabWrongNoteEntry; item: VocabWord } => e.item !== undefined),
      ),
    [vocabWrongNotes, vocabById],
  )

  const grammarSessions = useMemo(
    () =>
      groupBySession<GrammarWrongNoteEntry, GrammarPoint>(
        grammarWrongNotes
          .map((note) => ({ note, item: grammarById.get(note.grammarId) }))
          .filter((e): e is { note: GrammarWrongNoteEntry; item: GrammarPoint } => e.item !== undefined),
      ),
    [grammarWrongNotes, grammarById],
  )

  const kanjiIds = useMemo(() => kanjiSessions.flatMap((s) => s.items.map(({ item }) => item.id)), [kanjiSessions])
  const vocabIds = useMemo(() => vocabSessions.flatMap((s) => s.items.map(({ item }) => item.id)), [vocabSessions])
  const grammarIds = useMemo(
    () => grammarSessions.flatMap((s) => s.items.map(({ item }) => item.id)),
    [grammarSessions],
  )

  const kanjiCount = kanjiIds.length
  const vocabCount = vocabIds.length
  const grammarCount = grammarIds.length

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
    onStartQuiz(kanjiIdsQuizConfig(kanjiIds))
  }

  if (kanjiCount === 0 && vocabCount === 0 && grammarCount === 0) {
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

      {kanjiSessions.length > 0 && (
        <section className="wrong-note-section">
          <div className="page-header">
            <h2>한자</h2>
            <button type="button" className="retry-button" onClick={handleRetryKanji}>
              오답만 재도전 ({kanjiCount})
            </button>
          </div>
          {kanjiSessions.map((session) => (
            <div className="wrong-note-session" key={`kanji-${session.wrongAt}`}>
              <div className="wrong-note-session-header">
                <span className="wrong-note-session-time">{formatDateTime(session.wrongAt)}</span>
                <span className="wrong-note-session-source">{session.source ?? '기록 없음'}</span>
              </div>
              <ul className="wrong-note-list">
                {session.items.map(({ note, item: kanji }) => (
                  <li key={kanji.id} className={`wrong-note-item wrong-note-item-${kanji.level.toLowerCase()}`}>
                    <button
                      type="button"
                      className="wrong-note-item-main"
                      onClick={() => setDetail({ kind: 'kanji', kanji })}
                    >
                      <span className="wrong-note-kanji">{kanji.kanji}</span>
                      <span className="wrong-note-detail">
                        {kanji.level} · {kanji.kunKr}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="wrong-note-remove"
                      aria-label={`${kanji.kanji} 오답노트에서 제거`}
                      onClick={() => handleRemoveKanji(note.kanjiId)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {vocabSessions.length > 0 && (
        <section className="wrong-note-section">
          <div className="page-header">
            <h2>단어</h2>
            <button type="button" className="retry-button" onClick={() => onRetryVocab(vocabIds)}>
              오답만 재도전 ({vocabCount})
            </button>
          </div>
          {vocabSessions.map((session) => (
            <div className="wrong-note-session" key={`vocab-${session.wrongAt}`}>
              <div className="wrong-note-session-header">
                <span className="wrong-note-session-time">{formatDateTime(session.wrongAt)}</span>
                <span className="wrong-note-session-source">{session.source ?? '기록 없음'}</span>
              </div>
              <ul className="wrong-note-list">
                {session.items.map(({ note, item: word }) => (
                  <li key={word.id} className={`wrong-note-item wrong-note-item-${word.level.toLowerCase()}`}>
                    <button
                      type="button"
                      className="wrong-note-item-main"
                      onClick={() => setDetail({ kind: 'vocab', word })}
                    >
                      <span className="wrong-note-word">{word.word}</span>
                      <span className="wrong-note-detail">
                        {word.level} · {word.reading} · {word.meaningKr}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="wrong-note-remove"
                      aria-label={`${word.word} 오답노트에서 제거`}
                      onClick={() => handleRemoveVocab(note.vocabId)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {grammarSessions.length > 0 && (
        <section className="wrong-note-section">
          <div className="page-header">
            <h2>문법</h2>
            <button type="button" className="retry-button" onClick={() => onRetryGrammar(grammarIds)}>
              오답만 재도전 ({grammarCount})
            </button>
          </div>
          {grammarSessions.map((session) => (
            <div className="wrong-note-session" key={`grammar-${session.wrongAt}`}>
              <div className="wrong-note-session-header">
                <span className="wrong-note-session-time">{formatDateTime(session.wrongAt)}</span>
                <span className="wrong-note-session-source">{session.source ?? '기록 없음'}</span>
              </div>
              <ul className="wrong-note-list">
                {session.items.map(({ note, item: point }) => (
                  <li key={point.id} className={`wrong-note-item wrong-note-item-${point.level.toLowerCase()}`}>
                    <button
                      type="button"
                      className="wrong-note-item-main"
                      onClick={() => setDetail({ kind: 'grammar', point })}
                    >
                      <span className="wrong-note-pattern">{point.pattern}</span>
                      <span className="wrong-note-detail">
                        {point.level} · {point.meaningKr}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="wrong-note-remove"
                      aria-label={`${point.pattern} 오답노트에서 제거`}
                      onClick={() => handleRemoveGrammar(note.grammarId)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {detail && (
        <div className="wrong-note-modal-backdrop" onClick={() => setDetail(null)}>
          <div className="wrong-note-modal" onClick={(e) => e.stopPropagation()}>
            <div className="study-topbar">
              <button type="button" className="study-exit-button" onClick={() => setDetail(null)}>
                ✕ 닫기
              </button>
            </div>

            {detail.kind === 'kanji' && <KanjiDetailCard kanji={detail.kanji} />}
            {detail.kind === 'vocab' && <VocabDetailCard word={detail.word} />}
            {detail.kind === 'grammar' && <GrammarDetailCard point={detail.point} />}
          </div>
        </div>
      )}
    </div>
  )
}

function KanjiDetailCard({ kanji }: { kanji: Kanji }) {
  const content = studyContentByKanjiId[kanji.id]
  const radical = content ? radicalList.find((r) => r.number === content.radicalNumber) : undefined

  return (
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
      <dl className={`study-fields ${content ? 'study-fields-core' : ''}`}>
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
      {content && (
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
      )}
    </div>
  )
}

function VocabDetailCard({ word }: { word: VocabWord }) {
  return (
    <div className="study-card">
      <div className="study-top">
        <span className={`study-level-badge study-level-badge-${word.level.toLowerCase()}`}>{word.level}</span>
      </div>
      <div className="vocab-word-jp">{word.word}</div>
      <div className="vocab-word-reading">{word.reading}</div>
      <dl className="study-fields">
        <div className="study-field">
          <dt>뜻</dt>
          <dd>{word.meaningKr}</dd>
        </div>
        <div className="study-field">
          <dt>영문 뜻</dt>
          <dd>{word.meaningEn}</dd>
        </div>
        {word.exampleJp && (
          <div className="study-field">
            <dt>예문</dt>
            <dd>
              {word.exampleJp}
              <br />
              <span className="vocab-example-kr">{word.exampleKr}</span>
            </dd>
          </div>
        )}
        {usedKanji(word.word).length > 0 && (
          <div className="study-field">
            <dt>한자</dt>
            <dd>
              <div className="study-used-kanji">
                {usedKanji(word.word).map((k) => (
                  <span key={k.id} className="study-used-kanji-chip">
                    <span className="study-used-kanji-char">{k.kanji}</span>
                    <span className="study-used-kanji-info">
                      {k.level} · {k.kunKr}
                    </span>
                  </span>
                ))}
              </div>
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}

function GrammarDetailCard({ point }: { point: GrammarPoint }) {
  return (
    <div className="study-card">
      <div className="study-top">
        <span className={`study-level-badge study-level-badge-${point.level.toLowerCase()}`}>{point.level}</span>
      </div>
      <div className="grammar-pattern-label">문형</div>
      <div className="grammar-pattern">{point.pattern}</div>
      <dl className="study-fields">
        <div className="study-field">
          <dt>뜻</dt>
          <dd>{point.meaningKr}</dd>
        </div>
        <div className="study-field">
          <dt>영문 뜻</dt>
          <dd>{point.meaningEn}</dd>
        </div>
        <div className="study-field">
          <dt>설명</dt>
          <dd>{point.explanation}</dd>
        </div>
        <div className="study-field">
          <dt>예문</dt>
          <dd>
            {point.exampleJp}
            <br />
            <span className="grammar-example-kr">{point.exampleKr}</span>
          </dd>
        </div>
        {usedKanji(point.exampleJp).length > 0 && (
          <div className="study-field">
            <dt>예문 한자</dt>
            <dd>
              <div className="study-used-kanji">
                {usedKanji(point.exampleJp).map((k) => (
                  <span key={k.id} className="study-used-kanji-chip">
                    <span className="study-used-kanji-char">{k.kanji}</span>
                    <span className="study-used-kanji-info">
                      {k.level} · {k.kunKr}
                    </span>
                  </span>
                ))}
              </div>
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
