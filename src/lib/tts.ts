// 발음 듣기 — 브라우저 내장 Web Speech API라 데이터/서버 추가 없이 구현
// 가능(저장되는 음성 파일 없음, 매번 실시간 합성). 미지원 브라우저에서도
// 조용히 실패하지 않게 speak() 호출 전 지원 여부를 canSpeak으로 먼저 걸러
// 호출부(버튼 렌더링)에서 자체적으로 숨기게 함.
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

// cancel()로 이전 발음을 끊고 새로 재생 — 연타 시 여러 발음이 겹쳐 읽히는 것 방지
export function speak(text: string, lang: 'en-US' | 'ja-JP') {
  if (!canSpeak) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  window.speechSynthesis.speak(utterance)
}
