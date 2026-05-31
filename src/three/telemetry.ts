// High-frequency live values written by the arm every frame.
// Read imperatively by <LiveMetric> via rAF -> NO React re-render per frame.
export const telemetry = {
  base: 0, // radians
  shoulder: 0,
  elbow: 0,
  wrist: 0,
  railX: 0,
  gripper: 1, // 1 = open, 0 = closed
  cycleMs: 0, // current cycle elapsed (ms), 0 when idle
}

export const RAD2DEG = 180 / Math.PI
