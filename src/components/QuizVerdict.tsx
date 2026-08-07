// 모든 퀴즈 화면이 공유하는 정/오답 문구 한 줄.
//
// 원래는 입력형 퀴즈(한자 훈음, 단어 읽기)에만 "정답입니다 / 오답 · 정답: X"가
// 있었고, 선택형 퀴즈들은 선택지 버튼 색(correct/incorrect/reveal-correct)만으로
// 결과를 알렸다. 같은 "퀴즈 채점"인데 화면마다 피드백 방식이 달라 일관성이
// 없었고, 색만으로 구분하는 건 색각 이상 사용자에게는 아예 전달되지 않는다.
//
// 그래서 문구 자체를 이 컴포넌트로 통일한다. 선택형은 이미 정답 버튼이
// reveal-correct로 드러나므로 answerLabel을 넘기지 않고 "오답입니다"까지만
// 쓰고, 정답이 화면에 남지 않는 입력형에서만 answerLabel을 넘겨 정답을 함께
// 보여준다.
//
// .quiz-feedback 스타일은 공용 QuizRunner.css에 이미 있다(모든 퀴즈 화면이
// import 중).
export default function QuizVerdict({
  isCorrect,
  answerLabel,
}: {
  isCorrect: boolean
  answerLabel?: string
}) {
  return (
    <p className={`quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
      {isCorrect ? '정답입니다' : answerLabel ? `오답 · 정답: ${answerLabel}` : '오답입니다'}
    </p>
  )
}
