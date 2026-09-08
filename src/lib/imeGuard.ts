// 한글/일본어 IME로 글자를 조합하는 도중 누르는 Enter는 "조합 확정" 용도라
// 브라우저가 keydown.key를 'Enter'로 보고하면서도 실제로는 텍스트 입력창 밖의
// 우리 코드가 그걸 "제출"로 오인해선 안 된다. isComposing이 표준 신호이고,
// 일부 구형 브라우저는 조합 종료 직후의 keyup에서만 229(Process)를 남기므로
// 둘 다 확인한다.
export function isComposingEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}

// 오답 뒤 Enter로 다음 문제로 넘어갈 때, 그 "한 번의 Enter"가 다음 문제까지
// 흘러들어가 선택지를 자동 제출해 버리는 걸 막는다.
//
// 경로가 두 개라 둘 다 막아야 한다:
//  1) native click — 버튼이 포커스된 상태의 Enter는 브라우저가 **keydown**
//     시점에 click으로 바꾼다(Space만 keyup이다). 우리 window keydown 리스너가
//     먼저 돌아 다음 문제로 넘기고 1번 선택지에 포커스를 주면, 그 직후
//     기본 동작이 실행되면서 새 버튼이 클릭된다. 이건 keydown에서
//     preventDefault()로 막아야 하며, keyup을 삼키는 것으로는 막을 수 없다.
//  2) keyup 잔여 — 브라우저/조합 상황에 따라 keyup 기반 활성화가 남을 수 있어
//     방어적으로 한 번 더 삼킨다.
//
// 예전에는 이걸 피하려고 다음 문제의 자동 포커스를 아예 건너뛰었지만, 그러면
// 포커스가 유실돼 마우스를 잡아야 했다(사용자가 반복 지적한 문제). 포커스는
// 정상적으로 주고, 넘어가게 만든 그 Enter의 뒷자락만 삼키는 게 정석이다.
export function swallowNextEnterKeyup(): void {
  function onKeyUp(e: KeyboardEvent) {
    window.removeEventListener('keyup', onKeyUp, true)
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
    }
  }
  window.addEventListener('keyup', onKeyUp, true)
}
