import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import HomePage from './pages/HomePage'
import StudyPage from './pages/StudyPage'
import QuizPage from './pages/QuizPage'
import WrongNotePage from './pages/WrongNotePage'
import RadicalsPage from './pages/RadicalsPage'
import BackupPage from './pages/BackupPage'
import type { PageId, QuizConfig } from './types'

const MOBILE_QUERY = '(max-width: 768px)'

function App() {
  const [page, setPage] = useState<PageId>('home')
  const [pendingQuizConfig, setPendingQuizConfig] = useState<QuizConfig | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia(MOBILE_QUERY).matches)

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

  function startQuiz(config: QuizConfig) {
    setPendingQuizConfig(config)
    setPage('quiz')
  }

  function handleNavigate(nextPage: PageId) {
    setPage(nextPage)
    if (isMobile) setSidebarOpen(false)
  }

  function renderPage() {
    switch (page) {
      case 'home':
        return <HomePage onStartQuiz={startQuiz} />
      case 'study':
        return <StudyPage onStartQuiz={startQuiz} />
      case 'quiz':
        return (
          <QuizPage
            initialConfig={pendingQuizConfig}
            onInitialConfigConsumed={() => setPendingQuizConfig(null)}
          />
        )
      case 'wrongNote':
        return <WrongNotePage onStartQuiz={startQuiz} />
      case 'radicals':
        return <RadicalsPage />
      case 'backup':
        return <BackupPage />
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
    </div>
  )
}

export default App
