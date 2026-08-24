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
// date는 YYYY-MM-DD, time은 HH:MM(24시간). 배포한 게 실제로 반영됐는지
// 확인할 때 날짜만으로는 부족해서(같은 날 여러 번 배포한다) 시간까지 적는다.
// changes는 사용자 입장에서 뭐가 달라졌는지 쓴다
// (커밋 메시지를 그대로 옮기지 말 것 — 내부 구현 용어는 여기 필요 없다).

export type ChangeKind = '추가' | '개선' | '수정'

export interface ChangeEntry {
  kind: ChangeKind
  text: string
}

export interface Release {
  version: string
  date: string
  // 최초 기록(0.0.1)은 시간을 남기지 않아 optional. 이후 항목엔 항상 적는다.
  time?: string
  changes: ChangeEntry[]
}

// 최신 버전이 맨 앞
export const CHANGES: Release[] = [
  {
    version: '0.2.0',
    date: '2026-08-24',
    time: '17:20',
    changes: [
      { kind: '추가', text: '엑셀 내보내기 화면이 생겼습니다. 급수(전체·N5~N1)와 필요한 열을 직접 골라서, 급수별 시트 또는 한 시트로 한자 목록을 내려받을 수 있습니다.' },
      { kind: '추가', text: '계정 화면에 "캐시 비우고 새로고침" 버튼을 넣었습니다. 업데이트했는데 화면이 그대로일 때 이 버튼을 누르면 최신 버전을 다시 받아옵니다(학습 진도는 지워지지 않습니다).' },
      { kind: '개선', text: '개정이력에 업데이트 시간을 함께 표시합니다. 지금 보고 있는 화면이 최신인지 확인하기 쉬워집니다.' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-08-18',
    time: '10:34',
    changes: [
      { kind: '추가', text: 'JLPT 한자 전체(N5~N1) 2138자를 정리한 엑셀 파일을 추가했습니다.' },
    ],
  },
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
