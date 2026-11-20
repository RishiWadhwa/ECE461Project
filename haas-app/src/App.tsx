import { useEffect, useState } from 'react'
import SignInView from './components/SignInView.tsx'
import ProjectsView from './components/ProjectsView.tsx'
import ResourcesView from './components/ResourcesView.tsx'
import ConnectionBanner from './components/ConnectionBanner.tsx'
import { useConnectionStatus } from './connection.ts'
import { clear as clearSession, loadNav, saveNav } from './session.ts'

export default function App() {
  // Restored from sessionStorage so a refresh keeps the user on the same page (see session.ts).
  const [initial] = useState(loadNav)
  const [userID, setUserID] = useState<string | null>(initial.userID)
  // Three pages without a router: no userID shows Sign In, no projectID shows Projects, otherwise Hardware.
  const [projectID, setProjectID] = useState<string | null>(initial.projectID)
  const connection = useConnectionStatus()

  // Signed out writes nothing: signOut() already cleared the stored copy.
  useEffect(() => {
    if (userID) saveNav({ userID, projectID })
  }, [userID, projectID])

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
          <ResourcesView projectID={projectID} userID={userID} onBack={() => setProjectID(null)} />
        ) : (
          <ProjectsView userID={userID} onOpen={setProjectID} />
        )}
      </main>
    </div>
  )
}
