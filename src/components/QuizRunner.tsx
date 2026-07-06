import { useEffect, useMemo, useRef, useState } from 'react'
import { generateQuestions, type QuizQuestion } from '../lib/quizGenerator'
import { isCorrectAnswer } from '../lib/answerMatching'
import type { Kanji } from '../data/kanji'
import type { AnsweredQuestion, QuizConfig } from '../types'
import './QuizRunner.css'

interface Props {
  config: QuizConfig
  onFinish: (answers: AnsweredQuestion[], elapsedMs: number) => void
}

// text shown above the choices/input for each question type
function promptText(questionType: QuizConfig['questionType'], question: QuizQuestion): string {
  switch (questionType) {
    case 'answerToPrompt':
      return question.kanji.kunKr
    case 'kunReadingToKanji':
      return question.kanji.kunJp
    case 'onReadingToKanji':
      return question.kanji.onJp
    default:
      return question.kanji.kanji
  }
}

// text shown on each of the 4 choice buttons
function choiceLabel(questionType: QuizConfig['questionType'], choice: Kanji): string {
  switch (questionType) {
    case 'kunReading':
      return choice.kunJp
    case 'onReading':
      return choice.onJp
    default:
      return choice.kanji
  }
}

export default function QuizRunner({ config, onFinish }: Props) {
  const questions = useMemo(() => generateQuestions(config), [config])
  const [index, setIndex] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const answersRef = useRef<AnsweredQuestion[]>([])
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  // Guards against a question being submitted twice (e.g. a fast double
  // Enter press landing before the input clears/advances to the next question).
  const lastSubmittedIndexRef = useRef(-1)

  const question = questions[index]

  useEffect(() => {
    setInputValue('')
    inputRef.current?.focus()
  }, [index])

  function submit(rawAnswer: string) {
    if (lastSubmittedIndexRef.current === index) return
    lastSubmittedIndexRef.current = index
    setInputValue('')

    const isCorrect = (() => {
      switch (config.questionType) {
        case 'promptToAnswer':
          return isCorrectAnswer(rawAnswer, question.kanji.kunKr)
        case 'answerToPrompt':
        case 'kunReadingToKanji':
        case 'onReadingToKanji':
          return rawAnswer === question.kanji.kanji
        case 'kunReading':
          return rawAnswer === question.kanji.kunJp
        case 'onReading':
          return rawAnswer === question.kanji.onJp
      }
    })()

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
              if (e.key === 'Enter' && !e.repeat && inputValue.trim() !== '') submit(inputValue)
            }}
          />
        </>
      ) : (
        <>
          {config.questionType === 'kunReading' || config.questionType === 'onReading' ? (
            <div className="quiz-kanji">{promptText(config.questionType, question)}</div>
          ) : (
            <div className="quiz-prompt">{promptText(config.questionType, question)}</div>
          )}
          <div className="quiz-choices">
            {question.choices?.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="quiz-choice"
                onClick={() => submit(choiceLabel(config.questionType, choice))}
              >
                {choiceLabel(config.questionType, choice)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
