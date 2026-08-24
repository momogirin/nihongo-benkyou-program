import { APP_VERSION, CHANGES } from '../data/changelog'
import './ChangelogPage.css'

export default function ChangelogPage() {
  return (
    <div className="page changelog-page">
      <div className="page-header">
        <h1>개정이력</h1>
      </div>

      {CHANGES.map((release) => (
        <section className="changelog-release" key={release.version}>
          <div className="changelog-release-head">
            <span className="changelog-version">v{release.version}</span>
            {release.version === APP_VERSION && <span className="changelog-current-badge">현재</span>}
            <span className="changelog-date">
              {release.date}
              {release.time && <span className="changelog-time"> {release.time}</span>}
            </span>
          </div>
          <ul className="changelog-list">
            {release.changes.map((change, i) => (
              <li className="changelog-item" key={i}>
                <span className={`changelog-kind changelog-kind-${change.kind}`}>{change.kind}</span>
                <span className="changelog-text">{change.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
