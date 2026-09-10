import { useState } from 'react'
import StudyPage from './StudyPage'
import QuizPage from './QuizPage'
import RadicalsPage from './RadicalsPage'
import KanjiListPage from './KanjiListPage'
import PageTabs, { type PageTab } from '../components/PageTabs'
import type { QuizConfig } from '../types'

type SubTab = 'study' | 'quiz' | 'radicals' | 'list'

const TABS: PageTab<SubTab>[] = [
  { id: 'study', label: '학습' },
  { id: 'quiz', label: '퀴즈' },
  { id: 'radicals', label: '부수' },
  { id: 'list', label: '전체보기' },
]

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
      <PageTabs title="한자" tabs={TABS} active={subTab} onChange={setSubTab} />

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
