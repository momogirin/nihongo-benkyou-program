import { useEffect, useMemo, useRef, useState } from 'react'
import { generateQuestions, type QuizQuestion } from '../lib/quizGenerator'
import { correctAnswerLabel, isCorrectAnswer } from '../lib/answerMatching'
import type { Kanji } from '../data/kanji'
import type { AnsweredQuestion, QuizConfig } from '../types'
import './QuizRunner.css'

interface Props {
  config: QuizConfig
  onFinish: (answers: AnsweredQuestion[], elapsedMs: number) => void
}

// how long the correct/incorrect state is shown before auto-advancing
const FEEDBACK_DELAY_MS = 550

interface Feedback {
  isCorrect: boolean
  selectedLabel: string
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
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const answersRef = useRef<AnsweredQuestion[]>([])
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  // Guards against a question being submitted twice (e.g. a fast double
  // Enter press landing before the feedback delay advances to the next question).
  const lastSubmittedIndexRef = useRef(-1)

  const question = questions[index]
  const isChoiceMode = config.questionType !== 'promptToAnswer'

  useEffect(() => {
    setInputValue('')
    setFeedback(null)
    inputRef.current?.focus()
  }, [index])

  function submit(rawAnswer: string) {
    if (lastSubmittedIndexRef.current === index) return
    lastSubmittedIndexRef.current = index

    const answerLabel = correctAnswerLabel(config.questionType, question.kanji)
    const isCorrect =
      config.questionType === 'promptToAnswer'
        ? isCorrectAnswer(rawAnswer, answerLabel)
        : rawAnswer === answerLabel

    answersRef.current = [
      ...answersRef.current,
      { kanji: question.kanji, userAnswer: rawAnswer, isCorrect },
    ]
    setFeedback({ isCorrect, selectedLabel: rawAnswer })

    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIndex(index + 1)
      } else {
        onFinish(answersRef.current, Date.now() - startTimeRef.current)
      }
    }, FEEDBACK_DELAY_MS)
  }

  // number-key shortcuts (1-4) for choice-based question types, so repeated
  // quiz-taking doesn't require reaching for the mouse
  useEffect(() => {
    if (!isChoiceMode) return
    function handleKeyDown(e: KeyboardEvent) {
      if (feedback) return
      const choiceIndex = Number(e.key) - 1
      const choice = question.choices?.[choiceIndex]
      if (choice) submit(choiceLabel(config.questionType, choice))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChoiceMode, question, feedback])

  return (
    <div className="quiz-runner">
      <div className="quiz-progress">
        {index + 1} / {questions.length}
      </div>

      {!isChoiceMode ? (
        <>
          <div className="quiz-kanji">{question.kanji.kanji}</div>
          <input
            ref={inputRef}
            className="quiz-input"
            type="text"
            value={inputValue}
            disabled={feedback !== null}
            placeholder="훈음을 입력하세요 (예: 날 일)"
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.repeat && inputValue.trim() !== '') submit(inputValue)
            }}
          />
          {feedback && (
            <p className={`quiz-feedback ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
              {feedback.isCorrect
                ? '정답입니다'
                : `오답 · 정답: ${correctAnswerLabel(config.questionType, question.kanji)}`}
            </p>
          )}
        </>
      ) : (
        <>
          {config.questionType === 'kunReading' || config.questionType === 'onReading' ? (
            <div className="quiz-kanji">{promptText(config.questionType, question)}</div>
          ) : (
            <div className="quiz-prompt">{promptText(config.questionType, question)}</div>
          )}
          <div className="quiz-choices">
            {question.choices?.map((choice, i) => {
              const label = choiceLabel(config.questionType, choice)
              const answerLabel = correctAnswerLabel(config.questionType, question.kanji)
              let className = 'quiz-choice'
              if (feedback) {
                if (label === feedback.selectedLabel) {
                  className += feedback.isCorrect ? ' correct' : ' incorrect'
                } else if (!feedback.isCorrect && label === answerLabel) {
                  className += ' reveal-correct'
                }
              }
              return (
                <button
                  key={choice.id}
                  type="button"
                  className={className}
                  disabled={feedback !== null}
                  onClick={() => submit(label)}
                >
                  <span className="quiz-choice-num">{i + 1}</span>
                  {label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
