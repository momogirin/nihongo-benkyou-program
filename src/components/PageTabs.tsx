import './PageTabs.css'

export interface PageTab<T extends string> {
  id: T
  label: string
}

interface Props<T extends string> {
  // 페이지 제목 — 사이드바에서 고른 화면 이름과 같다(한자/가나/활용).
  // 하위 탭은 이 아래에 놓여 "제목 → 툴바 → 본문" 순서를 지킨다.
  title: string
  tabs: PageTab<T>[]
  active: T
  onChange: (id: T) => void
}

// 한 화면 안에서 학습/퀴즈처럼 성격이 다른 모드를 오가는 탭 줄.
// 예전에는 각 페이지가 탭만 렌더하고 제목은 하위 페이지가 따로 렌더해서
// 탭이 제목보다 위에 왔고("퀴즈" 탭인데 제목은 "학습 설정"처럼 라벨도
// 어긋났다), 여기로 모아 제목과 탭을 한 덩어리로 만든다.
export default function PageTabs<T extends string>({ title, tabs, active, onChange }: Props<T>) {
  return (
    <div className="page-tabs-header">
      <h1 className="page-tabs-title">{title}</h1>
      <div className="page-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === active}
            className={`page-tab${tab.id === active ? ' active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
