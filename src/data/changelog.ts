// 앱 버전과 개정이력 — 이 파일이 유일한 출처(single source of truth)다.
// 사이드바 하단의 버전 표시와 개정이력 페이지가 여기를 함께 읽는다.
//
// 갱신 규칙: 작업을 마칠 때마다 CHANGES 맨 앞에 새 항목을 추가한다.
// APP_VERSION은 CHANGES[0].version에서 자동으로 따라오므로 따로 고치지 않는다.
//
// 버전 체계(semver): major.minor.patch
//   patch — 버그 수정, UI 다듬기처럼 동작이 크게 바뀌지 않는 변경
//   minor — 새 기능·새 화면 추가, 학습 방식이 바뀌는 변경
//   major — 전체 구조가 바뀌는 큰 개편
//
// date는 YYYY-MM-DD. changes는 사용자 입장에서 뭐가 달라졌는지 쓴다
// (커밋 메시지를 그대로 옮기지 말 것 — 내부 구현 용어는 여기 필요 없다).

export type ChangeKind = '추가' | '개선' | '수정'

export interface ChangeEntry {
  kind: ChangeKind
  text: string
}

export interface Release {
  version: string
  date: string
  changes: ChangeEntry[]
}

// 최신 버전이 맨 앞
export const CHANGES: Release[] = [
  {
    version: '0.0.1',
    date: '2026-08-11',
    changes: [
      { kind: '추가', text: '버전 표시와 개정이력 페이지를 추가했습니다. 이 시점까지의 기능을 최초 버전으로 기록합니다.' },
      { kind: '추가', text: '한자·단어·문법·가나·활용 학습과 퀴즈, 모의고사, 오답노트, 계정 동기화를 제공합니다.' },
    ],
  },
]

export const APP_VERSION = CHANGES[0].version
