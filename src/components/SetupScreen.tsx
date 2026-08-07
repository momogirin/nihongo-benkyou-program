import { Fragment, useEffect, useMemo, useState } from 'react'
import { kanjiList, type KanjiLevel } from '../data/kanji'
import { levelPool } from '../lib/quizGenerator'
import { getSetupPrefs, setSetupPrefs } from '../lib/storage'
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

// 마지막으로 고른 설정 — 문제 유형은 일부러 제외한다(매번 직접 고르게 두는 게
// 이 화면의 원래 설계)
interface KanjiSetupPrefs {
  levels: KanjiLevel[]
  order: QuizOrder | null
  count: QuestionCount | null
}

function loadKanjiSetupPrefs(): Partial<KanjiSetupPrefs> {
  const saved = getSetupPrefs<KanjiSetupPrefs>('kanji')
  if (!saved) return {}
  const levels = Array.isArray(saved.levels)
    ? saved.levels.filter((l): l is KanjiLevel => ALL_LEVELS.includes(l))
    : []
  return {
    levels: levels.length > 0 ? levels : undefined,
    order: saved.order === 'random' || saved.order === 'sequential' ? saved.order : undefined,
    count: COUNT_OPTIONS.includes(saved.count as QuestionCount) ? saved.count : undefined,
  }
}

export default function SetupScreen({ onStart }: Props) {
  // 급수(첫 레벨)/순서/문제수는 거의 항상 같은 값을 고르게 되므로 기본값을 채워
  // 두고, 매번 실제로 달라질 만한 문제 유형만 매번 직접 고르게 둔다.
  // 그 기본값을 "마지막에 고른 값"으로 되살린다 — 한 급수를 여러 달 도는데 매번
  // 같은 선택을 반복시킬 이유가 없다. 문제 유형은 위 의도대로 저장하지 않는다.
  const prefs = useMemo(loadKanjiSetupPrefs, [])
  const [levels, setLevels] = useState<KanjiLevel[]>(prefs.levels ?? [ALL_LEVELS[0]])
  const [questionType, setQuestionType] = useState<QuestionType | null>(null)
  const [order, setOrder] = useState<QuizOrder | null>(prefs.order ?? 'random')
  const [count, setCount] = useState<QuestionCount | null>(prefs.count ?? 20)

  useEffect(() => {
    setSetupPrefs<KanjiSetupPrefs>('kanji', { levels, order, count })
  }, [levels, order, count])

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
            <label className={`option option-level option-level-${level.toLowerCase()}`} key={level}>
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
                aria-pressed={questionType === row.kanjiToAnswer}
                className={`type-grid-cell type-btn${questionType === row.kanjiToAnswer ? ' active' : ''}`}
                onClick={() => setQuestionType(row.kanjiToAnswer)}
              >
                {row.kanjiToAnswerLabel}
              </button>
              <button
                type="button"
                aria-pressed={questionType === row.answerToKanji}
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
