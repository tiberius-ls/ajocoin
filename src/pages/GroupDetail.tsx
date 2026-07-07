import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Check, Clock, Send, UserPlus, Share2, Copy, Wallet,
  ArrowDownToLine, Trash2, AlertTriangle,
} from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import {
  formatNim, shortenAddress, formatDate, getTreasuryBalance,
  getCurrentRecipient, allMembersContributed, isGroupCreator,
  isTreasuryHolder, getRoundPayout, shareLink, formatSavingsLabel,
  formatCycleLabel, getMemberAmount, isFlexibleGroup,
} from '../lib/utils'

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    wallet, isConnected, connecting, connect, connectError,
    getGroup, contribute, joinGroup, addMember, getInviteLink,
    withdrawPayout, deleteGroup, getGroupContributions, getGroupWithdrawals,
  } = useAjo()

  const [contributing, setContributing] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [joinName, setJoinName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberAddress, setMemberAddress] = useState('')
  const [memberAmount, setMemberAmount] = useState('')
  const [joinAmount, setJoinAmount] = useState('')
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
  const isTreasurer = isTreasuryHolder(group, wallet.address)
  const groupContributions = getGroupContributions(group.id)
  const groupWithdrawals = getGroupWithdrawals(group.id)
  const treasuryBalance = getTreasuryBalance(group.id, groupContributions, groupWithdrawals)
  const recipient = getCurrentRecipient(group)
  const payoutAmount = getRoundPayout(group, groupContributions, group.currentRound)
  const myAmount = currentMember ? getMemberAmount(group, currentMember) : 0
  const flexible = isFlexibleGroup(group)
  const allContributed = allMembersContributed(group)
  const isRecipient = recipient?.address === wallet.address
  const canReleasePayout = isTreasurer && allContributed && recipient && treasuryBalance >= payoutAmount
  const inviteLink = getInviteLink(group.id)

  const handleContribute = async () => {
    setContributing(true)
    setError('')
    setMessage('')
    const result = await contribute(group.id)
    setContributing(false)
    if (result.success) {
      setMessage(
        result.pending
          ? 'Transaction sent — confirming on the Nimiq chain…'
          : 'Contribution confirmed!'
      )
    } else {
      setError(result.error ?? 'Failed to contribute')
    }
  }

  const handleWithdraw = async () => {
    setWithdrawing(true)
    setError('')
    setMessage('')
    const result = await withdrawPayout(group.id)
    setWithdrawing(false)
    if (result.success) {
      const msg = result.nextRecipient
        ? `Payout released! ${result.nextRecipient} is up next and has been notified.`
        : `Payout of ${formatNim(payoutAmount)} released successfully!`
      setMessage(msg)
    } else {
      setError(result.error ?? 'Withdrawal failed')
    }
  }

  const handleDelete = () => {
    setDeleting(true)
    const result = deleteGroup(group.id)
    setDeleting(false)
    if (result.success) navigate('/dashboard')
    else setError(result.error ?? 'Failed to delete group')
  }

  const handleJoin = () => {
    setError('')
    const amount = flexible ? parseFloat(joinAmount || String(group.minContribution)) : undefined
    if (flexible && !Number.isFinite(amount)) {
      setError('Enter a valid savings amount')
      return
    }
    const result = joinGroup(group.id, joinName.trim(), amount)
    if (result.success) {
      setMessage('You joined the group!')
      setJoinName('')
    } else {
      setError(result.error ?? 'Failed to join')
    }
  }

  const handleAddMember = () => {
    setError('')
    const amount = flexible ? parseFloat(memberAmount || String(group.minContribution)) : undefined
    if (flexible && !Number.isFinite(amount)) {
      setError('Enter a valid savings amount for the member')
      return
    }
    const result = addMember(group.id, memberName, memberAddress, amount)
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
        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0 ${
          group.status === 'completed' ? 'bg-white/10 text-white/50' : 'bg-nimiq-green/20 text-nimiq-green'
        }`}>
          {group.status === 'completed' ? 'Done' : `Round ${group.currentRound}`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="card !p-3">
          <p className="text-[10px] text-white/40 uppercase">{flexible ? 'Savings range' : 'Per cycle'}</p>
          <p className="text-base font-bold text-ajo-gold">{formatSavingsLabel(group)}</p>
        </div>
        <div className="card !p-3">
          <p className="text-[10px] text-white/40 uppercase">Cycle</p>
          <p className="text-base font-bold">{formatCycleLabel(group.cycleDays)}</p>
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

      {isMember && currentMember && (
        <div className="card !p-3 bg-nimiq-green/5 border-nimiq-green/10">
          <p className="text-[10px] text-white/40 uppercase">Your savings per cycle</p>
          <p className="text-lg font-bold text-nimiq-green">{formatNim(myAmount)}</p>
        </div>
      )}

      {isMember && recipient && group.status === 'active' && (
        <div className={`card !p-3 flex items-center justify-between ${
          isRecipient ? 'border-ajo-gold/30 bg-ajo-gold/5' : ''
        }`}>
          <div>
            <p className="text-[10px] text-white/40 uppercase">Current recipient</p>
            <p className="text-sm font-medium">{recipient.name}</p>
            {!allContributed && (
              <p className="text-[10px] text-white/30 mt-0.5">
                {group.members.filter(m => m.hasContributed).length}/{group.members.length} contributed
              </p>
            )}
          </div>
          {isRecipient && (
            <span className="text-[10px] font-semibold text-ajo-gold bg-ajo-gold/10 px-2 py-1 rounded-full">
              {allContributed ? 'Your turn!' : 'Your turn (pending contributions)'}
            </span>
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

      {isMember && currentMember && !currentMember.hasContributed && group.status === 'active' && (
        <button onClick={handleContribute} disabled={contributing} className="btn-gold w-full flex items-center justify-center gap-2">
          <Send className="w-4 h-4" />
          {contributing ? 'Sending…' : `Contribute ${formatNim(myAmount)}`}
        </button>
      )}

      {isMember && currentMember?.hasContributed && !canReleasePayout && group.status === 'active' && (
        <div className="flex items-center gap-2 text-sm text-nimiq-green bg-nimiq-green/10 rounded-xl px-4 py-3">
          <Check className="w-4 h-4" /> You've contributed this round
          {isRecipient && !allContributed && (
            <span className="text-white/40">— waiting for other members</span>
          )}
        </div>
      )}

      {isRecipient && allContributed && !isTreasurer && (
        <div className="card !p-4 flex items-start gap-3 border-ajo-gold/20">
          <AlertTriangle className="w-5 h-5 text-ajo-gold shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-ajo-gold">It's your turn to receive!</p>
            <p className="text-xs text-white/40 mt-1">
              {formatNim(payoutAmount)} is ready. The treasurer will release the payout to your wallet.
            </p>
          </div>
        </div>
      )}

      {canReleasePayout && (
        <button onClick={handleWithdraw} disabled={withdrawing} className="btn-primary w-full flex items-center justify-center gap-2">
          <ArrowDownToLine className="w-4 h-4" />
          {withdrawing
            ? 'Releasing…'
            : `Release ${formatNim(payoutAmount)} to ${recipient!.name}`}
        </button>
      )}

      {!isMember && group.members.length < group.maxMembers && group.status === 'active' && (
        <div className="card space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-nimiq-green" /> Join this group
          </p>
          <input className="input-field" placeholder="Your display name" value={joinName} onChange={e => setJoinName(e.target.value)} />
          {flexible && (
            <div>
              <label className="label">Your savings per cycle (NIM)</label>
              <input
                className="input-field"
                type="number"
                min={group.minContribution}
                max={group.maxContribution}
                step="0.01"
                placeholder={`${group.minContribution} – ${group.maxContribution}`}
                value={joinAmount}
                onChange={e => setJoinAmount(e.target.value)}
              />
            </div>
          )}
          <button onClick={handleJoin} disabled={!joinName.trim()} className="btn-primary w-full">Join Group</button>
        </div>
      )}

      {isCreator && group.members.length < group.maxMembers && group.status === 'active' && (
        <div className="card space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-ajo-gold" /> Add member
          </p>
          <input className="input-field" placeholder="Member name" value={memberName} onChange={e => setMemberName(e.target.value)} />
          <input className="input-field" placeholder="Nimiq address" value={memberAddress} onChange={e => setMemberAddress(e.target.value)} />
          {flexible && (
            <div>
              <label className="label">Their savings per cycle (NIM)</label>
              <input
                className="input-field"
                type="number"
                min={group.minContribution}
                max={group.maxContribution}
                step="0.01"
                placeholder={`${group.minContribution} – ${group.maxContribution}`}
                value={memberAmount}
                onChange={e => setMemberAmount(e.target.value)}
              />
            </div>
          )}
          <button onClick={handleAddMember} disabled={!memberName.trim() || !memberAddress.trim()} className="btn-secondary w-full">
            Add Member
          </button>
        </div>
      )}

      {isCreator && (
        <div className="card space-y-3 border-red-400/10">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-300 py-2"
            >
              <Trash2 className="w-4 h-4" /> Delete group
            </button>
          ) : (
            <>
              <p className="text-sm text-white/50 text-center">Delete this group permanently? This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-3 rounded-xl bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30">
                  {deleting ? 'Deleting…' : 'Confirm delete'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <section>
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Members</h3>
        <div className="space-y-2">
          {group.members.map((member, idx) => (
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
                    {recipient?.address === member.address && !member.hasReceived && group.status === 'active' && (
                      <span className="text-[10px] text-nimiq-green ml-1.5">#{idx + 1} in line</span>
                    )}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {shortenAddress(member.address)} · {formatNim(getMemberAmount(group, member))}/cycle
                  </p>
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
            {[...groupContributions, ...groupWithdrawals]
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 6)
              .map(item => {
                const isWithdrawal = 'type' in item
                return (
                  <div key={item.id} className="card !p-3 flex items-center justify-between text-sm">
                    <div>
                      <p className={`font-medium ${isWithdrawal ? 'text-ajo-gold' : 'text-nimiq-green'}`}>
                        {isWithdrawal ? '−' : '+'} {formatNim(item.amount)}
                      </p>
                      <p className="text-[10px] text-white/30">
                        {isWithdrawal
                          ? `${(item as typeof groupWithdrawals[0]).type} withdrawal`
                          : `Contribution · Round ${(item as typeof groupContributions[0]).round}`}
                      </p>
                    </div>
                    <span className="text-[10px] text-white/30">{formatDate(item.timestamp)}</span>
                  </div>
                )
              })}
          </div>
        </section>
      )}
    </motion.div>
  )
}