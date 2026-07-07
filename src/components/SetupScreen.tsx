import { Fragment, useMemo, useState } from 'react'
import { kanjiList, type KanjiLevel } from '../data/kanji'
import { levelPool } from '../lib/quizGenerator'
import type { QuestionCount, QuestionType, QuizConfig, QuizOrder } from '../types'
import './SetupScreen.css'

const ALL_LEVELS: KanjiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
const COUNT_OPTIONS: QuestionCount[] = [10, 20, 30, 50, 'all']

const LEVEL_COUNTS: Record<KanjiLevel, number> = Object.fromEntries(
  ALL_LEVELS.map((level) => [level, kanjiList.filter((k) => k.level === level).length]),
) as Record<KanjiLevel, number>

// rows of the 문제 유형 grid: which reading is being tested, and the question
// type for each of the two directions (한자→정답 / 정답→한자)
const TYPE_ROWS: {
  label: string
  kanjiToAnswer: QuestionType
  kanjiToAnswerLabel: string
  answerToKanji: QuestionType
}[] = [
  { label: '한국 훈음', kanjiToAnswer: 'promptToAnswer', kanjiToAnswerLabel: '입력', answerToKanji: 'answerToPrompt' },
  { label: '일본어 훈독', kanjiToAnswer: 'kunReading', kanjiToAnswerLabel: '고르기', answerToKanji: 'kunReadingToKanji' },
  { label: '일본어 음독', kanjiToAnswer: 'onReading', kanjiToAnswerLabel: '고르기', answerToKanji: 'onReadingToKanji' },
]

interface Props {
  onStart: (config: QuizConfig) => void
}

export default function SetupScreen({ onStart }: Props) {
  const [levels, setLevels] = useState<KanjiLevel[]>([])
  const [questionType, setQuestionType] = useState<QuestionType | null>(null)
  const [order, setOrder] = useState<QuizOrder | null>(null)
  const [count, setCount] = useState<QuestionCount | null>(null)

  const availableCount = useMemo(
    () => levels.reduce((sum, level) => sum + levelPool(level).length, 0),
    [levels],
  )

  function toggleLevel(level: KanjiLevel) {
    setLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    )
  }

  const canStart =
    levels.length > 0 && availableCount > 0 && questionType !== null && order !== null && count !== null

  return (
    <div className="setup-screen">
      <h1>학습 설정</h1>

      <fieldset>
        <legend>급수</legend>
        <div className="option-grid option-grid-5">
          {ALL_LEVELS.map((level) => (
            <label className="option" key={level}>
              <input
                type="checkbox"
                checked={levels.includes(level)}
                onChange={() => toggleLevel(level)}
              />
              {level} ({LEVEL_COUNTS[level]}자)
            </label>
          ))}
        </div>

        <p className="hint">
          {availableCount > 0 ? `${availableCount}자 해당` : '급수를 하나 이상 선택하세요'}
        </p>
      </fieldset>

      <fieldset>
        <legend>문제 유형</legend>
        <div className="type-grid">
          <div className="type-grid-cell" />
          <div className="type-grid-cell type-grid-header">한자 → 정답</div>
          <div className="type-grid-cell type-grid-header">정답 → 한자</div>
          {TYPE_ROWS.map((row) => (
            <Fragment key={row.label}>
              <div className="type-grid-cell type-grid-label">{row.label}</div>
              <button
                type="button"
                className={`type-grid-cell type-btn${questionType === row.kanjiToAnswer ? ' active' : ''}`}
                onClick={() => setQuestionType(row.kanjiToAnswer)}
              >
                {row.kanjiToAnswerLabel}
              </button>
              <button
                type="button"
                className={`type-grid-cell type-btn${questionType === row.answerToKanji ? ' active' : ''}`}
                onClick={() => setQuestionType(row.answerToKanji)}
              >
                고르기
              </button>
            </Fragment>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>순서</legend>
        <div className="option-grid option-grid-2">
          <label className="option">
            <input
              type="radio"
              name="order"
              checked={order === 'random'}
              onChange={() => setOrder('random')}
            />
            랜덤
          </label>
          <label className="option">
            <input
              type="radio"
              name="order"
              checked={order === 'sequential'}
              onChange={() => setOrder('sequential')}
            />
            순차
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>문제 수</legend>
        <div className="option-grid option-grid-5">
          {COUNT_OPTIONS.map((opt) => {
            const disabled = opt !== 'all' && opt > availableCount
            return (
              <label className={`option${disabled ? ' disabled' : ''}`} key={opt}>
                <input
                  type="radio"
                  name="count"
                  checked={count === opt}
                  disabled={disabled}
                  onChange={() => setCount(opt)}
                />
                {opt === 'all' ? `전체 (${availableCount}자)` : opt}
              </label>
            )
          })}
        </div>
      </fieldset>

      <button
        type="button"
        className="start-button"
        disabled={!canStart}
        onClick={() =>
          canStart &&
          onStart({ levels, questionType: questionType!, order: order!, count: count! })
        }
      >
        시작하기
      </button>
    </div>
  )
}
