import { useStore } from '../store'
import { SHAPES } from '../data/objects'
import { RAD2DEG } from '../three/telemetry'
import { LiveMetric } from './LiveMetric'
import { IconGauge, IconGripper, IconSpeed, IconClock, IconCheck } from './icons'

const deg = (v: number) => `${(v * RAD2DEG).toFixed(1)}°`
const grip = (v: number) => (v > 0.5 ? 'Open' : 'Closed')
const time = (ms: number) => {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function Card({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <span className="ic">{icon}</span>
      <div>
        <div className="lbl">{label}</div>
        {children}
      </div>
    </div>
  )
}

export function TelemetryCards() {
  const completed = useStore((s) => s.completed)
  const speed = useStore((s) => s.speedPct)
  const setSpeed = useStore((s) => s.setSpeed)
  const total = SHAPES.length

  return (
    <>
      <div className="telemetry">
        <Card icon={<IconGauge />} label="Base Angle"><LiveMetric field="base" format={deg} /></Card>
        <Card icon={<IconGauge />} label="Shoulder Angle"><LiveMetric field="shoulder" format={deg} /></Card>
        <Card icon={<IconGauge />} label="Elbow Angle"><LiveMetric field="elbow" format={deg} /></Card>
        <Card icon={<IconGauge />} label="Wrist Angle"><LiveMetric field="wrist" format={deg} /></Card>
      </div>
      <div className="telemetry">
        <Card icon={<IconGripper />} label="Gripper"><LiveMetric field="gripper" format={grip} /></Card>
        <div className="card speed-card">
          <div className="row">
            <span className="ic"><IconSpeed /></span>
            <div>
              <div className="lbl">Speed</div>
              <div className="val">{speed}%</div>
            </div>
          </div>
          <input type="range" min={10} max={100} step={5} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
        </div>
        <Card icon={<IconClock />} label="Cycle Time"><LiveMetric field="cycleMs" format={time} /></Card>
        <Card icon={<IconCheck />} label="Completed">
          <div className="val">
            {completed} / {total}
          </div>
        </Card>
      </div>
    </>
  )
}
