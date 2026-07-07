import { useState } from 'react'
import Sidebar from './components/Sidebar'
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'
import WrongNotePage from './pages/WrongNotePage'
import RadicalsPage from './pages/RadicalsPage'
import BackupPage from './pages/BackupPage'
import type { PageId, QuizConfig } from './types'

function App() {
  const [page, setPage] = useState<PageId>('home')
  const [pendingQuizConfig, setPendingQuizConfig] = useState<QuizConfig | null>(null)

  function startQuiz(config: QuizConfig) {
    setPendingQuizConfig(config)
    setPage('quiz')
  }

  function renderPage() {
    switch (page) {
      case 'home':
        return <HomePage onStartQuiz={startQuiz} />
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
      <Sidebar active={page} onNavigate={setPage} />
      <main className="content">{renderPage()}</main>
    </div>
  )
}

export default App
