import { useState } from 'react'
import SignInView from './components/SignInView.tsx'
import ProjectsView from './components/ProjectsView.tsx'
import ResourcesView from './components/ResourcesView.tsx'
import ConnectionBanner from './components/ConnectionBanner.tsx'
import { useConnectionStatus } from './connection.ts'
import { clear as clearSession } from './session.ts'

export default function App() {
  const [userID, setUserID] = useState<string | null>(null)
  // Three pages without a router: no userID shows Sign In, no projectID shows Projects, otherwise Hardware.
  const [projectID, setProjectID] = useState<string | null>(null)
  const connection = useConnectionStatus()

  if (!userID) {
    return (
      <>
        <ConnectionBanner />
        <SignInView onSignedIn={setUserID} />
      </>
    )
  }

  const signOut = () => {
    setUserID(null)
    setProjectID(null)
    clearSession()
  }

  return (
    <div className="app">
      <header className="header">
        <span className="header-logo">HAAS</span>
        <span className="header-sub">Hardware as a Service</span>
        <div className="header-spacer" />
        <div className={`header-status${connection === 'offline' ? ' offline' : ''}`} title={`Server ${connection}`}>
          <span className="status-dot" />
          {userID}
          {connection === 'offline' && ' · offline'}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign Out</button>
      </header>
      <ConnectionBanner />

      <main className="content">
        {projectID ? (
          <ResourcesView projectID={projectID} onBack={() => setProjectID(null)} />
        ) : (
          <ProjectsView userID={userID} onOpen={setProjectID} />
        )}
      </main>
    </div>
  )
}
