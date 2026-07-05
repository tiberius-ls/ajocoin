import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Clock, Send, UserPlus } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import { formatNim, shortenAddress, formatDate } from '../lib/utils'

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const { groups, wallet, contribute, joinGroup, contributions } = useAjo()
  const [contributing, setContributing] = useState(false)
  const [joinName, setJoinName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const group = groups.find(g => g.id === id)

  if (!group) {
    return (
      <div className="text-center py-20">
        <p className="text-white/40 mb-4">Group not found</p>
        <Link to="/dashboard" className="text-nimiq-green text-sm">← Back to groups</Link>
      </div>
    )
  }

  const isMember = group.members.some(m => m.address === wallet.address)
  const currentMember = group.members.find(m => m.address === wallet.address)
  const groupContributions = contributions.filter(c => c.groupId === group.id)

  const handleContribute = async () => {
    setContributing(true)
    setError('')
    setMessage('')
    const result = await contribute(group.id)
    setContributing(false)
    if (result.success) {
      setMessage('Contribution sent successfully!')
    } else {
      setError(result.error ?? 'Failed to contribute')
    }
  }

  const handleJoin = () => {
    if (!joinName.trim()) return
    joinGroup(group.id, joinName.trim())
    setJoinName('')
    setMessage('You joined the group!')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{group.name}</h2>
            <p className="text-sm text-white/40 mt-1">{group.description}</p>
          </div>
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-nimiq-green/20 text-nimiq-green">
            Round {group.currentRound}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card !p-3">
          <p className="text-[10px] text-white/40 uppercase">Per Cycle</p>
          <p className="text-lg font-bold text-ajo-gold">{formatNim(group.contributionAmount)}</p>
        </div>
        <div className="card !p-3">
          <p className="text-[10px] text-white/40 uppercase">Members</p>
          <p className="text-lg font-bold">{group.members.length}/{group.maxMembers}</p>
        </div>
      </div>

      {message && (
        <div className="text-sm text-nimiq-green bg-nimiq-green/10 rounded-xl px-4 py-3">{message}</div>
      )}
      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>
      )}

      {wallet.address && isMember && currentMember && !currentMember.hasContributed && (
        <button onClick={handleContribute} disabled={contributing} className="btn-gold w-full flex items-center justify-center gap-2">
          <Send className="w-4 h-4" />
          {contributing ? 'Sending…' : `Contribute ${formatNim(group.contributionAmount)}`}
        </button>
      )}

      {wallet.address && isMember && currentMember?.hasContributed && (
        <div className="flex items-center gap-2 text-sm text-nimiq-green bg-nimiq-green/10 rounded-xl px-4 py-3">
          <Check className="w-4 h-4" />
          You've contributed this round
        </div>
      )}

      {wallet.address && !isMember && group.members.length < group.maxMembers && (
        <div className="card space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-nimiq-green" /> Join this group
          </p>
          <input
            className="input-field"
            placeholder="Your display name"
            value={joinName}
            onChange={e => setJoinName(e.target.value)}
          />
          <button onClick={handleJoin} disabled={!joinName.trim()} className="btn-primary w-full">
            Join Group
          </button>
        </div>
      )}

      <section>
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Members</h3>
        <div className="space-y-2">
          {group.members.map(member => (
            <div key={member.address} className="card !p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-ajo-slate flex items-center justify-center text-xs font-bold">
                  {member.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-[10px] text-white/30">{shortenAddress(member.address)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {member.hasContributed ? (
                  <span className="text-[10px] text-nimiq-green flex items-center gap-1">
                    <Check className="w-3 h-3" /> Paid
                  </span>
                ) : (
                  <span className="text-[10px] text-white/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {groupContributions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Recent Contributions</h3>
          <div className="space-y-2">
            {groupContributions.slice(-5).reverse().map(c => (
              <div key={c.id} className="card !p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{formatNim(c.amount)}</p>
                  <p className="text-[10px] text-white/30">Round {c.round} · {formatDate(c.timestamp)}</p>
                </div>
                {c.txHash && (
                  <span className="text-[10px] text-nimiq-green font-mono">{c.txHash.slice(0, 12)}…</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  )
}