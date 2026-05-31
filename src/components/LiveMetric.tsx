import { useEffect, useRef } from 'react'
import { telemetry } from '../three/telemetry'

type Key = keyof typeof telemetry

/**
 * Reads a high-frequency telemetry value via rAF and writes it straight to the
 * DOM node — no React state, so the dashboard never re-renders per frame.
 */
export function LiveMetric({ field, format }: { field: Key; format: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let raf = 0
    let last = ''
    const tick = () => {
      const s = format(telemetry[field])
      if (s !== last && ref.current) {
        ref.current.textContent = s
        last = s
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [field, format])
  return <span ref={ref} className="val" />
}
