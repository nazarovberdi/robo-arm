import { useStore } from '../store'
import { Scene } from '../three/Scene'
import { TelemetryCards } from '../components/TelemetryCards'
import { IconInfo } from '../components/icons'

export function DashboardPage() {
  const mode = useStore((s) => s.mode)
  const hint =
    mode === 'holding'
      ? 'Holding an object — click the matching container to drop it in.'
      : mode === 'idle'
      ? 'Click an object to pick it up. Then click the matching container to drop it.'
      : 'Robot is moving…'

  return (
    <main className="main">
      <div className="topbar">
        <div>
          <h1>Workspace</h1>
          <p>Pick an object from the front row and place it in the matching container.</p>
        </div>
        <div className="status-chip">
          ROBOT STATUS
          <span className="dot">Active</span>
        </div>
      </div>

      <TelemetryCards />

      <div className="stage">
        <div className="tray-tag left">OBJECTS</div>
        <div className="tray-tag right">CONTAINERS</div>
        <Scene />
      </div>

      <div className="hint">
        <span className="info"><IconInfo /></span>
        {hint}
      </div>
    </main>
  )
}
