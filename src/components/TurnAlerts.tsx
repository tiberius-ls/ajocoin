import { Link } from 'react-router-dom'
import { useAjo } from '../context/AjoContext'
import NimiqIcon from './nimiq/NimiqIcon'

export default function TurnAlerts() {
  const { myAlerts, dismissAlert } = useAjo()

  if (myAlerts.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      {myAlerts.map(alert => {
        const isUrgent = alert.type === 'ready_to_withdraw'

        return (
          <div
            key={alert.id}
            className={`nq-notice ${isUrgent ? 'warning' : 'info'} flex items-start gap-3`}
            style={{ borderRadius: '1rem' }}
          >
            <NimiqIcon
              name={isUrgent ? 'alert-triangle' : 'info-circle'}
              style={{ width: '1.75rem', height: '1.75rem', flexShrink: 0, marginTop: '0.15rem' }}
            />
            <div className="flex-1 min-w-0">
              <p className="nq-label" style={{ marginBottom: '0.25rem' }}>
                {alert.type === 'ready_to_withdraw' ? 'Your turn to withdraw' : 'Up next'}
              </p>
              <p className="nq-text" style={{ fontSize: '1.5rem' }}>{alert.message}</p>
              <Link to={`/group/${alert.groupId}`} className="nq-link nq-text-s" style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                View {alert.groupName} →
              </Link>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="nq-button-s light-blue"
              style={{ padding: '0.5rem', minWidth: 0 }}
              aria-label="Dismiss"
            >
              <NimiqIcon name="close" style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
          </div>
        )
      })}
    </div>
  )
}