import { useState } from 'react'
import SetupScreen from '../components/SetupScreen'
import QuizRunner from '../components/QuizRunner'
import ResultScreen from '../components/ResultScreen'
import type { AnsweredQuestion, QuizConfig } from '../types'

type Phase =
  | { step: 'setup' }
  | { step: 'running'; config: QuizConfig }
  | { step: 'result'; config: QuizConfig; answers: AnsweredQuestion[]; elapsedMs: number }

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>({ step: 'setup' })

  if (phase.step === 'setup') {
    return <SetupScreen onStart={(config) => setPhase({ step: 'running', config })} />
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
