import type { PageId } from '../types'
import './Sidebar.css'

const NAV_ITEMS: { id: PageId; label: string }[] = [
  { id: 'home', label: '홈' },
  { id: 'study', label: '학습' },
  { id: 'quiz', label: '퀴즈' },
  { id: 'wrongNote', label: '오답노트' },
  { id: 'radicals', label: '부수' },
  { id: 'backup', label: '백업' },
]

interface Props {
  active: PageId
  onNavigate: (page: PageId) => void
}

export default function Sidebar({ active, onNavigate }: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">字</span>
        <span className="brand-name">한자 학습</span>
      </div>
      <nav>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item${active === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
