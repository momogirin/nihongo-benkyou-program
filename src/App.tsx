import { useState, type ReactElement } from 'react'
import Sidebar from './components/Sidebar'
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'
import WrongNotePage from './pages/WrongNotePage'
import BackupPage from './pages/BackupPage'
import type { PageId } from './types'

const PAGES: Record<PageId, () => ReactElement> = {
  home: HomePage,
  quiz: QuizPage,
  wrongNote: WrongNotePage,
  backup: BackupPage,
}

function App() {
  const [page, setPage] = useState<PageId>('home')
  const Page = PAGES[page]

  return (
    <div className="app-shell">
      <Sidebar active={page} onNavigate={setPage} />
      <main className="content">
        <Page />
      </main>
    </div>
  )
}

export default App
