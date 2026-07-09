import { useCallback, useEffect, useRef, useState } from 'react'
import { FirebaseError } from 'firebase/app'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './firebase'
import { applyBackupPayload, buildBackupPayload, isBackupPayload } from './storage'

// surfaces the actual Firebase error code instead of a one-size-fits-all
// message — "popup blocked" and "this domain isn't allowed to sign in" look
// identical to the user otherwise, and only one of them is fixable by them
function describeAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/popup-blocked':
        return '로그인 실패 — 브라우저가 로그인 팝업을 차단했습니다. 팝업 차단을 해제하고 다시 시도하세요'
      case 'auth/unauthorized-domain':
        return '로그인 실패 — 이 사이트 도메인이 Firebase에 승인되지 않았습니다 (Firebase 콘솔 → Authentication → Settings → 승인된 도메인에 추가 필요)'
      case 'auth/network-request-failed':
        return '로그인 실패 — 네트워크 연결을 확인하세요'
      default:
        return `로그인 실패 (${err.code})`
    }
  }
  return '로그인 실패 — 알 수 없는 오류'
}

// how often a logged-in session re-syncs in the background, on top of the
// always-on login/logout/tab-hide/manual triggers below
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000

export interface CloudSyncState {
  user: User | null
  loading: boolean
  syncing: boolean
  error: string | null
  lastSyncedAt: string | null
  signIn: () => void
  signOut: () => void
  syncNow: () => void
}

// pulls the cloud doc (if any) and merges it into local storage, then pushes
// the merged result back up — both directions use the same non-destructive
// import*() merges BackupPage's file import already relies on, so this can
// never lose progress made on either side since the last sync
export function useCloudSync(): CloudSyncState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  // guards against re-pulling on every auth-state event (token refreshes
  // fire onAuthStateChanged too, not just actual sign-in)
  const pulledRef = useRef(false)

  const syncNow = useCallback(async () => {
    if (!isFirebaseConfigured || !auth?.currentUser || !db) return
    setSyncing(true)
    setError(null)
    try {
      const ref = doc(db, 'users', auth.currentUser.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const remote = snap.data()
        if (isBackupPayload(remote)) applyBackupPayload(remote)
      }
      const merged = buildBackupPayload()
      await setDoc(ref, merged)
      setLastSyncedAt(merged.exportedAt)
    } catch (err) {
      const code = err instanceof FirebaseError ? ` (${err.code})` : ''
      setError(`동기화 실패${code} — 네트워크를 확인하고 다시 시도하세요`)
    } finally {
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
      if (nextUser && !pulledRef.current) {
        pulledRef.current = true
        syncNow()
      }
      if (!nextUser) pulledRef.current = false
    })
  }, [syncNow])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(syncNow, AUTO_SYNC_INTERVAL_MS)
    function handleVisibility() {
      if (document.visibilityState === 'hidden') syncNow()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user, syncNow])

  function signIn() {
    if (!isFirebaseConfigured || !auth) return
    setLoading(true)
    setError(null)
    signInWithPopup(auth, new GoogleAuthProvider())
      .catch((err) => {
        // user closing the account picker themselves isn't a real error
        const dismissed =
          err instanceof FirebaseError &&
          (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request')
        if (!dismissed) setError(describeAuthError(err))
      })
      .finally(() => setLoading(false))
  }

  function signOut() {
    if (!auth) return
    firebaseSignOut(auth)
  }

  return { user, loading, syncing, error, lastSyncedAt, signIn, signOut, syncNow }
}
