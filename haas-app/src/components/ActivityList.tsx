import { useSyncExternalStore } from 'react'
import { allActivity, clearActivity, subscribeActivity } from '../session.ts'

interface Props {
  projectID: string
}

// What this tab checked out or in under the open project since sign-in (session.ts). It is not the project's
// history: other users and other tabs are not included, and a refresh clears it.
export default function ActivityList({ projectID }: Props) {
  const entries = useSyncExternalStore(subscribeActivity, allActivity).filter((a) => a.projectID === projectID)

  return (
    <div className="card activity-card">
      <div className="card-head">
        <div className="card-title">YOUR ACTIVITY THIS SESSION</div>
        {/* Clears this project's entries only. It is this tab's display list, so nothing on the server changes. */}
        <button className="btn btn-ghost btn-sm" disabled={entries.length === 0} onClick={() => clearActivity(projectID)}>Clear</button>
      </div>
      <div className="project-desc">Only actions made in this tab are listed here.</div>
      {entries.length === 0 ? (
        <div className="none-label" style={{ marginTop: 12 }}>
          Nothing yet. Check hardware in or out and it will show up here.
        </div>
      ) : (
        <ul className="activity-list">
          {entries.map((a, i) => (
            <li key={i}>
              <span className="activity-time">{a.time.toLocaleTimeString()}</span>
              {a.kind === 'out' ? 'Checked out' : 'Checked in'} {a.quantity} × {a.hwSet}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
