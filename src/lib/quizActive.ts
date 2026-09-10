import { useSyncExternalStore } from 'react'

// 퀴즈가 진행 중인지 앱 전체가 알아야 하는 값 — 사이드바로 화면을 옮기면
// 풀던 문제가 예고 없이 사라지므로, App이 이 값을 보고 이동 전에 확인을 받는다.
//
// QuizRunner를 쓰는 페이지가 7개(한자/단어/문법/활용/가나/모의고사/영어단어)라
// 페이지마다 상태를 올려보내는 대신 모듈 단위 스토어를 둔다. QuizRunner가
// 마운트/언마운트될 때만 갱신하므로 값을 쓰는 곳은 이 파일 하나뿐이다.
let active = false
const listeners = new Set<() => void>()

export function setQuizActive(next: boolean) {
  if (active === next) return
  active = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useQuizActive(): boolean {
  return useSyncExternalStore(subscribe, () => active, () => false)
}
