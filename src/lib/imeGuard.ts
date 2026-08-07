// 한글/일본어 IME로 글자를 조합하는 도중 누르는 Enter는 "조합 확정" 용도라
// 브라우저가 keydown.key를 'Enter'로 보고하면서도 실제로는 텍스트 입력창 밖의
// 우리 코드가 그걸 "제출"로 오인해선 안 된다. isComposing이 표준 신호이고,
// 일부 구형 브라우저는 조합 종료 직후의 keyup에서만 229(Process)를 남기므로
// 둘 다 확인한다.
export function isComposingEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}

// 오답 뒤 Enter로 다음 문제로 넘어가면, 그 Enter의 keyup이 아직 브라우저에
// 남아 있다. 이 시점에 다음 문제의 선택지 버튼으로 포커스를 옮기면 keyup이
// 그 버튼을 native로 "클릭"해 새 문제가 자동 제출돼 버린다.
// 예전에는 이걸 피하려고 다음 문제의 자동 포커스를 아예 건너뛰었지만, 그러면
// 포커스가 유실돼 마우스를 잡아야 했다(사용자가 반복 지적한 문제).
// 정석은 포커스는 정상적으로 주고, 그 직후 딱 한 번 오는 Enter keyup만
// 삼키는 것이다.
export function swallowNextEnterKeyup(): void {
  function onKeyUp(e: KeyboardEvent) {
    window.removeEventListener('keyup', onKeyUp, true)
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
    }
  }
  // capture 단계로 등록해야 포커스된 버튼이 keyup을 받아 click을 만들기 전에
  // 가로챌 수 있다.
  window.addEventListener('keyup', onKeyUp, true)
}
