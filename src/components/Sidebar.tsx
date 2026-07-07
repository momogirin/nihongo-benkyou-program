import { useEffect, useState } from 'react'
import type { PageId } from '../types'
import './Sidebar.css'

// "일본어" is a subject group today; other subjects (다른 언어) would become
// sibling groups alongside it later, so its children live in their own list
// instead of being flattened into the top-level nav.
const JAPANESE_ITEMS: { id: PageId; label: string }[] = [
  { id: 'study', label: '학습' },
  { id: 'quiz', label: '퀴즈' },
  { id: 'wrongNote', label: '오답노트' },
  { id: 'radicals', label: '부수' },
]
const JAPANESE_PAGE_IDS = new Set(JAPANESE_ITEMS.map((item) => item.id))

interface Props {
  active: PageId
  onNavigate: (page: PageId) => void
  open: boolean
  onToggle: () => void
}

export default function Sidebar({ active, onNavigate, open, onToggle }: Props) {
  const [japaneseExpanded, setJapaneseExpanded] = useState(() => JAPANESE_PAGE_IDS.has(active))

  // if navigation to a 일본어 sub-page happens from elsewhere (e.g. HomePage
  // quick links), expand the group so the active item is visible
  useEffect(() => {
    if (JAPANESE_PAGE_IDS.has(active)) setJapaneseExpanded(true)
  }, [active])

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

        <button
          type="button"
          className={`nav-group-toggle${japaneseExpanded ? ' expanded' : ''}`}
          aria-expanded={japaneseExpanded}
          onClick={() => setJapaneseExpanded((v) => !v)}
        >
          일본어
          <span className="nav-group-chevron" aria-hidden="true">
            ▾
          </span>
        </button>
        {japaneseExpanded && (
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
        )}

        <button
          type="button"
          className={`nav-item${active === 'backup' ? ' active' : ''}`}
          onClick={() => onNavigate('backup')}
        >
          백업
        </button>
      </nav>
    </aside>
  )
}
