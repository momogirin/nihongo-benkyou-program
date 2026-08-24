import { useEffect, useMemo, useState } from 'react'
import { kanjiList, type KanjiLevel } from '../data/kanji'
import {
  ALL_LEVELS,
  EXCEL_COLUMNS,
  buildFileName,
  buildKanjiWorkbook,
  kanjiForLevels,
  type ColumnId,
} from '../lib/kanjiExcel'
import { getSetupPrefs, setSetupPrefs } from '../lib/storage'
// 급수 체크박스·fieldset·시작 버튼은 학습설정 화면과 같은 모양이어야 하므로
// 그 스타일을 그대로 쓴다(모의고사 화면도 같은 방식으로 재사용 중)
import '../components/SetupScreen.css'
import './ExportPage.css'

const LEVEL_COUNTS: Record<KanjiLevel, number> = Object.fromEntries(
  ALL_LEVELS.map((level) => [level, kanjiList.filter((k) => k.level === level).length]),
) as Record<KanjiLevel, number>

const ALL_COLUMN_IDS = EXCEL_COLUMNS.map((c) => c.id)
// 기본 선택 — 원본 "4급 한자 완전판" 양식이 실제로 채워 쓰던 열
const DEFAULT_COLUMN_IDS: ColumnId[] = [
  'num',
  'kanji',
  'kunKr',
  'kunJp',
  'onJp',
  'exampleKanji',
  'exampleKr',
  'exampleJp',
]

type Status = { type: 'success' | 'error'; message: string }

interface ExportPrefs {
  levels: KanjiLevel[]
  columnIds: ColumnId[]
  merged: boolean
}

function loadPrefs(): Partial<ExportPrefs> {
  const saved = getSetupPrefs<ExportPrefs>('kanjiExport')
  if (!saved) return {}
  const levels = Array.isArray(saved.levels)
    ? saved.levels.filter((l): l is KanjiLevel => ALL_LEVELS.includes(l))
    : []
  const columnIds = Array.isArray(saved.columnIds)
    ? saved.columnIds.filter((c): c is ColumnId => ALL_COLUMN_IDS.includes(c))
    : []
  return {
    levels: levels.length > 0 ? levels : undefined,
    columnIds: columnIds.length > 0 ? columnIds : undefined,
    merged: typeof saved.merged === 'boolean' ? saved.merged : undefined,
  }
}

export default function ExportPage() {
  const prefs = useMemo(loadPrefs, [])
  const [levels, setLevels] = useState<KanjiLevel[]>(prefs.levels ?? [...ALL_LEVELS])
  const [columnIds, setColumnIds] = useState<ColumnId[]>(prefs.columnIds ?? DEFAULT_COLUMN_IDS)
  const [merged, setMerged] = useState(prefs.merged ?? false)
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setSetupPrefs<ExportPrefs>('kanjiExport', { levels, columnIds, merged })
  }, [levels, columnIds, merged])

  const rowCount = useMemo(() => kanjiForLevels(levels).length, [levels])
  const allLevelsPicked = levels.length === ALL_LEVELS.length

  function toggleLevel(level: KanjiLevel) {
    setStatus(null)
    setLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]))
  }

  function toggleColumn(id: ColumnId) {
    setStatus(null)
    setColumnIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  const canExport = levels.length > 0 && columnIds.length > 0 && rowCount > 0

  function handleExport() {
    if (!canExport || busy) return
    setBusy(true)
    setStatus(null)
    try {
      // 선택한 열을 원본 양식의 열 순서대로 정렬해서 넘긴다 —
      // 체크한 순서가 아니라 항상 같은 순서로 나와야 한다
      const ordered = ALL_COLUMN_IDS.filter((id) => columnIds.includes(id))
      const blob = buildKanjiWorkbook({ levels, columnIds: ordered, merged })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = buildFileName(levels)
      a.click()
      URL.revokeObjectURL(url)
      setStatus({ type: 'success', message: `내려받기 완료 — ${rowCount}자 · ${ordered.length}개 열` })
    } catch (e) {
      // 실패를 조용히 삼키지 않는다
      setStatus({ type: 'error', message: `내보내기 실패: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="setup-screen export-page">
      <h1>엑셀 내보내기</h1>
      <p className="page-placeholder">
        한자 목록을 엑셀 파일로 내려받습니다. 급수와 열을 골라서 원하는 형태로 뽑을 수 있고, 서식(글꼴 ·
        열너비 · 머리글)은 "4급 한자 완전판" 양식을 그대로 따릅니다.
      </p>

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
        <div className="export-bulk">
          <button
            type="button"
            className="export-link-button"
            onClick={() => {
              setStatus(null)
              setLevels(allLevelsPicked ? [] : [...ALL_LEVELS])
            }}
          >
            {allLevelsPicked ? '전체 해제' : '전체 선택'}
          </button>
        </div>
        <p className="hint">
          {rowCount > 0 ? `${rowCount}자 내보내기` : '급수를 하나 이상 선택하세요'}
        </p>
      </fieldset>

      <fieldset>
        <legend>열</legend>
        <div className="option-grid export-column-grid">
          {EXCEL_COLUMNS.map((col) => (
            <label className="option" key={col.id}>
              <input
                type="checkbox"
                checked={columnIds.includes(col.id)}
                onChange={() => toggleColumn(col.id)}
              />
              {col.header}
            </label>
          ))}
        </div>
        <div className="export-bulk">
          <button
            type="button"
            className="export-link-button"
            onClick={() => {
              setStatus(null)
              setColumnIds(columnIds.length === ALL_COLUMN_IDS.length ? [] : [...ALL_COLUMN_IDS])
            }}
          >
            {columnIds.length === ALL_COLUMN_IDS.length ? '전체 해제' : '전체 선택'}
          </button>
          <button
            type="button"
            className="export-link-button"
            onClick={() => {
              setStatus(null)
              setColumnIds(DEFAULT_COLUMN_IDS)
            }}
          >
            기본값
          </button>
        </div>
        <p className="hint">
          {columnIds.length > 0 ? `${columnIds.length}개 열` : '열을 하나 이상 선택하세요'}
        </p>
      </fieldset>

      <fieldset>
        <legend>시트 구성</legend>
        <div className="option-grid option-grid-2">
          <label className="option">
            <input type="radio" name="merged" checked={!merged} onChange={() => setMerged(false)} />
            급수별 시트
          </label>
          <label className="option">
            <input type="radio" name="merged" checked={merged} onChange={() => setMerged(true)} />
            한 시트에 전부
          </label>
        </div>
        <p className="hint">
          {merged
            ? '고른 급수를 "전체" 시트 하나에 이어서 담습니다.'
            : '고른 급수마다 시트를 따로 만듭니다 (N5, N4, …).'}
        </p>
      </fieldset>

      <button type="button" className="start-button" disabled={!canExport || busy} onClick={handleExport}>
        {busy ? '만드는 중…' : '엑셀 내려받기'}
      </button>

      {status && (
        <p className={`export-status export-status-${status.type}`} role="status">
          {status.message}
        </p>
      )}
    </div>
  )
}
