import { useMemo, useState } from 'react'
import { kanjiList, type KanjiLevel } from '../data/kanji'
import type { QuestionCount, QuestionType, QuizConfig, QuizOrder } from '../types'
import './SetupScreen.css'

const ALL_LEVELS: KanjiLevel[] = ['N5', 'N4', 'N3']
const COUNT_OPTIONS: QuestionCount[] = [10, 20, 30, 50, 'all']

interface Props {
  onStart: (config: QuizConfig) => void
}

export default function SetupScreen({ onStart }: Props) {
  const [levels, setLevels] = useState<KanjiLevel[]>(ALL_LEVELS)
  const [questionType, setQuestionType] = useState<QuestionType>('promptToAnswer')
  const [order, setOrder] = useState<QuizOrder>('random')
  const [count, setCount] = useState<QuestionCount>(20)

  const availableCount = useMemo(
    () => kanjiList.filter((k) => levels.includes(k.level)).length,
    [levels],
  )

  const allSelected = levels.length === ALL_LEVELS.length

  function toggleLevel(level: KanjiLevel) {
    setLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    )
  }

  function toggleAll() {
    setLevels(allSelected ? [] : ALL_LEVELS)
  }

  const canStart = levels.length > 0 && availableCount > 0

  return (
    <div className="setup-screen">
      <h1>학습 설정</h1>

      <fieldset>
        <legend>급수</legend>
        <label className="option">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          전체
        </label>
        {ALL_LEVELS.map((level) => (
          <label className="option" key={level}>
            <input
              type="checkbox"
              checked={levels.includes(level)}
              onChange={() => toggleLevel(level)}
            />
            {level}
          </label>
        ))}
        <p className="hint">
          {availableCount > 0 ? `${availableCount}자 해당` : '급수를 하나 이상 선택하세요'}
        </p>
      </fieldset>

      <fieldset>
        <legend>문제 유형</legend>
        <label className="option option-block">
          <input
            type="radio"
            name="questionType"
            checked={questionType === 'promptToAnswer'}
            onChange={() => setQuestionType('promptToAnswer')}
          />
          한자 → 읽기·뜻 맞히기 (주관식)
        </label>
        <label className="option option-block">
          <input
            type="radio"
            name="questionType"
            checked={questionType === 'answerToPrompt'}
            onChange={() => setQuestionType('answerToPrompt')}
          />
          읽기·뜻 → 한자 고르기 (4지선다)
        </label>
      </fieldset>

      <fieldset>
        <legend>순서</legend>
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
      </fieldset>

      <fieldset>
        <legend>문제 수</legend>
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
              {opt === 'all' ? '전체' : opt}
            </label>
          )
        })}
      </fieldset>

      <button
        type="button"
        className="start-button"
        disabled={!canStart}
        onClick={() => onStart({ levels, questionType, order, count })}
      >
        시작하기
      </button>
    </div>
  )
}
