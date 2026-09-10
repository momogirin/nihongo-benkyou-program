import { useEffect, useRef, useState } from 'react'
import { generateQuestions, type QuizQuestion } from '../lib/quizGenerator'
import { correctAnswerLabel, isCorrectAnswer } from '../lib/answerMatching'
import { isComposingEnter, swallowNextEnterKeyup } from '../lib/imeGuard'
import { setQuizActive } from '../lib/quizActive'
import QuizVerdict from './QuizVerdict'
import type { InProgressQuiz } from '../lib/storage'
import type { Kanji } from '../data/kanji'
import type { AnsweredQuestion, QuizConfig } from '../types'
import './QuizRunner.css'

interface Props {
  config: QuizConfig
  // present when resuming a quiz saved by a previous, unfinished session —
  // reuses the same generated questions/choices instead of re-rolling them
  resume?: InProgressQuiz
  onProgress: (state: InProgressQuiz) => void
  onFinish: (answers: AnsweredQuestion[], elapsedMs: number) => void
  onExit: () => void
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

// shown at the moment of a wrong answer — re-surfaces the kanji's full
// reading/example so the miss becomes a learning point (elaborative feedback),
// not just a red X. Uses only fields already on the entry (no new data).
function KanjiHint({ kanji }: { kanji: Kanji }) {
  return (
    <div className="quiz-explanation">
      <div className="quiz-explanation-row">
        <span className="quiz-explanation-label">훈독</span>
        <span>{kanji.kunJp || '—'} · {kanji.kunKr}</span>
      </div>
      <div className="quiz-explanation-row">
        <span className="quiz-explanation-label">음독</span>
        <span>{kanji.onJp || '—'}</span>
      </div>
      {kanji.exampleKanji && (
        <div className="quiz-explanation-row">
          <span className="quiz-explanation-label">예</span>
          <span>{kanji.exampleKanji}{kanji.exampleKr ? ` · ${kanji.exampleKr}` : ''}</span>
        </div>
      )}
    </div>
  )
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

export default function QuizRunner({ config, resume, onProgress, onFinish, onExit }: Props) {
  const [questions] = useState(() => resume?.questions ?? generateQuestions(config))
  const [index, setIndex] = useState(resume?.index ?? 0)
  const [inputValue, setInputValue] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const answersRef = useRef<AnsweredQuestion[]>(resume?.answers ?? [])
  const startedAtRef = useRef(resume?.startedAt ?? new Date().toISOString())
  const startTimeRef = useRef(new Date(startedAtRef.current).getTime())
  const inputRef = useRef<HTMLInputElement>(null)
  const choicesRef = useRef<HTMLDivElement>(null)
  // Guards against a question being submitted twice (e.g. a fast double
  // Enter press landing before the feedback delay advances to the next question).
  const lastSubmittedIndexRef = useRef(-1)
  // Guards handleNext the same way — an incorrect answer waits for an explicit
  // 다음/Enter, and a held-down or double-tapped Enter must not skip a question.
  const lastAdvancedIndexRef = useRef(-1)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  // 나가기 확인 — 사이드바 이동(App)과 같은 확인을 거치게 해 이탈 경로마다
  // 동작이 달라지지 않게 한다
  const [confirmExit, setConfirmExit] = useState(false)
  const confirmExitCancelRef = useRef<HTMLButtonElement>(null)

  const question = questions[index]
  const isChoiceMode = config.questionType !== 'promptToAnswer'
  // feedback lingers one extra render after setIndex() advances (the effect
  // below that clears it hasn't run yet), so gate its display on the
  // question it was actually recorded for — otherwise the new question can
  // flash the previous question's correct/incorrect coloring.
  const activeFeedback = feedback && lastSubmittedIndexRef.current === index ? feedback : null

  // 퀴즈가 떠 있는 동안만 앱 전체에 "진행 중"을 알린다 — App이 이걸 보고
  // 사이드바 이동 전에 확인을 받는다(풀던 문제가 예고 없이 사라지지 않게)
  useEffect(() => {
    setQuizActive(true)
    return () => setQuizActive(false)
  }, [])

  // keeps keyboard focus inside the quiz across questions — without this,
  // each new question left nothing focused (the previous choice button was
  // disabled/unmounted), forcing a mouse click just to continue
  useEffect(() => {
    if (isChoiceMode) {
      choicesRef.current?.querySelector('button')?.focus()
    } else {
      inputRef.current?.focus()
    }
  }, [index, isChoiceMode])

  // 입력형 문제에서 오답이 뜨면 <input disabled>로 바뀌면서 브라우저가 강제로
  // blur시켜 포커스가 완전히 유실된다(disabled 요소는 focus를 가질 수 없음).
  // 그 상태로는 window keydown 리스너가 Enter를 잡아도 사용자 체감상 "먹통"처럼
  // 느껴지므로, 오답으로 확정되는 순간 "다음" 버튼으로 포커스를 옮겨 Enter/Tab
  // 흐름이 끊기지 않게 한다.
  useEffect(() => {
    if (activeFeedback && !activeFeedback.isCorrect) {
      nextButtonRef.current?.focus()
    }
  }, [activeFeedback])

  function goNext(nextIndex: number) {
    if (nextIndex < questions.length) {
      // cleared here (synchronously with the index change, not in a
      // separate effect) so the new question never renders one frame with
      // the previous question's feedback/disabled state still applied
      setInputValue('')
      setFeedback(null)
      setIndex(nextIndex)
    } else {
      onFinish(answersRef.current, Date.now() - startTimeRef.current)
    }
  }

  // wrong answers wait here for an explicit 다음 click/Enter instead of
  // auto-advancing, so there's time to actually read the correct answer
  function handleNext() {
    if (lastAdvancedIndexRef.current === index) return
    lastAdvancedIndexRef.current = index
    swallowNextEnterKeyup()
    goNext(index + 1)
  }

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

    const nextIndex = index + 1
    if (nextIndex < questions.length) {
      onProgress({
        config,
        questions,
        index: nextIndex,
        answers: answersRef.current,
        startedAt: startedAtRef.current,
      })
    }

    // correct answers still auto-advance quickly; wrong answers stop and
    // wait for the 다음 button/Enter (see handleNext) so they're not skipped
    // past before the correct answer can be read
    if (isCorrect) {
      setTimeout(() => goNext(nextIndex), FEEDBACK_DELAY_MS)
    }
  }

  // single window-level keydown listener for the whole quiz interaction —
  // number-key choice shortcuts, Enter-to-submit (input mode), and
  // Enter-to-advance past a wrong answer all go through here
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isComposingEnter(e)) return
      // 나가기 확인이 떠 있으면 퀴즈 조작 키는 전부 멈춘다 — 다이얼로그의
      // Esc/Enter만 동작해야 한다
      if (confirmExit) return
      if (activeFeedback) {
        if (!activeFeedback.isCorrect && e.key === 'Enter' && !e.repeat) {
          // 포커스된 "다음" 버튼에서 브라우저가 이 keydown을 native click으로
          // 바꾸는데, handleNext()가 그 전에 다음 문제로 넘기고 1번 선택지에
          // 포커스를 주므로 그 click이 새 문제의 1번을 눌러버린다.
          // 기본 동작을 여기서 끊어야 그게 막힌다(handleNext 안에서는 늦다 —
          // 이벤트 객체가 없어 preventDefault를 부를 수 없다).
          e.preventDefault()
          handleNext()
        }
        return
      }
      if (isChoiceMode) {
        const choiceIndex = Number(e.key) - 1
        const choice = question.choices?.[choiceIndex]
        if (choice) submit(choiceLabel(config.questionType, choice))
      } else if (e.key === 'Enter' && !e.repeat && inputValue.trim() !== '') {
        // 제출로 오답이 확정되면 그 직후 "다음" 버튼이 렌더되며 포커스를 받는데,
        // 바로 이 Enter의 기본 동작이 그 버튼을 native click 해버려 판정을 볼
        // 새도 없이 다음 문제로 넘어간다. 여기서도 기본 동작을 끊어야 한다.
        e.preventDefault()
        submit(inputValue)
      }
    }
    // capture 단계 — 포커스된 버튼이 keydown을 받아 native click을 만들기
    // 전에 우리가 먼저 처리하고 필요하면 기본 동작을 끊기 위해서다.
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChoiceMode, question, activeFeedback, inputValue, confirmExit])

  // 나가기 확인: Esc = 취소, Enter = 나가기(앱 전역 확인 다이얼로그 규칙)
  useEffect(() => {
    if (!confirmExit) return
    confirmExitCancelRef.current?.focus()
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setConfirmExit(false)
      } else if (e.key === 'Enter' && !e.repeat) {
        e.preventDefault()
        e.stopPropagation()
        onExit()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmExit])

  return (
    <div className="quiz-runner">
      <div className="quiz-topbar">
        <button type="button" className="quiz-exit-button" onClick={() => setConfirmExit(true)}>
          나가기
        </button>
        <div className="quiz-progress">
          {index + 1} / {questions.length}
        </div>
      </div>

      {!isChoiceMode ? (
        <>
          <div className="quiz-kanji">{question.kanji.kanji}</div>
          <input
            ref={inputRef}
            className="quiz-input"
            type="text"
            value={inputValue}
            disabled={activeFeedback !== null}
            placeholder="훈음을 입력하세요 (예: 날 일)"
            onChange={(e) => setInputValue(e.target.value)}
          />
          {activeFeedback && (
            <QuizVerdict
              isCorrect={activeFeedback.isCorrect}
              answerLabel={correctAnswerLabel(config.questionType, question.kanji)}
            />
          )}
          {activeFeedback && !activeFeedback.isCorrect && <KanjiHint kanji={question.kanji} />}
          {activeFeedback && !activeFeedback.isCorrect && (
            <button type="button" ref={nextButtonRef} className="quiz-next-button" onClick={handleNext}>
              다음
            </button>
          )}
          <p className="shortcut-hint">Enter로 제출 · 오답이면 Enter로 다음 문제</p>
        </>
      ) : (
        <>
          {config.questionType === 'kunReading' || config.questionType === 'onReading' ? (
            <div className="quiz-kanji">{promptText(config.questionType, question)}</div>
          ) : (
            <div className="quiz-prompt">{promptText(config.questionType, question)}</div>
          )}
          <div className="quiz-choices" ref={choicesRef}>
            {question.choices?.map((choice, i) => {
              const label = choiceLabel(config.questionType, choice)
              const answerLabel = correctAnswerLabel(config.questionType, question.kanji)
              let className = 'quiz-choice'
              if (activeFeedback) {
                if (label === activeFeedback.selectedLabel) {
                  className += activeFeedback.isCorrect ? ' correct' : ' incorrect'
                } else if (!activeFeedback.isCorrect && label === answerLabel) {
                  className += ' reveal-correct'
                }
              }
              return (
                <button
                  key={choice.id}
                  type="button"
                  className={className}
                  disabled={activeFeedback !== null}
                  onClick={() => submit(label)}
                >
                  <span className="quiz-choice-num">{i + 1}</span>
                  {label}
                </button>
              )
            })}
          </div>
          {activeFeedback && <QuizVerdict isCorrect={activeFeedback.isCorrect} />}
          {activeFeedback && !activeFeedback.isCorrect && <KanjiHint kanji={question.kanji} />}
          {activeFeedback && !activeFeedback.isCorrect && (
            <button type="button" ref={nextButtonRef} className="quiz-next-button" onClick={handleNext}>
              다음
            </button>
          )}
          <p className="shortcut-hint">숫자키(1~4)로 선택 · 오답이면 Enter로 다음 문제</p>
        </>
      )}

      {confirmExit && (
        <div className="confirm-modal-backdrop" onClick={() => setConfirmExit(false)}>
          <div
            className="confirm-modal"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <p className="confirm-modal-message">
              퀴즈를 그만둘까요?
              <br />
              지금까지 푼 문제는 저장되며, 홈에서 이어서 풀 수 있습니다.
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                ref={confirmExitCancelRef}
                className="confirm-modal-cancel"
                onClick={() => setConfirmExit(false)}
              >
                계속 풀기
              </button>
              <button type="button" className="confirm-modal-danger" onClick={onExit}>
                나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
