import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PlusCircle, Shield, Users, Zap, ArrowRight } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import AjoCard from '../components/AjoCard'
import NimiqIcon from '../components/nimiq/NimiqIcon'

const features = [
  { icon: Users, title: 'Group Savings', desc: 'Create ajo circles with trusted members' },
  { icon: Shield, title: 'Secure Voting', desc: 'Democratic decisions on membership & rules' },
  { icon: Zap, title: 'Nimiq Payments', desc: 'Contribute and withdraw via your Nimiq wallet' },
]

export default function Home() {
  const { isConnected, connecting, connect, connectError, myGroups } = useAjo()

  return (
    <div className="page">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="nq-surface-pad relative overflow-hidden"
      >
        <div className="relative z-10">
          <p className="nq-label nq-gold mb-3">Decentralized Ajo</p>
          <h2 className="nq-h1 text-on-card mb-3">Save together,<br />grow together</h2>
          <p className="nq-text text-on-card-muted mb-6">
            Connect your Nimiq wallet to create groups, invite members, contribute, and withdraw — your data, your groups.
          </p>

          {!isConnected ? (
            <div className="space-y-3">
              <button onClick={connect} disabled={connecting} className="btn-primary inline-flex items-center gap-2">
                <NimiqIcon name="login" style={{ width: '1.5rem', height: '1.5rem' }} />
                {connecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
              {connectError && (
                <div className="nq-notice error"><p className="nq-text">{connectError}</p></div>
              )}
              <p className="nq-text-s text-on-card-muted">Open in Nimiq Pay to use your wallet</p>
            </div>
          ) : (
            <Link to="/create" className="btn-primary inline-flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Create New Ajo
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </motion.section>

      <section>
        <h3 className="section-title">How it works</h3>
        <div className="grid gap-4">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card flex items-center gap-5"
            >
              <div className="nq-green-bg flex items-center justify-center shrink-0" style={{ width: '5rem', height: '5rem', borderRadius: '1rem' }}>
                <Icon className="nq-green" style={{ width: '2.5rem', height: '2.5rem' }} />
              </div>
              <div>
                <p className="nq-h3 text-on-card">{title}</p>
                <p className="nq-text-s text-on-card-muted">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {isConnected && myGroups.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title" style={{ marginBottom: 0 }}>Your Groups</h3>
            <Link to="/dashboard" className="nq-link nq-text-s">View all</Link>
          </div>
          <div className="space-y-3">
            {myGroups.slice(0, 2).map(group => (
              <AjoCard key={group.id} group={group} />
            ))}
          </div>
        </section>
      )}

      {isConnected && myGroups.length === 0 && (
        <div className="nq-surface-pad">
          <p className="nq-text text-on-card-muted mb-4">No groups yet. Create one or join via an invite link.</p>
          <Link to="/create" className="btn-secondary inline-flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Create your first group
          </Link>
        </div>
      )}
    </div>
  )
}