import { Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { DashboardPage } from './pages/DashboardPage'
import { ManualControlPage } from './pages/ManualControlPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { IconCode, IconChart, IconGear, IconHelp } from './components/icons'

export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/manual" element={<ManualControlPage />} />
        <Route
          path="/programs"
          element={<PlaceholderPage title="Programs" icon={<IconCode />} blurb="Author and sequence pick-and-place routines, save reusable programs, and replay them on the arm." />}
        />
        <Route
          path="/statistics"
          element={<PlaceholderPage title="Statistics" icon={<IconChart />} blurb="Throughput, cycle-time trends, and sorting accuracy charts for every session will live here." />}
        />
        <Route
          path="/settings"
          element={<PlaceholderPage title="Settings" icon={<IconGear />} blurb="Tune joint limits, speed profiles, units, and scene preferences for the simulator." />}
        />
        <Route
          path="/help"
          element={<PlaceholderPage title="Help" icon={<IconHelp />} blurb="Guides, keyboard shortcuts, and an interactive tour of the RoboArm workspace." />}
        />
      </Routes>
    </div>
  )
}
