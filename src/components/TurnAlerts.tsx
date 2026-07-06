import { Link } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import { useAjo } from '../context/AjoContext'

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
            className={`rounded-xl px-4 py-3 flex items-start gap-3 border ${
              isUrgent
                ? 'bg-ajo-gold/10 border-ajo-gold/30'
                : 'bg-nimiq-green/10 border-nimiq-green/20'
            }`}
          >
            <Bell className={`w-4 h-4 mt-0.5 shrink-0 ${isUrgent ? 'text-ajo-gold' : 'text-nimiq-green'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold uppercase ${isUrgent ? 'text-ajo-gold' : 'text-nimiq-green'}`}>
                {alert.type === 'ready_to_withdraw' ? 'Your turn to withdraw' : 'Up next'}
              </p>
              <p className="text-sm mt-0.5">{alert.message}</p>
              <Link
                to={`/group/${alert.groupId}`}
                className="text-xs text-white/50 hover:text-white mt-1 inline-block"
              >
                View {alert.groupName} →
              </Link>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="p-1 rounded-lg hover:bg-white/5 shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>
        )
      })}
    </div>
  )
}