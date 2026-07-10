import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import AjoCard from '../components/AjoCard'
import EmptyState from '../components/EmptyState'
import { formatNim } from '../lib/utils'
import NimiqIcon from '../components/nimiq/NimiqIcon'

export default function Dashboard() {
  const { isConnected, connecting, connect, connectError, myGroups, contributions, withdrawals, wallet } = useAjo()

  const totalContributed = contributions
    .filter(c => c.memberAddress === wallet.address)
    .reduce((sum, c) => sum + c.amount, 0)

  const totalWithdrawn = withdrawals
    .filter(w => w.memberAddress === wallet.address)
    .reduce((sum, w) => sum + w.amount, 0)

  if (!isConnected) {
    return (
      <EmptyState
        icon={Users}
        title="Connect your wallet"
        description="Link your Nimiq wallet to see and manage your ajo groups."
        action={
          <div className="space-y-3">
            <button onClick={connect} disabled={connecting} className="btn-primary">
              {connecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
            {connectError && <div className="nq-notice error w-full"><p className="nq-text">{connectError}</p></div>}
          </div>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="nq-h1 text-on-blue">My Groups</h2>
        <p className="nq-text text-on-blue-muted">Groups you've created or joined</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Groups', value: String(myGroups.length) },
          { label: 'Contributed', value: formatNim(totalContributed) },
          { label: 'Withdrawn', value: formatNim(totalWithdrawn) },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card !p-3 text-center"
          >
            <p className="nq-h2 nq-green">{stat.value}</p>
            <p className="nq-label text-on-card-muted" style={{ fontSize: '1rem' }}>{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {myGroups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No groups yet"
          description="Create your first ajo group or ask a friend to share their invite link."
          action={
            <Link to="/create" className="btn-primary inline-flex items-center gap-2">
              <NimiqIcon name="plus-circle" style={{ width: '1.25rem', height: '1.25rem' }} />
              Create Group
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {myGroups.map((group, i) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <AjoCard group={group} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}