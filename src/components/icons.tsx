// Minimal stroke icons (lucide-style), 24x24 viewBox.
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const IconHome = () => (
  <svg {...base}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
)
export const IconJoystick = () => (
  <svg {...base}><circle cx="12" cy="7" r="3" /><path d="M12 10v6" /><rect x="6" y="16" width="12" height="5" rx="2" /></svg>
)
export const IconCode = () => (
  <svg {...base}><path d="m9 8-4 4 4 4" /><path d="m15 8 4 4-4 4" /></svg>
)
export const IconChart = () => (
  <svg {...base}><path d="M4 20V4" /><path d="M4 20h16" /><rect x="7" y="11" width="3" height="6" /><rect x="13" y="7" width="3" height="10" /></svg>
)
export const IconGear = () => (
  <svg {...base}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>
)
export const IconHelp = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4 1.8c0 1.7-2.5 2-2.5 3.2" /><path d="M12 17h.01" /></svg>
)
export const IconRobot = () => (
  <svg {...base}><rect x="5" y="8" width="14" height="10" rx="2" /><path d="M12 8V5M9 13h.01M15 13h.01M3 13h2M19 13h2" /></svg>
)
export const IconGauge = () => (
  <svg {...base}><path d="M12 14 16 9" /><circle cx="12" cy="13" r="8" /><path d="M12 13h.01" /></svg>
)
export const IconGripper = () => (
  <svg {...base}><path d="M7 4v6a5 5 0 0 0 10 0V4" /><path d="M7 4h2M15 4h2" /><path d="M12 15v5" /></svg>
)
export const IconSpeed = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 12l4-3" /></svg>
)
export const IconClock = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
)
export const IconCheck = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
)
export const IconRefresh = () => (
  <svg {...base}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>
)
export const IconInfo = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
)
