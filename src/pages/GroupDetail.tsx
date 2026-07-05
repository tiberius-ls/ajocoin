import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Clock, Send, UserPlus, Share2, Copy, Wallet, ArrowDownToLine } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import {
  formatNim, shortenAddress, formatDate, getTreasuryBalance,
  getCurrentRecipient, allMembersContributed, isGroupCreator, shareLink,
} from '../lib/utils'

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const {
    wallet, isConnected, connecting, connect, connectError,
    getGroup, contribute, joinGroup, addMember, getInviteLink,
    withdrawPayout, contributions, withdrawals,
  } = useAjo()

  const [contributing, setContributing] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [joinName, setJoinName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberAddress, setMemberAddress] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [shareStatus, setShareStatus] = useState('')

  const group = id ? getGroup(id) : undefined

  if (!isConnected) {
    return (
      <div className="text-center py-20 px-6">
        <Wallet className="w-10 h-10 text-nimiq-green mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-2">Wallet required</h2>
        <p className="text-sm text-white/40 mb-6">Connect your Nimiq wallet to view and manage this group.</p>
        {connectError && <p className="text-sm text-red-400 mb-4">{connectError}</p>}
        <button onClick={connect} disabled={connecting} className="btn-primary">
          {connecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      </div>
    )
  }

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
  const isCreator = isGroupCreator(group, wallet.address)
  const groupContributions = contributions.filter(c => c.groupId === group.id)
  const groupWithdrawals = withdrawals.filter(w => w.groupId === group.id)
  const treasuryBalance = getTreasuryBalance(group.id, contributions, withdrawals)
  const recipient = getCurrentRecipient(group)
  const canWithdrawPayout = isMember
    && recipient?.address === wallet.address
    && allMembersContributed(group)
    && treasuryBalance >= group.contributionAmount * group.members.length
  const inviteLink = getInviteLink(group.id)

  const handleContribute = async () => {
    setContributing(true)
    setError('')
    setMessage('')
    const result = await contribute(group.id)
    setContributing(false)
    if (result.success) setMessage('Contribution sent successfully!')
    else setError(result.error ?? 'Failed to contribute')
  }

  const handleWithdraw = async () => {
    setWithdrawing(true)
    setError('')
    setMessage('')
    const result = await withdrawPayout(group.id)
    setWithdrawing(false)
    if (result.success) setMessage(`Withdrew ${formatNim(group.contributionAmount * group.members.length)}!`)
    else setError(result.error ?? 'Withdrawal failed')
  }

  const handleJoin = () => {
    setError('')
    const result = joinGroup(group.id, joinName.trim())
    if (result.success) {
      setMessage('You joined the group!')
      setJoinName('')
    } else {
      setError(result.error ?? 'Failed to join')
    }
  }

  const handleAddMember = () => {
    setError('')
    const result = addMember(group.id, memberName, memberAddress)
    if (result.success) {
      setMessage(`Added ${memberName} to the group`)
      setMemberName('')
      setMemberAddress('')
    } else {
      setError(result.error ?? 'Failed to add member')
    }
  }

  const handleShare = async () => {
    if (!inviteLink) return
    const result = await shareLink(group.name, inviteLink)
    if (result === 'shared') setShareStatus('Shared!')
    else if (result === 'copied') setShareStatus('Link copied!')
    else setShareStatus('Could not share')
    setTimeout(() => setShareStatus(''), 3000)
  }

  const handleCopyLink = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setShareStatus('Link copied!')
    setTimeout(() => setShareStatus(''), 3000)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{group.name}</h2>
          <p className="text-sm text-white/40 mt-1">{group.description}</p>
        </div>
        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-nimiq-green/20 text-nimiq-green shrink-0">
          Round {group.currentRound}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="card !p-3">
          <p className="text-[10px] text-white/40 uppercase">Per Cycle</p>
          <p className="text-base font-bold text-ajo-gold">{formatNim(group.contributionAmount)}</p>
        </div>
        <div className="card !p-3">
          <p className="text-[10px] text-white/40 uppercase">Members</p>
          <p className="text-base font-bold">{group.members.length}/{group.maxMembers}</p>
        </div>
        <div className="card !p-3">
          <p className="text-[10px] text-white/40 uppercase">Treasury</p>
          <p className="text-base font-bold">{formatNim(treasuryBalance)}</p>
        </div>
      </div>

      {isMember && (
        <div className="card !p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/40 uppercase">Current recipient</p>
            <p className="text-sm font-medium">{recipient?.name ?? '—'}</p>
          </div>
          {recipient?.address === wallet.address && (
            <span className="text-[10px] font-semibold text-ajo-gold bg-ajo-gold/10 px-2 py-1 rounded-full">Your turn</span>
          )}
        </div>
      )}

      {message && <div className="text-sm text-nimiq-green bg-nimiq-green/10 rounded-xl px-4 py-3">{message}</div>}
      {error && <div className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>}

      {isMember && inviteLink && (
        <div className="flex gap-2">
          <button onClick={handleShare} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button onClick={handleCopyLink} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm">
            <Copy className="w-4 h-4" /> Copy link
          </button>
        </div>
      )}
      {shareStatus && <p className="text-xs text-nimiq-green text-center">{shareStatus}</p>}

      {isMember && currentMember && !currentMember.hasContributed && (
        <button onClick={handleContribute} disabled={contributing} className="btn-gold w-full flex items-center justify-center gap-2">
          <Send className="w-4 h-4" />
          {contributing ? 'Sending…' : `Contribute ${formatNim(group.contributionAmount)}`}
        </button>
      )}

      {isMember && currentMember?.hasContributed && !canWithdrawPayout && (
        <div className="flex items-center gap-2 text-sm text-nimiq-green bg-nimiq-green/10 rounded-xl px-4 py-3">
          <Check className="w-4 h-4" /> You've contributed this round
        </div>
      )}

      {canWithdrawPayout && (
        <button onClick={handleWithdraw} disabled={withdrawing} className="btn-primary w-full flex items-center justify-center gap-2">
          <ArrowDownToLine className="w-4 h-4" />
          {withdrawing ? 'Withdrawing…' : `Withdraw ${formatNim(group.contributionAmount * group.members.length)}`}
        </button>
      )}

      {!isMember && group.members.length < group.maxMembers && (
        <div className="card space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-nimiq-green" /> Join this group
          </p>
          <input className="input-field" placeholder="Your display name" value={joinName} onChange={e => setJoinName(e.target.value)} />
          <button onClick={handleJoin} disabled={!joinName.trim()} className="btn-primary w-full">Join Group</button>
        </div>
      )}

      {isCreator && group.members.length < group.maxMembers && (
        <div className="card space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-ajo-gold" /> Add member
          </p>
          <input className="input-field" placeholder="Member name" value={memberName} onChange={e => setMemberName(e.target.value)} />
          <input className="input-field" placeholder="Nimiq address" value={memberAddress} onChange={e => setMemberAddress(e.target.value)} />
          <button
            onClick={handleAddMember}
            disabled={!memberName.trim() || !memberAddress.trim()}
            className="btn-secondary w-full"
          >
            Add Member
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
                  <p className="text-sm font-medium">
                    {member.name}
                    {member.address === group.creatorAddress && (
                      <span className="text-[10px] text-ajo-gold ml-1.5">Creator</span>
                    )}
                  </p>
                  <p className="text-[10px] text-white/30">{shortenAddress(member.address)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {member.hasReceived ? (
                  <span className="text-[10px] text-ajo-gold">Received</span>
                ) : member.hasContributed ? (
                  <span className="text-[10px] text-nimiq-green flex items-center gap-1"><Check className="w-3 h-3" /> Paid</span>
                ) : (
                  <span className="text-[10px] text-white/30 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {(groupContributions.length > 0 || groupWithdrawals.length > 0) && (
        <section>
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Activity</h3>
          <div className="space-y-2">
            {groupContributions.slice(-3).reverse().map(c => (
              <div key={c.id} className="card !p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-nimiq-green">+ {formatNim(c.amount)}</p>
                  <p className="text-[10px] text-white/30">Contribution · Round {c.round}</p>
                </div>
                <span className="text-[10px] text-white/30">{formatDate(c.timestamp)}</span>
              </div>
            ))}
            {groupWithdrawals.slice(-3).reverse().map(w => (
              <div key={w.id} className="card !p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-ajo-gold">− {formatNim(w.amount)}</p>
                  <p className="text-[10px] text-white/30">{w.type === 'payout' ? 'Payout' : 'Vested'} withdrawal</p>
                </div>
                <span className="text-[10px] text-white/30">{formatDate(w.timestamp)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  )
}