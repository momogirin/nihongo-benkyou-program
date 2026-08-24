import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
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

  function handleNavigate(nextPage: PageId) {
    setPage(nextPage)
    if (isMobile) setSidebarOpen(false)
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
    </div>
  )
}

export default App
