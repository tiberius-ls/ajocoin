import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Check, Clock, Send, UserPlus, Share2, Copy, Wallet,
  ArrowDownToLine, Trash2,
} from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import {
  formatNim, shortenAddress, formatDate, getTreasuryBalance,
  getCurrentRecipient, allMembersContributed, isGroupCreator,
  isTreasuryHolder, getRoundPayout, shareLink, formatSavingsLabel,
  formatCycleLabel, getMemberAmount, isFlexibleGroup,
  isPendingContribution, contributionStatusLabel,
} from '../lib/utils'
import Identicon from '../components/nimiq/Identicon'
import NimiqIcon from '../components/nimiq/NimiqIcon'

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    wallet, isConnected, connecting, connect, connectError,
    getGroup, contribute, joinGroup, addMember, getInviteLink,
    withdrawPayout, deleteGroup, getGroupContributions, getGroupWithdrawals, refreshGroup,
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

  useEffect(() => {
    if (id && isConnected) void refreshGroup(id)
  }, [id, isConnected, refreshGroup])

  if (!isConnected) {
    return (
      <div className="nq-surface-pad flex flex-col items-start">
        <Wallet className="nq-green mb-4" style={{ width: '4rem', height: '4rem' }} />
        <h2 className="nq-h2 mb-2">Wallet required</h2>
        <p className="nq-text text-on-card-muted mb-6">Connect your Nimiq wallet to view and manage this group.</p>
        {connectError && <div className="nq-notice error mb-4"><p className="nq-text">{connectError}</p></div>}
        <button onClick={connect} disabled={connecting} className="btn-primary">
          {connecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="py-16">
        <p className="nq-text text-on-blue-muted mb-4">Group not found</p>
        <Link to="/dashboard" className="nq-link nq-text-s">← Back to groups</Link>
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
          ? 'Transaction sent — confirming on the Nimiq chain (usually within 30 seconds)…'
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
      const chunkMsg = result.releasedAmount
        ? `${formatNim(result.releasedAmount)} sent now — remainder vests on the Vesting page.`
        : ''
      const msg = result.nextRecipient
        ? `Payout released! ${chunkMsg} ${result.nextRecipient} is up next and has been notified.`
        : `Payout released! ${chunkMsg}`
      setMessage(msg.trim())
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
      <Link to="/dashboard" className="nq-link nq-text-s inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="nq-h1 text-on-blue">{group.name}</h2>
          <p className="nq-text text-on-blue-muted mt-1">{group.description}</p>
        </div>
        <span className={`badge-round${group.status === 'completed' ? ' done' : ''}`}>
          {group.status === 'completed' ? 'Done' : `Round ${group.currentRound}`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="stat-tile">
          <p className="stat-label">{flexible ? 'Savings range' : 'Per cycle'}</p>
          <p className="stat-value accent-gold">{formatSavingsLabel(group)}</p>
        </div>
        <div className="stat-tile">
          <p className="stat-label">Cycle</p>
          <p className="stat-value">{formatCycleLabel(group.cycleDays)}</p>
        </div>
        <div className="stat-tile">
          <p className="stat-label">Members</p>
          <p className="stat-value">{group.members.length}/{group.maxMembers}</p>
        </div>
        <div className="stat-tile">
          <p className="stat-label">Treasury</p>
          <p className="stat-value accent-green">{formatNim(treasuryBalance)}</p>
        </div>
      </div>

      {isMember && currentMember && (
        <div className="savings-card">
          <p className="info-label">Your savings per cycle</p>
          <p className="info-value-lg">{formatNim(myAmount)}</p>
        </div>
      )}

      {isMember && recipient && group.status === 'active' && (
        <div className={`recipient-card${isRecipient ? ' your-turn' : ''}`}>
          <div>
            <p className="stat-label">Current recipient</p>
            <p className="recipient-name">{recipient.name}</p>
            {!allContributed && (
              <p className="recipient-meta mt-1">
                {group.members.filter(m => m.hasContributed).length}/{group.members.length} contributed
              </p>
            )}
          </div>
          {isRecipient && (
            <span className="badge-pill gold">
              {allContributed ? 'Your turn!' : 'Your turn (pending)'}
            </span>
          )}
        </div>
      )}

      {message && <div className="nq-notice success"><p className="nq-text">{message}</p></div>}
      {error && <div className="nq-notice error"><p className="nq-text">{error}</p></div>}

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
      {shareStatus && <p className="nq-text-s nq-green">{shareStatus}</p>}

      {isMember && currentMember && !currentMember.hasContributed && group.status === 'active' && (
        <button onClick={handleContribute} disabled={contributing} className="btn-gold w-full flex items-center justify-center gap-2">
          <Send className="w-4 h-4" />
          {contributing ? 'Sending…' : `Contribute ${formatNim(myAmount)}`}
        </button>
      )}

      {isMember && currentMember?.hasContributed && !canReleasePayout && group.status === 'active' && (
        <div className="nq-notice success flex items-center gap-2">
          <NimiqIcon name="checkmark" style={{ width: '1.5rem', height: '1.5rem' }} />
          <p className="nq-text">You've contributed this round
            {isRecipient && !allContributed && ' — waiting for other members'}
          </p>
        </div>
      )}

      {isRecipient && allContributed && !isTreasurer && (
        <div className="nq-notice warning flex items-start gap-3">
          <NimiqIcon name="alert-triangle" style={{ width: '1.75rem', height: '1.75rem', flexShrink: 0 }} />
          <div>
            <p className="info-label" style={{ color: 'var(--nimiq-blue)' }}>It's your turn to receive!</p>
            <p className="nq-text" style={{ color: 'var(--nimiq-blue)' }}>
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
          <p className="nq-h3 text-on-card flex items-center gap-2">
            <UserPlus className="w-4 h-4 nq-green" /> Join this group
          </p>
          <input className="input-field" placeholder="Your display name" value={joinName} onChange={e => setJoinName(e.target.value)} />
          {flexible && (
            <div>
              <label className="label-on-card">Your savings per cycle (NIM)</label>
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
          <p className="nq-h3 text-on-card flex items-center gap-2">
            <UserPlus className="w-4 h-4 nq-gold" /> Add member
          </p>
          <input className="input-field" placeholder="Member name" value={memberName} onChange={e => setMemberName(e.target.value)} />
          <input className="input-field" placeholder="Nimiq address" value={memberAddress} onChange={e => setMemberAddress(e.target.value)} />
          {flexible && (
            <div>
              <label className="label-on-card">Their savings per cycle (NIM)</label>
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
        <div className="card space-y-3">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 nq-text-s nq-red py-2"
            >
              <Trash2 className="w-4 h-4" /> Delete group
            </button>
          ) : (
            <>
              <p className="nq-text text-on-card-muted text-center">Delete this group permanently? This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="nq-button red flex-1">
                  {deleting ? 'Deleting…' : 'Confirm delete'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <section>
        <h3 className="nq-label text-on-blue mb-3">Members</h3>
        <div className="space-y-2">
          {group.members.map((member, idx) => (
            <div key={member.address} className="list-row">
              <div className="flex items-center gap-3 min-w-0">
                <Identicon seed={member.address} size={32} />
                <div className="min-w-0">
                  <p className="nq-text font-semibold text-on-card">
                    {member.name}
                    {member.address === group.creatorAddress && (
                      <span className="member-tag ml-1.5">Creator</span>
                    )}
                    {recipient?.address === member.address && !member.hasReceived && group.status === 'active' && (
                      <span className="member-tag line ml-1.5">#{idx + 1} in line</span>
                    )}
                  </p>
                  <p className="nq-text-s mono-address text-on-card-muted">
                    {shortenAddress(member.address)} · {formatNim(getMemberAmount(group, member))}/cycle
                  </p>
                </div>
              </div>
              <div className="flex items-center shrink-0">
                {member.hasReceived ? (
                  <span className="badge-pill gold">Received</span>
                ) : member.hasContributed ? (
                  <span className="badge-pill green"><Check style={{ width: '1.25rem', height: '1.25rem' }} /> Paid</span>
                ) : groupContributions.some(c =>
                  c.memberAddress === member.address
                  && c.round === group.currentRound
                  && isPendingContribution(c)
                ) ? (
                  <span className="badge-pill orange" title="Usually confirms within 30 seconds"><Clock style={{ width: '1.25rem', height: '1.25rem' }} /> Confirming</span>
                ) : (
                  <span className="badge-pill muted"><Clock style={{ width: '1.25rem', height: '1.25rem' }} /> Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {(groupContributions.length > 0 || groupWithdrawals.length > 0) && (
        <section>
          <h3 className="nq-label text-on-blue mb-3">Activity</h3>
          <div className="space-y-2">
            {[...groupContributions, ...groupWithdrawals]
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 6)
              .map(item => {
                const isWithdrawal = 'type' in item
                const contrib = !isWithdrawal ? item as typeof groupContributions[0] : null
                const pending = contrib && isPendingContribution(contrib)
                return (
                  <div key={item.id} className="list-row">
                    <div className="min-w-0">
                      <p className="nq-text font-semibold text-on-card">
                        {isWithdrawal ? '−' : '+'} {formatNim(item.amount)}
                      </p>
                      <p className="nq-text-s text-on-card-muted">
                        {isWithdrawal
                          ? `${(item as typeof groupWithdrawals[0]).type} withdrawal`
                          : `Contribution · Round ${contrib!.round}`}
                      </p>
                      {contrib?.txHash && (
                        <p className="nq-text-s mono-address text-on-card-muted mt-0.5">
                          {shortenAddress(contrib.txHash)}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {!isWithdrawal && (
                        <span className={`badge-pill ${pending ? 'orange' : 'green'}`}>
                          {contrib ? contributionStatusLabel(contrib) : 'Confirmed'}
                        </span>
                      )}
                      <p className="nq-text-s text-on-card-muted mt-1">{formatDate(item.timestamp)}</p>
                    </div>
                  </div>
                )
              })}
          </div>
        </section>
      )}
    </motion.div>
  )
}