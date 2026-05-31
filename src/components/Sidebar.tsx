import { NavLink } from 'react-router-dom'
import { useStore } from '../store'
import { SHAPES } from '../data/objects'
import {
  IconHome,
  IconJoystick,
  IconCode,
  IconChart,
  IconGear,
  IconHelp,
  IconRefresh,
} from './icons'

const NAV = [
  { to: '/', label: 'Dashboard', icon: <IconHome />, end: true },
  { to: '/manual', label: 'Manual Control', icon: <IconJoystick /> },
  { to: '/programs', label: 'Programs', icon: <IconCode /> },
  { to: '/statistics', label: 'Statistics', icon: <IconChart /> },
  { to: '/settings', label: 'Settings', icon: <IconGear /> },
  { to: '/help', label: 'Help', icon: <IconHelp /> },
]

export function Sidebar() {
  const objects = useStore((s) => s.objects)
  const reset = useStore((s) => s.resetWorkspace)
  const remaining = SHAPES.filter((s) => objects[s.id].status === 'tray').length

  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="mark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="9" width="14" height="9" rx="2" />
            <path d="M12 9V5M9 13h.01M15 13h.01" />
          </svg>
        </span>
        ROBO<span className="blue">ARM</span>
      </div>

      <nav className="nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {n.icon}
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="side-section">
        <span>Objects</span>
        <span className="pill">{remaining}</span>
      </div>
      <div className="obj-list">
        {SHAPES.map((s) => {
          const placed = objects[s.id].status === 'placed'
          return (
            <div key={s.id} className={`obj-row${placed ? ' depleted' : ''}`}>
              <span className="swatch" style={{ background: s.color }} />
              <span className="name">{s.label}</span>
              <span className="count">{placed ? 0 : 1}</span>
            </div>
          )
        })}
      </div>

      <button className="reset-btn" onClick={reset}>
        <IconRefresh />
        Reset Workspace
      </button>
    </aside>
  )
}
