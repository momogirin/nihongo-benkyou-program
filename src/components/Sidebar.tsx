import { useState } from 'react'
import type { PageId } from '../types'
import { getStoredTheme, setTheme, type ThemeMode } from '../lib/theme'
import './Sidebar.css'

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'light', label: '라이트' },
  { mode: 'dark', label: '다크' },
  { mode: 'system', label: '시스템' },
]

// "일본어" is a subject group today; other subjects (다른 언어) would become
// sibling groups alongside it later, so its children live in their own list
// instead of being flattened into the top-level nav. It's always expanded
// since it's the only subject group right now.
const JAPANESE_ITEMS: { id: PageId; label: string }[] = [
  { id: 'kanji', label: '한자' },
  { id: 'vocab', label: '단어' },
  { id: 'grammar', label: '문법' },
  { id: 'mockExam', label: '모의고사' },
  { id: 'wrongNote', label: '오답노트' },
]

interface Props {
  active: PageId
  onNavigate: (page: PageId) => void
  open: boolean
  onToggle: () => void
}

export default function Sidebar({ active, onNavigate, open, onToggle }: Props) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredTheme())

  function handleThemeChange(mode: ThemeMode) {
    setTheme(mode)
    setThemeMode(mode)
  }

  return (
    <aside className={`sidebar${open ? ' open' : ' closed'}`}>
      <div className="brand">
        <span className="brand-mark">字</span>
        <span className="brand-name">한자 학습</span>
        <button type="button" className="sidebar-close-button" aria-label="메뉴 닫기" onClick={onToggle}>
          ✕
        </button>
      </div>
      <nav>
        <button
          type="button"
          className={`nav-item${active === 'home' ? ' active' : ''}`}
          onClick={() => onNavigate('home')}
        >
          홈
        </button>

        <div className="nav-group-label">일본어</div>
        <div className="nav-subgroup">
          {JAPANESE_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item nav-subitem${active === item.id ? ' active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`nav-item${active === 'backup' ? ' active' : ''}`}
          onClick={() => onNavigate('backup')}
        >
          계정
        </button>
      </nav>

      <div className="theme-toggle">
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.mode}
            type="button"
            className={`theme-toggle-btn${themeMode === opt.mode ? ' active' : ''}`}
            aria-pressed={themeMode === opt.mode}
            onClick={() => handleThemeChange(opt.mode)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </aside>
  )
}
