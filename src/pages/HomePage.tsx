import { useMemo } from 'react'
import { kanjiList } from '../data/kanji'
import { vocabList } from '../data/vocab'
import { grammarList } from '../data/grammar'
import { kanjiIdsQuizConfig } from '../lib/quizGenerator'
import {
  getGrammarQuizHistory,
  getGrammarWrongNotes,
  getInProgressQuiz,
  getQuizHistory,
  getVocabQuizHistory,
  getVocabWrongNotes,
  getWrongNotes,
} from '../lib/storage'
import {
  getGrammarStudyProgressSummary,
  getStudyProgressSummary,
  getVocabStudyProgressSummary,
} from '../lib/studyProgress'
import type { QuizConfig } from '../types'
import './HomePage.css'

interface Props {
  onStartQuiz: (config: QuizConfig) => void
  onResumeQuiz: () => void
  onGoToStudy: () => void
  onGoToVocab: () => void
  onGoToGrammar: () => void
  onRetryVocab: (ids: string[]) => void
  onRetryGrammar: (ids: string[]) => void
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

export default function HomePage({
  onStartQuiz,
  onResumeQuiz,
  onGoToStudy,
  onGoToVocab,
  onGoToGrammar,
  onRetryVocab,
  onRetryGrammar,
}: Props) {
  const history = useMemo(() => getQuizHistory(), [])
  const vocabHistory = useMemo(() => getVocabQuizHistory(), [])
  const grammarHistory = useMemo(() => getGrammarQuizHistory(), [])

  // merge all three domains' quiz history into one chronological feed —
  // vocab/grammar entries don't carry a replayable config like kanji's, so
  // clicking one just navigates to that domain's page instead of an exact re-run
  const mergedHistory = useMemo(() => {
    const kanjiItems = history.map((e) => ({
      id: e.id,
      finishedAt: e.finishedAt,
      correct: e.correct,
      total: e.total,
      label: `${configSummary(e.config)} · ${countLabel(e.config.count)}`,
      onClick: () => onStartQuiz(e.config),
    }))
    const vocabItems = vocabHistory.map((e) => ({
      id: e.id,
      finishedAt: e.finishedAt,
      correct: e.correct,
      total: e.total,
      label: `단어 ${e.level} · ${e.total}문항`,
      onClick: onGoToVocab,
    }))
    const grammarItems = grammarHistory.map((e) => ({
      id: e.id,
      finishedAt: e.finishedAt,
      correct: e.correct,
      total: e.total,
      label: `문법 ${e.level} · ${e.total}문항`,
      onClick: onGoToGrammar,
    }))
    return [...kanjiItems, ...vocabItems, ...grammarItems]
      .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
      .slice(0, 20)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, vocabHistory, grammarHistory])

  const inProgress = useMemo(() => getInProgressQuiz(), [])
  const studyProgress = useMemo(() => getStudyProgressSummary(), [])
  const vocabStudyProgress = useMemo(() => getVocabStudyProgressSummary(), [])
  const grammarStudyProgress = useMemo(() => getGrammarStudyProgressSummary(), [])

  const wrongNoteIds = useMemo(() => {
    const validIds = new Set(kanjiList.map((k) => k.id))
    return getWrongNotes()
      .map((n) => n.kanjiId)
      .filter((id) => validIds.has(id))
  }, [])

  const vocabWrongIds = useMemo(() => {
    const validIds = new Set(vocabList.map((w) => w.id))
    return getVocabWrongNotes()
      .map((n) => n.vocabId)
      .filter((id) => validIds.has(id))
  }, [])

  const grammarWrongIds = useMemo(() => {
    const validIds = new Set(grammarList.map((g) => g.id))
    return getGrammarWrongNotes()
      .map((n) => n.grammarId)
      .filter((id) => validIds.has(id))
  }, [])

  const hasAnyEntry =
    studyProgress ||
    vocabStudyProgress ||
    grammarStudyProgress ||
    inProgress ||
    wrongNoteIds.length > 0 ||
    vocabWrongIds.length > 0 ||
    grammarWrongIds.length > 0
  if (!hasAnyEntry && mergedHistory.length === 0) {
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

      {hasAnyEntry && (
        <div className="home-entry-grid">
          {studyProgress && (
            <button type="button" className="home-entry-card" onClick={onGoToStudy}>
              <span className="home-entry-title">한자 학습 진도</span>
              <span className="home-entry-detail">
                {studyProgress.level} {studyProgress.completed}/{studyProgress.total}자 학습함
              </span>
            </button>
          )}
          {vocabStudyProgress && (
            <button type="button" className="home-entry-card" onClick={onGoToVocab}>
              <span className="home-entry-title">단어 학습 진도</span>
              <span className="home-entry-detail">
                {vocabStudyProgress.level} {vocabStudyProgress.completed}/{vocabStudyProgress.total}개 학습함
              </span>
            </button>
          )}
          {grammarStudyProgress && (
            <button type="button" className="home-entry-card" onClick={onGoToGrammar}>
              <span className="home-entry-title">문법 학습 진도</span>
              <span className="home-entry-detail">
                {grammarStudyProgress.level} {grammarStudyProgress.completed}/{grammarStudyProgress.total}개 학습함
              </span>
            </button>
          )}
          {inProgress && (
            <button type="button" className="home-entry-card" onClick={onResumeQuiz}>
              <span className="home-entry-title">마무리못한 퀴즈</span>
              <span className="home-entry-detail">
                {configSummary(inProgress.config)} · {inProgress.index}/{inProgress.questions.length} 진행 중
              </span>
            </button>
          )}
          {wrongNoteIds.length > 0 && (
            <button
              type="button"
              className="home-entry-card"
              onClick={() => onStartQuiz(kanjiIdsQuizConfig(wrongNoteIds))}
            >
              <span className="home-entry-title">한자 오답 재도전</span>
              <span className="home-entry-detail">{wrongNoteIds.length}자</span>
            </button>
          )}
          {vocabWrongIds.length > 0 && (
            <button type="button" className="home-entry-card" onClick={() => onRetryVocab(vocabWrongIds)}>
              <span className="home-entry-title">단어 오답 재도전</span>
              <span className="home-entry-detail">{vocabWrongIds.length}개</span>
            </button>
          )}
          {grammarWrongIds.length > 0 && (
            <button type="button" className="home-entry-card" onClick={() => onRetryGrammar(grammarWrongIds)}>
              <span className="home-entry-title">문법 오답 재도전</span>
              <span className="home-entry-detail">{grammarWrongIds.length}개</span>
            </button>
          )}
        </div>
      )}

      {mergedHistory.length > 0 && (
        <section className="home-history">
          <h2 className="home-history-title">최근 기록</h2>
          <ul className="home-history-list">
            {mergedHistory.map((entry) => (
              <li key={entry.id}>
                <button type="button" className="home-history-item" onClick={entry.onClick}>
                  <span className="home-history-main">
                    <span className="home-history-summary">{entry.label}</span>
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
