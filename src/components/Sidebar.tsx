import { useState } from 'react'
import type { PageId } from '../types'
import { getStoredTheme, setTheme, type ThemeMode } from '../lib/theme'
import './Sidebar.css'

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'light', label: '라이트' },
  { mode: 'dark', label: '다크' },
  { mode: 'system', label: '시스템' },
]

// "일본어" is a subject group; other subjects (다른 언어) are sibling groups
// alongside it. Within 일본어, items are grouped by learning stage(문자 →
// 어휘·문법 → 평가) so the natural progression stays visible as the section
// grows(가나·활용 등). A section with no `label` renders its items flat.
interface NavSection {
  label?: string
  items: { id: PageId; label: string }[]
}

const JAPANESE_SECTIONS: NavSection[] = [
  { label: '문자', items: [{ id: 'kana', label: '가나' }, { id: 'kanji', label: '한자' }] },
  { label: '어휘·문법', items: [{ id: 'vocab', label: '단어' }, { id: 'grammar', label: '문법' }, { id: 'conjugation', label: '활용' }] },
  { items: [{ id: 'mockExam', label: '모의고사' }] },
]

// 일본어의 형제 그룹 — 2026-07-14 추가(이 파일 위 주석이 예견했던 그대로).
const ENGLISH_ITEMS: { id: PageId; label: string }[] = [{ id: 'englishVocab', label: '단어' }]

// 오답노트는 일본어 세 도메인+영어 단어를 전부 한 화면에서 다루는 과목 공용
// 화면이라, 특정 과목 그룹 안에 두지 않고 홈/계정과 같은 최상위 항목으로 둔다.

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
        <span className="brand-mark">M</span>
        <span className="brand-name">모모링고</span>
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
        {JAPANESE_SECTIONS.map((section, i) => (
          <div className="nav-subgroup" key={section.label ?? `section-${i}`}>
            {section.label && <div className="nav-subsection-label">{section.label}</div>}
            {section.items.map((item) => (
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
        ))}

        <div className="nav-group-label">영어</div>
        <div className="nav-subgroup">
          {ENGLISH_ITEMS.map((item) => (
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
          className={`nav-item${active === 'wrongNote' ? ' active' : ''}`}
          onClick={() => onNavigate('wrongNote')}
        >
          오답노트
        </button>

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
