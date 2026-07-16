import { canSpeak, speak } from '../lib/tts'

interface Props {
  text: string
  lang: 'en-US' | 'ja-JP'
  size?: number
}

// 세 도메인(영어 단어/일본어 단어/한자) 학습·상세·퀴즈 화면이 공유하는 발음
// 듣기 버튼. canSpeak이 false인 브라우저에서는 아예 렌더링하지 않음.
export default function SpeakerButton({ text, lang, size = 18 }: Props) {
  if (!canSpeak) return null
  return (
    <button
      type="button"
      className="vocab-speaker-button"
      onClick={() => speak(text, lang)}
      aria-label={`${text} 발음 듣기`}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path
          fill="currentColor"
          d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-.77-3.29-2-4.24v8.47c1.23-.94 2-2.46 2-4.23zM18 4.55v1.63c2.89 1.16 5 3.98 5 7.32s-2.11 6.16-5 7.32v1.63c3.78-1.19 6.5-4.71 6.5-8.95S21.78 5.74 18 4.55z"
        />
      </svg>
    </button>
  )
}
