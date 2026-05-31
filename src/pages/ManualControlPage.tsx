import { useEffect } from 'react'
import { useStore, type ManualTargets } from '../store'
import { Scene } from '../three/Scene'
import { GripChip } from '../components/GripChip'
import { RAIL } from '../three/config'
import { RAD2DEG } from '../three/telemetry'

const DEG = Math.PI / 180

interface JointCfg {
  key: keyof ManualTargets
  label: string
  min: number
  max: number
  unit: 'deg' | 'm'
}

const JOINTS: JointCfg[] = [
  { key: 'base', label: 'Base (yaw)', min: -180, max: 180, unit: 'deg' },
  { key: 'shoulder', label: 'Shoulder', min: -90, max: 180, unit: 'deg' },
  { key: 'elbow', label: 'Elbow', min: -170, max: 90, unit: 'deg' },
  { key: 'wrist', label: 'Wrist', min: -90, max: 180, unit: 'deg' },
  { key: 'railX', label: 'Rail position', min: RAIL.xMin, max: RAIL.xMax, unit: 'm' },
]

export function ManualControlPage() {
  const manual = useStore((s) => s.manual)
  const setManual = useStore((s) => s.setManual)
  const setManualMode = useStore((s) => s.setManualMode)

  useEffect(() => {
    setManualMode(true)
    return () => setManualMode(false)
  }, [setManualMode])

  return (
    <main className="main">
      <div className="topbar">
        <div>
          <h1>Manual Control</h1>
          <p>Drive each joint, the rail, and the gripper directly. The arm follows in real time.</p>
        </div>
        <div className="chips">
          <GripChip />
          <div className="status-chip">
            MODE
            <span className="dot">Manual</span>
          </div>
        </div>
      </div>

      <div className="manual-wrap">
        <div className="controls-panel">
          <h2>Joint Targets</h2>
          <div className="sub">Closed-loop reach is disabled in manual mode — you command joints directly.</div>

          {JOINTS.map((j) => {
            const isDeg = j.unit === 'deg'
            const val = manual[j.key]
            const display = isDeg ? `${(val * RAD2DEG).toFixed(0)}°` : `${val.toFixed(2)} m`
            const sliderVal = isDeg ? val * RAD2DEG : val
            return (
              <div className="slider-row" key={j.key}>
                <div className="top">
                  <b>{j.label}</b>
                  <span>{display}</span>
                </div>
                <input
                  type="range"
                  min={j.min}
                  max={j.max}
                  step={isDeg ? 1 : 0.05}
                  value={sliderVal}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    setManual({ [j.key]: isDeg ? n * DEG : n } as Partial<ManualTargets>)
                  }}
                />
              </div>
            )
          })}

          <div className="slider-row">
            <div className="top">
              <b>Gripper</b>
              <span>{manual.gripper > 0.5 ? 'Open' : 'Closed'}</span>
            </div>
            <div className="grip-toggle">
              <button className={manual.gripper > 0.5 ? 'on' : ''} onClick={() => setManual({ gripper: 1 })}>
                Open
              </button>
              <button className={manual.gripper <= 0.5 ? 'on' : ''} onClick={() => setManual({ gripper: 0 })}>
                Closed
              </button>
            </div>
          </div>
        </div>

        <div className="stage" style={{ margin: 0 }}>
          <Scene />
        </div>
      </div>
    </main>
  )
}
