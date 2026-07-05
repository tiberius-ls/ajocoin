import { useState } from 'react'
import { motion } from 'framer-motion'
import { Vote as VoteIcon, Plus, Check } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import EmptyState from '../components/EmptyState'
import { formatDate } from '../lib/utils'

export default function Voting() {
  const { votes, groups, wallet, connect, connecting, castVote, createVote } = useAjo()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [groupId, setGroupId] = useState('')
  const [optionA, setOptionA] = useState('Approve')
  const [optionB, setOptionB] = useState('Reject')

  const openVotes = votes.filter(v => v.status === 'open')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet.address || !groupId || !title.trim()) return

    createVote({
      groupId,
      title: title.trim(),
      description: description.trim(),
      createdBy: wallet.address,
      options: [optionA.trim(), optionB.trim()],
    })

    setTitle('')
    setDescription('')
    setShowForm(false)
  }

  if (!wallet.address) {
    return (
      <EmptyState
        icon={VoteIcon}
        title="Connect to vote"
        description="Link your wallet to participate in group governance."
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Voting</h2>
          <p className="text-sm text-white/40">Group governance & decisions</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-secondary !px-3 !py-2 flex items-center gap-1.5 text-sm">
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleCreate}
          className="card space-y-4"
        >
          <div>
            <label className="label">Group</label>
            <select
              className="input-field"
              value={groupId}
              onChange={e => setGroupId(e.target.value)}
              required
            >
              <option value="">Select a group</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Proposal Title</label>
            <input className="input-field" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field h-16 resize-none" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="input-field" value={optionA} onChange={e => setOptionA(e.target.value)} />
            <input className="input-field" value={optionB} onChange={e => setOptionB(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full">Create Proposal</button>
        </motion.form>
      )}

      {openVotes.length === 0 ? (
        <EmptyState
          icon={VoteIcon}
          title="No active votes"
          description="When your group needs to make a decision, create a proposal here."
        />
      ) : (
        <div className="space-y-4">
          {openVotes.map((vote, i) => {
            const group = groups.find(g => g.id === vote.groupId)
            const totalVotes = vote.options.reduce((sum, o) => sum + o.votes.length, 0)
            const userVoted = vote.options.some(o => o.votes.includes(wallet.address!))

            return (
              <motion.div
                key={vote.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card space-y-4"
              >
                <div>
                  <p className="text-[10px] text-nimiq-green font-semibold uppercase">{group?.name ?? 'Unknown group'}</p>
                  <h3 className="font-semibold mt-1">{vote.title}</h3>
                  {vote.description && <p className="text-xs text-white/40 mt-1">{vote.description}</p>}
                  <p className="text-[10px] text-white/20 mt-2">{formatDate(vote.createdAt)} · {totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
                </div>

                <div className="space-y-2">
                  {vote.options.map((option, idx) => {
                    const pct = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0
                    const isUserChoice = option.votes.includes(wallet.address!)

                    return (
                      <button
                        key={option.label}
                        onClick={() => !userVoted && castVote(vote.id, idx)}
                        disabled={userVoted}
                        className={`w-full text-left rounded-xl px-4 py-3 border transition-colors relative overflow-hidden ${
                          isUserChoice
                            ? 'border-nimiq-green bg-nimiq-green/10'
                            : userVoted
                              ? 'border-white/5 bg-ajo-slate opacity-60'
                              : 'border-white/10 bg-ajo-slate hover:border-nimiq-green/30'
                        }`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-nimiq-green/10 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between">
                          <span className="text-sm font-medium flex items-center gap-2">
                            {isUserChoice && <Check className="w-3.5 h-3.5 text-nimiq-green" />}
                            {option.label}
                          </span>
                          <span className="text-xs text-white/40">{option.votes.length} ({pct}%)</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}