import { useEffect, useState } from 'react'
import SetupScreen from '../components/SetupScreen'
import QuizRunner from '../components/QuizRunner'
import ResultScreen from '../components/ResultScreen'
import { saveLastQuizConfig } from '../lib/storage'
import type { AnsweredQuestion, QuizConfig } from '../types'

type Phase =
  | { step: 'setup' }
  | { step: 'running'; config: QuizConfig }
  | { step: 'result'; config: QuizConfig; answers: AnsweredQuestion[]; elapsedMs: number }

interface Props {
  // preset config from "오답만 재도전" / "이어하기" entry points; skips SetupScreen
  initialConfig: QuizConfig | null
  onInitialConfigConsumed: () => void
}

export default function QuizPage({ initialConfig, onInitialConfigConsumed }: Props) {
  const [phase, setPhase] = useState<Phase>(() =>
    initialConfig ? { step: 'running', config: initialConfig } : { step: 'setup' },
  )

  useEffect(() => {
    if (initialConfig) onInitialConfigConsumed()
    // consume the preset config once on mount only, so a later "다시 설정하기"
    // within this same session isn't overridden by a stale prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase.step === 'setup') {
    return (
      <SetupScreen
        onStart={(config) => {
          saveLastQuizConfig(config)
          setPhase({ step: 'running', config })
        }}
      />
    )
  }

  if (phase.step === 'running') {
    return (
      <QuizRunner
        config={phase.config}
        onFinish={(answers, elapsedMs) =>
          setPhase({ step: 'result', config: phase.config, answers, elapsedMs })
        }
      />
    )
  }

  return (
    <ResultScreen
      answers={phase.answers}
      elapsedMs={phase.elapsedMs}
      questionType={phase.config.questionType}
      onRestart={() => setPhase({ step: 'setup' })}
    />
  )
}
