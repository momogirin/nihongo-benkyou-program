import { useEffect, useMemo, useRef, useState } from 'react'
import { generateQuestions } from '../lib/quizGenerator'
import { isCorrectAnswer } from '../lib/answerMatching'
import type { AnsweredQuestion, QuizConfig } from '../types'
import './QuizRunner.css'

interface Props {
  config: QuizConfig
  onFinish: (answers: AnsweredQuestion[], elapsedMs: number) => void
}

export default function QuizRunner({ config, onFinish }: Props) {
  const questions = useMemo(() => generateQuestions(config), [config])
  const [index, setIndex] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const answersRef = useRef<AnsweredQuestion[]>([])
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)

  const question = questions[index]

  useEffect(() => {
    setInputValue('')
    inputRef.current?.focus()
  }, [index])

  function submit(rawAnswer: string) {
    const isCorrect =
      config.questionType === 'promptToAnswer'
        ? isCorrectAnswer(rawAnswer, question.kanji.kunKr)
        : rawAnswer === question.kanji.kanji

    answersRef.current = [
      ...answersRef.current,
      { kanji: question.kanji, userAnswer: rawAnswer, isCorrect },
    ]

    if (index + 1 < questions.length) {
      setIndex(index + 1)
    } else {
      onFinish(answersRef.current, Date.now() - startTimeRef.current)
    }
  }

  return (
    <div className="quiz-runner">
      <div className="quiz-progress">
        {index + 1} / {questions.length}
      </div>

      {config.questionType === 'promptToAnswer' ? (
        <>
          <div className="quiz-kanji">{question.kanji.kanji}</div>
          <input
            ref={inputRef}
            className="quiz-input"
            type="text"
            value={inputValue}
            placeholder="훈음을 입력하세요 (예: 날 일)"
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue.trim() !== '') submit(inputValue)
            }}
          />
        </>
      ) : (
        <>
          <div className="quiz-prompt">{question.kanji.kunKr}</div>
          <div className="quiz-choices">
            {question.choices?.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="quiz-choice"
                onClick={() => submit(choice.kanji)}
              >
                {choice.kanji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
