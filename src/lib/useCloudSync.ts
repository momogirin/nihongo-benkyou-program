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
import {
  applyBackupPayload,
  buildBackupPayload,
  clearAllProgress,
  isBackupPayload,
  snapshotProgress,
} from './storage'
import { reloadFresh } from './appUpdate'

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

// 진도가 바뀐 걸 알아채기 위해 로컬 스냅샷을 확인하는 주기.
// storage.ts의 저장 함수는 54곳에서 제각기 localStorage.setItem을 부르고
// 공통 진입점이 없어서, 저장할 때마다 알림을 쏘게 하려면 그 전부를 고쳐야 한다
// (누락 위험이 크고 변경 범위도 넓다). 대신 여기서 스냅샷을 주기적으로 비교한다 —
// snapshotProgress()는 로그인 pull 판정에 이미 쓰는 함수라 새 개념이 늘지 않고,
// storage.ts는 건드리지 않는다.
const CHANGE_POLL_INTERVAL_MS = 3 * 1000

// 변화를 감지한 뒤 push까지 기다리는 시간. 문제를 연달아 푸는 동안 매번
// 올리지 않도록 묶어주되, 브라우저를 닫기 전에는 올라가도록 짧게 잡는다.
const CHANGE_PUSH_DEBOUNCE_MS = 10 * 1000

// 로그인 직후 pull 결과를 화면에 반영하려고 리로드했는지 표시하는 플래그.
// sessionStorage라 탭을 닫으면 사라지고, 로그아웃 때도 지운다.
const PULL_RELOADED_KEY = 'kanjiApp.session.pullReloaded'

// 로컬에서 무언가를 "지운" 직후 클라우드 문서를 지금 상태로 덮어쓴다.
// 일반 동기화(syncNow)는 pull→병합(union)→push라서, 삭제한 항목이 클라우드에
// 남아 있으면 다음 동기화 때 그대로 되살아난다. 삭제만큼은 pull 없이 push해야
// 다른 브라우저에도 삭제가 전파된다.
// 로그아웃 상태이거나 Firebase 미설정이면 아무것도 하지 않는다(로컬 삭제로 충분).
export async function pushLocalStateAfterDelete(): Promise<void> {
  if (!isFirebaseConfigured || !auth?.currentUser || !db) return
  const ref = doc(db, 'users', auth.currentUser.uid)
  await setDoc(ref, buildBackupPayload())
}

export interface CloudSyncState {
  user: User | null
  loading: boolean
  syncing: boolean
  error: string | null
  lastSyncedAt: string | null
  signIn: () => void
  // 마지막 push → 로그아웃 → 로컬 비우기 순으로 진행하므로 비동기다
  signOut: () => void | Promise<void>
  // 반환값(클라우드 내용이 로컬을 바꿨는지)은 훅 내부에서만 쓰고,
  // 호출하는 화면은 그냥 무시해도 된다
  syncNow: () => Promise<boolean>
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

