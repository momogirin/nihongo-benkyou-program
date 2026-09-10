import { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import { useQuizActive } from './lib/quizActive'
import HomePage from './pages/HomePage'
import KanaPage from './pages/KanaPage'
import KanjiPage from './pages/KanjiPage'
import WrongNotePage from './pages/WrongNotePage'
import VocabPage from './pages/VocabPage'
import GrammarPage from './pages/GrammarPage'
import ConjugationPage from './pages/ConjugationPage'
import MockExamPage from './pages/MockExamPage'
import EnglishVocabPage from './pages/EnglishVocabPage'
import ExportPage from './pages/ExportPage'
import BackupPage from './pages/BackupPage'
import ChangelogPage from './pages/ChangelogPage'
import type { PageId, QuizConfig } from './types'

const MOBILE_QUERY = '(max-width: 768px)'

function App() {
  const [page, setPage] = useState<PageId>('home')
  const [pendingQuizConfig, setPendingQuizConfig] = useState<QuizConfig | null>(null)
  const [resumeRequested, setResumeRequested] = useState(false)
  const [pendingVocabRetryIds, setPendingVocabRetryIds] = useState<string[] | null>(null)
  const [pendingGrammarRetryIds, setPendingGrammarRetryIds] = useState<string[] | null>(null)
  const [pendingEnglishVocabRetryIds, setPendingEnglishVocabRetryIds] = useState<string[] | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia(MOBILE_QUERY).matches)
  // 퀴즈 진행 중 사이드바로 이동하려 할 때 잡아두는 목적지 — 확인 후에만 이동한다
  const quizActive = useQuizActive()
  const [pendingNav, setPendingNav] = useState<PageId | null>(null)
  const confirmLeaveButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    function handleChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches)
      setSidebarOpen(!e.matches)
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (!isMobile || !sidebarOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMobile, sidebarOpen])

  // 이탈 확인 다이얼로그: Esc = 취소, Enter = 확인(앱 전역 확인 다이얼로그 규칙).
  // 퀴즈 화면이 Enter를 제출 키로 쓰므로, 다이얼로그가 떠 있는 동안에는
  // capture 단계에서 먼저 잡아 아래로 새지 않게 한다.
  useEffect(() => {
    if (!pendingNav) return
    confirmLeaveButtonRef.current?.focus()
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setPendingNav(null)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        confirmLeaveQuiz()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
    // pendingNav가 바뀔 때만 다시 걸면 된다 — handleKeyDown이 읽는 값은
    // pendingNav뿐이고, 나머지는 setState라 최신 여부와 무관하다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNav])

  function startQuiz(config: QuizConfig) {
    setPendingQuizConfig(config)
    setPage('kanji')
  }

  function resumeQuiz() {
    setResumeRequested(true)
    setPage('kanji')
  }

  function retryVocab(ids: string[]) {
    setPendingVocabRetryIds(ids)
    setPage('vocab')
  }

  function retryGrammar(ids: string[]) {
    setPendingGrammarRetryIds(ids)
    setPage('grammar')
  }

  function retryEnglishVocab(ids: string[]) {
    setPendingEnglishVocabRetryIds(ids)
    setPage('englishVocab')
  }

  function goToPage(nextPage: PageId) {
    setPage(nextPage)
    if (isMobile) setSidebarOpen(false)
  }

  // 퀴즈를 푸는 중이면 바로 옮기지 않고 확인을 받는다 — 진행 상황은 문제마다
  // 저장되므로 데이터가 사라지진 않지만, 예고 없이 화면이 바뀌면 실수로
  // 누른 사용자가 풀던 문제를 잃은 것처럼 느낀다
  function handleNavigate(nextPage: PageId) {
    if (quizActive && nextPage !== page) {
      setPendingNav(nextPage)
      return
    }
    goToPage(nextPage)
  }

  function confirmLeaveQuiz() {
    if (pendingNav) goToPage(pendingNav)
    setPendingNav(null)
  }

  function renderPage() {
    switch (page) {
      case 'home':
        return (
          <HomePage
            onStartQuiz={startQuiz}
            onResumeQuiz={resumeQuiz}
            onGoToStudy={() => handleNavigate('kanji')}
            onGoToVocab={() => handleNavigate('vocab')}
            onGoToGrammar={() => handleNavigate('grammar')}
            onGoToMockExam={() => handleNavigate('mockExam')}
            onGoToEnglishVocab={() => handleNavigate('englishVocab')}
            onGoToKana={() => handleNavigate('kana')}
            onGoToConjugation={() => handleNavigate('conjugation')}
            onRetryVocab={retryVocab}
            onRetryGrammar={retryGrammar}
            onRetryEnglishVocab={retryEnglishVocab}
          />
        )
      case 'kana':
        return <KanaPage />
      case 'kanji':
        return (
          <KanjiPage
            quizConfig={pendingQuizConfig}
            onQuizConfigConsumed={() => setPendingQuizConfig(null)}
            resumeRequested={resumeRequested}
            onResumeRequestConsumed={() => setResumeRequested(false)}
          />
        )
      case 'wrongNote':
        return (
          <WrongNotePage
            onStartQuiz={startQuiz}
            onRetryVocab={retryVocab}
            onRetryGrammar={retryGrammar}
            onRetryEnglishVocab={retryEnglishVocab}
            onGoToKana={() => handleNavigate('kana')}
            onGoToConjugation={() => handleNavigate('conjugation')}
          />
        )
      case 'vocab':
        return (
          <VocabPage
            retryIds={pendingVocabRetryIds}
            onRetryIdsConsumed={() => setPendingVocabRetryIds(null)}
          />
        )
      case 'grammar':
        return (
          <GrammarPage
            retryIds={pendingGrammarRetryIds}
            onRetryIdsConsumed={() => setPendingGrammarRetryIds(null)}
          />
        )
      case 'conjugation':
        return <ConjugationPage />
      case 'mockExam':
        return <MockExamPage />
      case 'englishVocab':
        return (
          <EnglishVocabPage
            retryIds={pendingEnglishVocabRetryIds}
            onRetryIdsConsumed={() => setPendingEnglishVocabRetryIds(null)}
          />
        )
      case 'export':
        return <ExportPage />
      case 'backup':
        return <BackupPage />
      case 'changelog':
        return <ChangelogPage />
    }
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar
        active={page}
        onNavigate={handleNavigate}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />
      {!sidebarOpen && (
        <button
          type="button"
          className="sidebar-open-button"
          aria-label="메뉴 열기"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
      )}
      <main className="content">{renderPage()}</main>

      {pendingNav && (
        <div className="confirm-modal-backdrop" onClick={() => setPendingNav(null)}>
          <div
            className="confirm-modal"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <p className="confirm-modal-message">
              퀴즈를 풀고 있습니다. 화면을 옮길까요?
              <br />
              지금까지 푼 문제는 저장되며, 홈에서 이어서 풀 수 있습니다.
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                ref={confirmLeaveButtonRef}
                className="confirm-modal-cancel"
                onClick={() => setPendingNav(null)}
              >
                계속 풀기
              </button>
              <button type="button" className="confirm-modal-danger" onClick={confirmLeaveQuiz}>
                나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
