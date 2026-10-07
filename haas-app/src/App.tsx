import { useState } from 'react'
import SignInView from './components/SignInView.tsx'
import ProjectsView from './components/ProjectsView.tsx'
import ResourcesView from './components/ResourcesView.tsx'

type Section = 'projects' | 'resources'

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'projects', label: 'User Management', icon: '◉' },
  { id: 'resources', label: 'Resource Management', icon: '◈' },
]

export default function App() {
  const [userID, setUserID] = useState<string | null>(null)
  const [projectID, setProjectID] = useState<string | null>(null)
  const [section, setSection] = useState<Section>('projects')

  if (!userID) return <SignInView onSignedIn={setUserID} />

  const signOut = () => {
    setUserID(null)
    setProjectID(null)
    setSection('projects')
  }

  return (
    <div className="app">
      <header className="header">
        <span className="header-logo">HAAS</span>
        <span className="header-sub">Hardware as a Service</span>
        <div className="header-spacer" />
        <div className="header-status">
          <span className="status-dot" />
          {userID}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign Out</button>
      </header>

      <div className="section-tabs">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            className={`sec-tab${section === s.id ? ' active' : ''}`}
            onClick={() => setSection(s.id)}
          >
            <span className="sec-tab-icon">{s.icon}</span>
            {s.label}
            {s.id === 'resources' && projectID && <span className="sec-tab-badge">{projectID}</span>}
          </button>
        ))}
      </div>

      <main className="content">
        {section === 'projects' && (
          <ProjectsView userID={userID} selectedID={projectID} onSelect={setProjectID} />
        )}
        {section === 'resources' && <ResourcesView projectID={projectID} />}
      </main>
    </div>
  )
}
