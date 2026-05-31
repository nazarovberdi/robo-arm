interface Props {
  title: string
  blurb: string
  icon: React.ReactNode
}

export function PlaceholderPage({ title, blurb, icon }: Props) {
  return (
    <main className="main">
      <div className="topbar">
        <div>
          <h1>{title}</h1>
          <p>RoboArm control suite</p>
        </div>
        <div className="status-chip">
          ROBOT STATUS
          <span className="dot">Active</span>
        </div>
      </div>

      <div className="placeholder">
        <div className="inner">
          <div className="pic">{icon}</div>
          <h2>{title}</h2>
          <p>{blurb}</p>
          <span className="badge-soon">Coming soon</span>
        </div>
      </div>
    </main>
  )
}
