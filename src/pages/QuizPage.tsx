import { useEffect, useState } from 'react'
import SetupScreen from '../components/SetupScreen'
import QuizRunner from '../components/QuizRunner'
import ResultScreen from '../components/ResultScreen'
import {
  addQuizHistoryEntry,
  clearInProgressQuiz,
  getInProgressQuiz,
  saveInProgressQuiz,
  type InProgressQuiz,
} from '../lib/storage'
import type { AnsweredQuestion, QuizConfig } from '../types'

type Phase =
  | { step: 'setup' }
  | { step: 'running'; config: QuizConfig; resume?: InProgressQuiz }
  | { step: 'result'; config: QuizConfig; answers: AnsweredQuestion[]; elapsedMs: number }

interface Props {
  // preset config from "오답만 재도전" / 학습 배치 / 기록에서 재시도 entry
  // points; skips SetupScreen
  initialConfig: QuizConfig | null
  onInitialConfigConsumed: () => void
  // set when HomePage's "마무리못한 퀴즈" card was clicked; loads the saved
  // in-progress session instead of starting a fresh one
  resumeRequested: boolean
  onResumeRequestConsumed: () => void
}

export default function QuizPage({
  initialConfig,
  onInitialConfigConsumed,
  resumeRequested,
  onResumeRequestConsumed,
}: Props) {
  const [phase, setPhase] = useState<Phase>(() => {
    if (resumeRequested) {
      const saved = getInProgressQuiz()
      if (saved) return { step: 'running', config: saved.config, resume: saved }
    }
    if (initialConfig) return { step: 'running', config: initialConfig }
    return { step: 'setup' }
  })

  useEffect(() => {
    if (resumeRequested) onResumeRequestConsumed()
    else if (initialConfig) {
      onInitialConfigConsumed()
      clearInProgressQuiz()
    }
    // consume the preset config/resume request once on mount only, so a later
    // "다시 설정하기" within this same session isn't overridden by a stale prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase.step === 'setup') {
    return (
      <SetupScreen
        onStart={(config) => {
          clearInProgressQuiz()
          setPhase({ step: 'running', config })
        }}
      />
    )
  }

  if (phase.step === 'running') {
    return (
      <QuizRunner
        config={phase.config}
        resume={phase.resume}
        onProgress={saveInProgressQuiz}
        onExit={() => setPhase({ step: 'setup' })}
        onFinish={(answers, elapsedMs) => {
          clearInProgressQuiz()
          addQuizHistoryEntry({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            config: phase.config,
            total: answers.length,
            correct: answers.filter((a) => a.isCorrect).length,
            elapsedMs,
            finishedAt: new Date().toISOString(),
          })
          setPhase({ step: 'result', config: phase.config, answers, elapsedMs })
        }}
      />
    )
  }

  return (
    <ResultScreen
      answers={phase.answers}
      elapsedMs={phase.elapsedMs}
      config={phase.config}
      onRestart={() => setPhase({ step: 'setup' })}
    />
  )
}
