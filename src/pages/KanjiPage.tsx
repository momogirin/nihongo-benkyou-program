import { useState } from 'react'
import StudyPage from './StudyPage'
import QuizPage from './QuizPage'
import RadicalsPage from './RadicalsPage'
import KanjiListPage from './KanjiListPage'
import type { QuizConfig } from '../types'
import './KanjiPage.css'

type SubTab = 'study' | 'quiz' | 'radicals' | 'list'

interface Props {
  // preset config from 홈/오답노트 entry points, same contract QuizPage already had
  quizConfig: QuizConfig | null
  onQuizConfigConsumed: () => void
  resumeRequested: boolean
  onResumeRequestConsumed: () => void
}

export default function KanjiPage({
  quizConfig,
  onQuizConfigConsumed,
  resumeRequested,
  onResumeRequestConsumed,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>(() => (quizConfig || resumeRequested ? 'quiz' : 'study'))
  // "학습 완료 → 퀴즈 풀기" also needs to hand a config to QuizPage, same as
  // the 홈/오답노트 entry points above but sourced from inside this page
  const [studyQuizConfig, setStudyQuizConfig] = useState<QuizConfig | null>(null)

  function startQuizFromStudy(config: QuizConfig) {
    setStudyQuizConfig(config)
    setSubTab('quiz')
  }

  const effectiveQuizConfig = quizConfig ?? studyQuizConfig

  return (
    <>
      <div className="kanji-tabs">
        <button
          type="button"
          className={`kanji-tab${subTab === 'study' ? ' active' : ''}`}
          onClick={() => setSubTab('study')}
        >
          학습
        </button>
        <button
          type="button"
          className={`kanji-tab${subTab === 'quiz' ? ' active' : ''}`}
          onClick={() => setSubTab('quiz')}
        >
          퀴즈
        </button>
        <button
          type="button"
          className={`kanji-tab${subTab === 'radicals' ? ' active' : ''}`}
          onClick={() => setSubTab('radicals')}
        >
          부수
        </button>
        <button
          type="button"
          className={`kanji-tab${subTab === 'list' ? ' active' : ''}`}
          onClick={() => setSubTab('list')}
        >
          전체보기
        </button>
      </div>

      {subTab === 'study' && <StudyPage onStartQuiz={startQuizFromStudy} />}
      {subTab === 'quiz' && (
        <QuizPage
          initialConfig={effectiveQuizConfig}
          onInitialConfigConsumed={() => {
            setStudyQuizConfig(null)
            onQuizConfigConsumed()
          }}
          resumeRequested={resumeRequested}
          onResumeRequestConsumed={onResumeRequestConsumed}
        />
      )}
      {subTab === 'radicals' && <RadicalsPage />}
      {subTab === 'list' && <KanjiListPage />}
    </>
  )
}
