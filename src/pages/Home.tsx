import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PlusCircle, Shield, Users, Zap, ArrowRight, Wallet } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import AjoCard from '../components/AjoCard'

const features = [
  { icon: Users, title: 'Group Savings', desc: 'Create ajo circles with trusted members' },
  { icon: Shield, title: 'Secure Voting', desc: 'Democratic decisions on membership & rules' },
  { icon: Zap, title: 'Nimiq Payments', desc: 'Contribute and withdraw via your Nimiq wallet' },
]

export default function Home() {
  const { isConnected, connecting, connect, connectError, myGroups } = useAjo()

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-nimiq-green/20 via-ajo-card to-ajo-gold/10 border border-white/5 p-6"
      >
        <div className="relative z-10">
          <p className="text-ajo-gold text-xs font-semibold uppercase tracking-wider mb-2">Decentralized Ajo</p>
          <h2 className="text-2xl font-bold leading-tight mb-2">
            Save together,<br />grow together
          </h2>
          <p className="text-sm text-white/50 mb-5 max-w-xs">
            Connect your Nimiq wallet to create groups, invite members, contribute, and withdraw — your data, your groups.
          </p>

          {!isConnected ? (
            <div className="space-y-3">
              <button onClick={connect} disabled={connecting} className="btn-primary inline-flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                {connecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
              {connectError && (
                <p className="text-xs text-red-400">{connectError}</p>
              )}
              <p className="text-[11px] text-white/30">Open in Nimiq Pay to use your wallet</p>
            </div>
          ) : (
            <Link to="/create" className="btn-primary inline-flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Create New Ajo
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-nimiq-green/10 blur-2xl" />
      </motion.section>

      <section>
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">How it works</h3>
        <div className="grid gap-3">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card flex items-center gap-4 !p-4"
            >
              <div className="w-10 h-10 rounded-xl bg-nimiq-green/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-nimiq-green" />
              </div>
              <div>
                <p className="font-medium text-sm">{title}</p>
                <p className="text-xs text-white/40">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {isConnected && myGroups.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Your Groups</h3>
            <Link to="/dashboard" className="text-xs text-nimiq-green font-medium">View all</Link>
          </div>
          <div className="space-y-3">
            {myGroups.slice(0, 2).map(group => (
              <AjoCard key={group.id} group={group} />
            ))}
          </div>
        </section>
      )}

      {isConnected && myGroups.length === 0 && (
        <div className="card text-center !py-8">
          <p className="text-sm text-white/40 mb-4">No groups yet. Create one or join via an invite link.</p>
          <Link to="/create" className="btn-secondary inline-flex items-center gap-2 text-sm">
            <PlusCircle className="w-4 h-4" /> Create your first group
          </Link>
        </div>
      )}
    </div>
  )
}