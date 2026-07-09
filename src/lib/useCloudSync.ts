import { useCallback, useEffect, useRef, useState } from 'react'
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
    } catch {
      setError('동기화 실패 — 네트워크를 확인하고 다시 시도하세요')
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
    signInWithPopup(auth, new GoogleAuthProvider()).catch(() => {
      setError('로그인 실패 — 팝업이 차단되지 않았는지 확인하세요')
      setLoading(false)
    })
  }

  function signOut() {
    if (!auth) return
    firebaseSignOut(auth)
  }

  return { user, loading, syncing, error, lastSyncedAt, signIn, signOut, syncNow }
}
