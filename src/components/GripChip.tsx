import { useEffect, useRef, useState } from 'react'
import { grip, type GripState } from '../three/telemetry'

const META: Record<GripState, { label: string; color: string }> = {
  none: { label: 'No target', color: '#5c6573' },
  align: { label: 'Align gripper', color: '#f59e0b' },
  ready: { label: 'Ready to grip', color: '#22c55e' },
  gripping: { label: 'Gripping', color: '#3b82f6' },
}

/** Top-right chip reflecting real finger↔object contact. Polls via rAF (no store churn). */
export function GripChip() {
  const [state, setState] = useState<GripState>('none')
  const last = useRef<GripState>('none')
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (grip.state !== last.current) {
        last.current = grip.state
        setState(grip.state)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const m = META[state]
  return (
    <div className="status-chip grip-chip">
      GRIP
      <span className="dot" style={{ color: m.color }}>
        <i style={{ background: m.color, boxShadow: `0 0 10px ${m.color}` }} />
        {m.label}
      </span>
    </div>
  )
}
