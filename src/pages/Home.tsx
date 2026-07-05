import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PlusCircle, Shield, Users, Zap, ArrowRight } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import AjoCard from '../components/AjoCard'

const features = [
  { icon: Users, title: 'Group Savings', desc: 'Create ajo circles with trusted members' },
  { icon: Shield, title: 'Secure Voting', desc: 'Democratic decisions on membership & rules' },
  { icon: Zap, title: 'Nimiq Payments', desc: 'Contribute directly from your Nimiq wallet' },
]

export default function Home() {
  const { wallet, connecting, connect, groups, loadDemo } = useAjo()

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
            AjoCoin brings traditional rotating savings to the Nimiq blockchain — transparent, secure, and community-driven.
          </p>

          {!wallet.address ? (
            <button onClick={connect} disabled={connecting} className="btn-primary inline-flex items-center gap-2">
              {connecting ? 'Connecting…' : 'Get Started'}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <Link to="/create" className="btn-primary inline-flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Create New Ajo
            </Link>
          )}
        </div>

        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-nimiq-green/10 blur-2xl" />
        <div className="absolute -right-2 -top-2 w-20 h-20 rounded-full bg-ajo-gold/10 blur-xl" />
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

      {groups.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Your Groups</h3>
            <Link to="/dashboard" className="text-xs text-nimiq-green font-medium">View all</Link>
          </div>
          <div className="space-y-3">
            {groups.slice(0, 2).map(group => (
              <AjoCard key={group.id} group={group} />
            ))}
          </div>
        </section>
      )}

      {wallet.address && groups.length === 0 && (
        <div className="text-center">
          <button onClick={loadDemo} className="text-sm text-nimiq-green hover:underline">
            Load demo data to explore
          </button>
        </div>
      )}
    </div>
  )
}