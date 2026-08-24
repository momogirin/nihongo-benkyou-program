// 캐시 비우고 최신 버전 받아오기.
//
// 이 앱은 PWA(vite-plugin-pwa, registerType: 'autoUpdate')라 서비스워커가
// js/css/폰트를 통째로 캐시한다. 새로 배포해도 이미 설치된 서비스워커가
// "대기(waiting)" 상태로 남아 있으면, 탭을 전부 닫기 전까지는 예전 화면이
// 계속 보인다 — 사용자가 강력새로고침(Ctrl+Shift+R)을 해야 하는 이유가 이것.
//
// 그래서 여기서는 브라우저 표준 API만으로 확실하게 끊어낸다:
//   1) Cache Storage 비우기      — 캐시된 js/css/폰트 제거
//   2) 서비스워커 등록 해제       — 다음 로드 때 새 워커가 새로 설치되도록
//   3) 강제 새로고침              — 서버에서 새 파일을 다시 받아옴
//
// ⚠️ localStorage(학습 진도·오답노트)는 절대 건드리지 않는다. 여기서 지우는
// 건 "다시 내려받으면 그만인 것"뿐이고, 사용자가 쌓은 기록은 손대지 않는다.

export interface ClearCacheResult {
  caches: number // 비운 캐시 저장소 개수
  workers: number // 등록 해제한 서비스워커 개수
}

export async function clearAppCache(): Promise<ClearCacheResult> {
  let cacheCount = 0
  let workerCount = 0

  // 1) Cache Storage — 서비스워커가 받아둔 정적 파일 전부
  if ('caches' in window) {
    const keys = await caches.keys()
    const deleted = await Promise.all(keys.map((k) => caches.delete(k)))
    cacheCount = deleted.filter(Boolean).length
  }

  // 2) 서비스워커 등록 해제 — 대기 중인 옛 워커까지 같이 없앤다
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    const done = await Promise.all(regs.map((r) => r.unregister()))
    workerCount = done.filter(Boolean).length
  }

  return { caches: cacheCount, workers: workerCount }
}

// 캐시를 비운 뒤 새로 받아오기 위한 새로고침.
// location.reload()는 브라우저 메모리 캐시를 그대로 쓸 수 있어서, 쿼리스트링을
// 바꿔 "다른 주소"로 만들어 확실히 새로 받게 한다. 이 값은 남겨둘 필요가 없어
// 곧바로 지우지 않고 그대로 두되(새로고침 직후라 어차피 사라짐), 주소창이
// 지저분해지지 않도록 기존 쿼리는 유지한다.
export function reloadFresh(): void {
  const url = new URL(window.location.href)
  url.searchParams.set('_fresh', String(Date.now()))
  window.location.replace(url.toString())
}
