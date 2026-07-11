import { useState } from 'react'
import { motion } from 'framer-motion'
import { Vote as VoteIcon, Wallet } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import EmptyState from '../components/EmptyState'
import NimiqIcon from '../components/nimiq/NimiqIcon'
import { formatDate } from '../lib/utils'

export default function Voting() {
  const { votes, myGroups, wallet, isConnected, connecting, connect, connectError, castVote, createVote } = useAjo()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [groupId, setGroupId] = useState('')
  const [optionA, setOptionA] = useState('Approve')
  const [optionB, setOptionB] = useState('Reject')

  const myGroupIds = new Set(myGroups.map(g => g.id))
  const openVotes = votes.filter(v => v.status === 'open' && myGroupIds.has(v.groupId))

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

  if (!isConnected) {
    return (
      <EmptyState
        icon={Wallet}
        title="Connect your wallet"
        description="Link your Nimiq wallet to participate in group voting."
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
    <div className="page">
      <div className="flex items-center justify-between gap-3">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2 className="nq-h1 text-on-blue">Voting</h2>
          <p className="nq-text text-on-blue-muted">Decisions in your groups</p>
        </div>
        {myGroups.length > 0 && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-secondary flex items-center gap-1.5 shrink-0"
            style={{ padding: '0.75rem 1rem' }}
          >
            <NimiqIcon name="plus-circle" style={{ width: '1.25rem', height: '1.25rem' }} />
            New
          </button>
        )}
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleCreate}
          className="card space-y-4"
        >
          <div>
            <label className="label-on-card">Group</label>
            <select className="input-field" value={groupId} onChange={e => setGroupId(e.target.value)} required>
              <option value="">Select a group</option>
              {myGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-on-card">Proposal Title</label>
            <input className="input-field" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="label-on-card">Description</label>
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
          description={myGroups.length === 0
            ? 'Join or create a group first to start voting.'
            : 'Create a proposal when your group needs to make a decision.'}
        />
      ) : (
        <div className="space-y-4">
          {openVotes.map((vote, i) => {
            const group = myGroups.find(g => g.id === vote.groupId)
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
                  <p className="nq-label nq-green">{group?.name}</p>
                  <h3 className="nq-h3 text-on-card mt-1">{vote.title}</h3>
                  {vote.description && <p className="nq-text-s text-on-card-muted mt-1">{vote.description}</p>}
                  <p className="nq-text-s text-on-card-muted mt-2">
                    {formatDate(vote.createdAt)} · {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                  </p>
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
                        className={`vote-option${isUserChoice ? ' selected' : ''}${userVoted && !isUserChoice ? ' disabled' : ''}`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 transition-all"
                          style={{ width: `${pct}%`, background: 'rgba(33, 188, 165, 0.1)' }}
                        />
                        <div className="relative flex items-center justify-between gap-3">
                          <span className="nq-text font-semibold flex items-center gap-2">
                            {isUserChoice && (
                              <NimiqIcon name="checkmark-small" className="nq-green" style={{ width: '1.25rem', height: '1.25rem' }} />
                            )}
                            {option.label}
                          </span>
                          <span className="nq-text-s text-on-card-muted">{option.votes.length} ({pct}%)</span>
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