// 한글/일본어 IME로 글자를 조합하는 도중 누르는 Enter는 "조합 확정" 용도라
// 브라우저가 keydown.key를 'Enter'로 보고하면서도 실제로는 텍스트 입력창 밖의
// 우리 코드가 그걸 "제출"로 오인해선 안 된다. isComposing이 표준 신호이고,
// 일부 구형 브라우저는 조합 종료 직후의 keyup에서만 229(Process)를 남기므로
// 둘 다 확인한다.
export function isComposingEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}
