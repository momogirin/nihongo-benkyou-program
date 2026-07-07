import { useState, type ChangeEvent } from 'react'
import {
  getAllRadicalStudyProgress,
  getAllStudyProgress,
  getInProgressQuiz,
  getQuizHistory,
  getWrongNotes,
  importInProgressQuiz,
  importQuizHistory,
  importRadicalStudyProgress,
  importStudyProgress,
  importWrongNotes,
  type InProgressQuiz,
  type WrongNoteEntry,
} from '../lib/storage'
import type { QuizHistoryEntry } from '../types'
import './BackupPage.css'

interface BackupFile {
  version: 4
  exportedAt: string
  wrongNotes: WrongNoteEntry[]
  quizHistory: QuizHistoryEntry[]
  studyProgress: Record<string, number>
  radicalStudyProgress: Record<string, number>
  inProgressQuiz: InProgressQuiz | null
}

type Status = { type: 'success' | 'error'; message: string }

function isBackupFile(value: unknown): value is BackupFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as BackupFile).wrongNotes)
  )
}

export default function BackupPage() {
  const [status, setStatus] = useState<Status | null>(null)

  function handleExport() {
    const payload: BackupFile = {
      version: 4,
      exportedAt: new Date().toISOString(),
      wrongNotes: getWrongNotes(),
      quizHistory: getQuizHistory(),
      studyProgress: getAllStudyProgress(),
      radicalStudyProgress: getAllRadicalStudyProgress(),
      inProgressQuiz: getInProgressQuiz(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStamp = payload.exportedAt.slice(0, 10)
    a.href = url
    a.download = `kanji-backup-${dateStamp}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatus({ type: 'success', message: '내보내기 완료' })
  }

  function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result))
        if (!isBackupFile(parsed)) throw new Error('invalid shape')
        importWrongNotes(parsed.wrongNotes)
        if (parsed.quizHistory) importQuizHistory(parsed.quizHistory)
        if (parsed.studyProgress) importStudyProgress(parsed.studyProgress)
        if (parsed.radicalStudyProgress) importRadicalStudyProgress(parsed.radicalStudyProgress)
        if (parsed.inProgressQuiz) importInProgressQuiz(parsed.inProgressQuiz)
        setStatus({ type: 'success', message: `가져오기 완료 (오답 ${parsed.wrongNotes.length}건)` })
      } catch {
        setStatus({ type: 'error', message: '올바른 백업 파일이 아닙니다' })
      }
    }
    reader.onerror = () => setStatus({ type: 'error', message: '파일을 읽지 못했습니다' })
    reader.readAsText(file)
  }

  return (
    <div className="page">
      <h1>백업</h1>
      <p className="page-placeholder">
        기기를 옮길 때 학습 진도(오답노트 · 퀴즈 기록 · 급수별 학습 진도 · 마무리못한 퀴즈)를 내보내고 불러올 수 있습니다.
      </p>

      <div className="backup-actions">
        <button type="button" className="backup-button" onClick={handleExport}>
          내보내기
        </button>
        <label className="backup-button">
          가져오기
          <input
            type="file"
            accept="application/json"
            className="backup-file-input"
            onChange={handleImport}
          />
        </label>
      </div>

      {status && (
        <p className={`backup-status backup-status-${status.type}`} role="status">
          {status.message}
        </p>
      )}
    </div>
  )
}