  // 반환값은 "클라우드에서 받은 내용이 로컬 진도를 실제로 바꿨는지"다.
  // 로그인 직후 첫 동기화에서만 쓰인다(아래 onAuthStateChanged 참고).
  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!isFirebaseConfigured || !auth?.currentUser || !db) return false
    setSyncing(true)
    setError(null)
    let changed = false
    try {
      const ref = doc(db, 'users', auth.currentUser.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const remote = snap.data()
        if (isBackupPayload(remote)) {
          const before = snapshotProgress()
          applyBackupPayload(remote)
          changed = snapshotProgress() !== before
        }
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
    return changed
  }, [])

  // 진도가 바뀐 직후 올리는 경로. syncNow와 달리 pull을 하지 않는다 —
  // 방금 로컬에서 내린 진도가 클라우드의 옛 값과 union 병합되어 도로 올라오는
  // 걸 막기 위해서다(pushLocalStateAfterDelete와 같은 이유).
  // 백그라운드 동작이라 syncing 표시는 건드리지 않지만, 실패는 드러낸다.
  const pushNow = useCallback(async () => {
    if (!isFirebaseConfigured || !auth?.currentUser || !db) return
    try {
      const payload = buildBackupPayload()
      await setDoc(doc(db, 'users', auth.currentUser.uid), payload)
      setLastSyncedAt(payload.exportedAt)
      setError(null)
    } catch (err) {
      const code = err instanceof FirebaseError ? ` (${err.code})` : ''
      setError(`동기화 실패${code} — 네트워크를 확인하고 다시 시도하세요`)
    }
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
      if (nextUser && !pulledRef.current) {
        pulledRef.current = true
        // 로그인 직후 pull이 로컬 진도를 실제로 바꿨다면 한 번 리로드한다.
        // 화면들이 마운트 시점의 localStorage 스냅샷을 memo해 두기 때문에,
        // 리로드 없이는 다른 PC에서 올린 진도가 화면에 반영되지 않는다
        // (로그아웃 경로가 같은 이유로 reloadFresh()를 부른다).
        // 리로드하면 다시 로그인 이벤트 → 다시 pull이 되므로, 한 번만 돌도록
        // sessionStorage로 막는다. 두 번째 pull은 이미 병합된 상태라 changed가
        // false로 나오는 게 정상이지만, 그 판정에 기대지 않고 명시적으로 막는다.
        void syncNow().then((changed) => {
          if (!changed) return
          if (sessionStorage.getItem(PULL_RELOADED_KEY)) return
          sessionStorage.setItem(PULL_RELOADED_KEY, '1')
          reloadFresh()
        })
      }
      if (!nextUser) {
        pulledRef.current = false
        sessionStorage.removeItem(PULL_RELOADED_KEY)
      }
    })
  }, [syncNow])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(syncNow, AUTO_SYNC_INTERVAL_MS)
    function handleVisibility() {
      if (document.visibilityState === 'hidden') syncNow()
    }
    // 탭/브라우저를 닫거나 뒤로 가기로 페이지를 떠날 때. visibilitychange만으로는
    // 놓치는 경로가 있고(특히 모바일/브라우저 종료), 여기서 한 번 더 올려야
    // 마지막으로 푼 문제가 유실되지 않는다. 이 시점에는 비동기 setDoc이 끝까지
    // 가지 못할 수 있어 보장은 아니지만, 없는 것보다 확실히 낫다.
    // 떠나는 순간에는 pull→병합까지 할 시간이 없으므로 올리기만 한다.
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', pushNow)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', pushNow)
    }
  }, [user, syncNow, pushNow])

  // 진도가 바뀌면 곧바로(debounce 후) 올린다.
  // 이게 없으면 push는 5분 주기·탭 숨김·종료 시점에만 일어나서, 문제를 풀고
  // 5분 안에 브라우저를 닫으면 그만큼이 클라우드에 올라가지 않는다.
  useEffect(() => {
    if (!user) return
    // 로그인 직후 pull이 막 병합해둔 상태를 기준선으로 잡는다. 그래야 그
    // 병합분이 "새 변화"로 오인되어 곧바로 push되지 않는다.
    let baseline = snapshotProgress()
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = setInterval(() => {
      const current = snapshotProgress()
      if (current === baseline) return
      baseline = current
      // 연달아 바뀌는 동안에는 마지막 변화 기준으로 미룬다
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void pushNow()
      }, CHANGE_PUSH_DEBOUNCE_MS)
    }, CHANGE_POLL_INTERVAL_MS)

    return () => {
      clearInterval(poll)
      if (timer) clearTimeout(timer)
    }
  }, [user, pushNow])

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

  // 로그아웃은 (1) 마지막 상태를 계정에 올리고 (2) 이 기기의 로컬 진도를 비운다.
  // (2)가 없으면 같은 브라우저에서 다른 계정으로 로그인했을 때, 남아 있던 이전
  // 계정의 진도가 pull→병합(union) 과정에서 새 계정 문서에 섞여 올라간다.
  // 로컬을 비워도 진도는 방금 계정에 올라가 있으므로, 다시 로그인하면 그대로
  // 돌아온다. 마지막 push가 실패하면 로그아웃하지 않고 이유를 알린다 —
  // 여기서 조용히 비우면 아직 안 올라간 진도가 사라진다.
  async function signOut() {
    if (!auth) return
    setSyncing(true)
    setError(null)
    try {
      if (auth.currentUser && db) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), buildBackupPayload())
      }
      await firebaseSignOut(auth)
      clearAllProgress()
      // 화면 곳곳이 localStorage 스냅샷을 마운트 시점에 memo해 두므로
      // 리로드해야 비워진 상태가 제대로 반영된다
      reloadFresh()
    } catch (err) {
      const code = err instanceof FirebaseError ? ` (${err.code})` : ''
      setError(`로그아웃 실패${code} — 마지막 진도를 계정에 저장하지 못해 로그아웃을 취소했습니다`)
      setSyncing(false)
    }
  }

  return { user, loading, syncing, error, lastSyncedAt, signIn, signOut, syncNow }
}
