import { useState, type ChangeEvent } from 'react'
import { applyBackupPayload, buildBackupPayload, isBackupPayload } from '../lib/storage'
import { isFirebaseConfigured } from '../lib/firebase'
import { useCloudSync } from '../lib/useCloudSync'
import { clearAppCache, reloadFresh } from '../lib/appUpdate'
import { APP_VERSION } from '../data/changelog'
import './BackupPage.css'

type Status = { type: 'success' | 'error'; message: string }

function formatSyncTime(iso: string | null): string {
  if (!iso) return '아직 동기화 안 됨'
  return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function AccountSection() {
  const { user, loading, syncing, error, lastSyncedAt, signIn, signOut, syncNow } = useCloudSync()

  if (!isFirebaseConfigured) {
    return (
      <section className="account-section">
        <h2>로그인</h2>
        <p className="page-placeholder">
          클라우드 동기화가 아직 설정되지 않았습니다. 설정 방법은 HANDOFF.md를 참고하세요. 설정 전에는 아래
          "내보내기/가져오기"로 기기를 옮길 수 있습니다.
        </p>
      </section>
    )
  }

  return (
    <section className="account-section">
      <h2>계정 동기화</h2>
      {user ? (
        <>
          <p className="account-status">
            {user.email} 로 로그인됨 · 마지막 동기화: {formatSyncTime(lastSyncedAt)}
          </p>
          <div className="backup-actions">
            <button type="button" className="backup-button" onClick={syncNow} disabled={syncing}>
              {syncing ? '동기화 중…' : '지금 동기화'}
            </button>
            <button type="button" className="backup-button" onClick={signOut}>
              로그아웃
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="page-placeholder">
            로그인하면 이 기기의 학습 진도가 계정에 저장되어, 같은 계정으로 로그인한 다른 기기와도 자동으로
            합쳐집니다(둘 중 더 진행된 쪽 기준으로 병합 — 로그인해도 기존 진도가 지워지지 않습니다).
          </p>
          <button type="button" className="backup-button" onClick={signIn} disabled={loading}>
            {loading ? '로그인 중…' : 'Google로 로그인'}
          </button>
        </>
      )}
      {error && (
        <p className="backup-status backup-status-error" role="status">
          {error}
        </p>
      )}
    </section>
  )
}

// 캐시 비우기 — 웹앱이라 새로 배포해도 예전 화면이 남아 있을 수 있어서
// (서비스워커가 js/css를 캐시한다) 사용자가 직접 최신 버전을 받아올 수단.
// 되돌릴 수 없는 동작은 아니지만 화면이 리로드되므로 한 번 확인을 받는다.
function CacheSection() {
  const [clearing, setClearing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClear() {
    setClearing(true)
    setError(null)
    try {
      await clearAppCache()
      // 캐시를 비웠으니 곧바로 새로 받아온다 — 성공 메시지를 보여줄 새도 없이
      // 화면이 다시 뜨는 게 사용자가 기대하는 결과다
      reloadFresh()
    } catch (e) {
      // 조용히 실패시키지 않는다
      setError(`캐시를 비우지 못했습니다: ${e instanceof Error ? e.message : String(e)}`)
      setClearing(false)
      setConfirming(false)
    }
  }

  return (
    <section className="cache-section">
      <h2>업데이트</h2>
      <p className="page-placeholder">
        현재 버전 v{APP_VERSION}. 업데이트한 내용이 화면에 보이지 않으면 아래 버튼으로 저장된 캐시를 비우고
        최신 버전을 다시 받아올 수 있습니다. <strong>학습 진도와 오답노트는 지워지지 않습니다.</strong>
      </p>

      <div className="backup-actions">
        {confirming ? (
          <>
            <button type="button" className="backup-button" onClick={handleClear} disabled={clearing}>
              {clearing ? '비우는 중…' : '비우고 새로고침'}
            </button>
            <button
              type="button"
              className="backup-button"
              onClick={() => setConfirming(false)}
              disabled={clearing}
            >
              취소
            </button>
          </>
        ) : (
          <button type="button" className="backup-button" onClick={() => setConfirming(true)}>
            캐시 비우고 새로고침
          </button>
        )}
      </div>

      {confirming && !clearing && (
        <p className="backup-status" role="status">
          화면이 새로 고쳐집니다. 계속할까요?
        </p>
      )}

      {error && (
        <p className="backup-status backup-status-error" role="status">
          {error}
        </p>
      )}
    </section>
  )
}

export default function BackupPage() {
  const [status, setStatus] = useState<Status | null>(null)

  function handleExport() {
    const payload = buildBackupPayload()
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
        if (!isBackupPayload(parsed)) throw new Error('invalid shape')
        applyBackupPayload(parsed)
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
      <h1>계정</h1>

      <AccountSection />

      <h2>파일로 내보내기/가져오기</h2>
      <p className="page-placeholder">
        기기를 옮길 때 학습 진도(오답노트 · 퀴즈 기록 · 급수별 한자/단어/문법 학습 진도 · 마무리못한 퀴즈)를 내보내고 불러올 수 있습니다.
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

      <CacheSection />
    </div>
  )
}
