import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PlusCircle, Users } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import AjoCard from '../components/AjoCard'
import EmptyState from '../components/EmptyState'
import { formatNim } from '../lib/utils'

export default function Dashboard() {
  const { groups, contributions, wallet, connect, connecting } = useAjo()

  const totalContributed = contributions
    .filter(c => c.memberAddress === wallet.address)
    .reduce((sum, c) => sum + c.amount, 0)

  const activeGroups = groups.filter(g => g.status === 'active').length

  if (!wallet.address) {
    return (
      <EmptyState
        icon={Users}
        title="Connect to view groups"
        description="Link your Nimiq wallet to see and manage your ajo groups."
        action={
          <button onClick={connect} disabled={connecting} className="btn-primary">
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">My Groups</h2>
        <p className="text-sm text-white/40">Manage your savings circles</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active', value: activeGroups },
          { label: 'Total', value: groups.length },
          { label: 'Contributed', value: formatNim(totalContributed) },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card !p-3 text-center"
          >
            <p className="text-lg font-bold text-nimiq-green">{stat.value}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No groups yet"
          description="Create your first ajo group or join an existing one."
          action={
            <Link to="/create" className="btn-primary inline-flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Create Group
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group, i) => (
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