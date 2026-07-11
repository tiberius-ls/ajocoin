import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import { parseInviteParam } from '../lib/storage'
import { formatNim, formatCycleLabel } from '../lib/utils'
import NimiqIcon from '../components/nimiq/NimiqIcon'

export default function JoinGroup() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { isConnected, connecting, connect, connectError, joinFromInvite } = useAjo()
  const [name, setName] = useState('')
  const [savedAmount, setSavedAmount] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  const inviteParam = params.get('invite')
  const invite = inviteParam ? parseInviteParam(inviteParam) : null
  const isFlexible = invite?.contributionMode === 'flexible'
  const defaultAmount = invite
    ? String(isFlexible ? invite.contributionAmount : invite.contributionAmount)
    : ''

  const handleJoin = () => {
    if (!inviteParam || !invite) return
    setJoining(true)
    setError('')

    const amount = isFlexible
      ? parseFloat(savedAmount || defaultAmount)
      : invite.contributionAmount

    const result = joinFromInvite(inviteParam, name, amount)
    setJoining(false)
    if (result.success) {
      navigate(`/group/${invite.id}`)
    } else {
      setError(result.error ?? 'Failed to join')
    }
  }

  if (!invite) {
    return (
      <div className="text-center py-20 px-6">
        <p className="nq-text text-on-blue-muted mb-4">Invalid or missing invite link</p>
        <Link to="/" className="nq-link nq-text-s">← Go home</Link>
      </div>
    )
  }

  const savingsLabel = isFlexible
    ? `${formatNim(invite.minContribution)} – ${formatNim(invite.maxContribution)}`
    : `${formatNim(invite.contributionAmount)}/cycle`

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="nq-h1 text-on-blue">Join Ajo Group</h2>
        <p className="nq-text text-on-blue-muted mt-1">You've been invited to a savings circle</p>
      </div>

      <div className="card space-y-3">
        <h3 className="nq-h2">{invite.name}</h3>
        <p className="nq-text text-on-card-muted">{invite.description}</p>
        <div className="flex flex-wrap gap-3 nq-text-s text-on-card-muted pt-2" style={{ borderTop: '1px solid rgba(31,35,72,0.08)' }}>
          <span>{savingsLabel}</span>
          <span>{formatCycleLabel(invite.cycleDays)}</span>
          <span>Up to {invite.maxMembers} members</span>
        </div>
      </div>

      {!isConnected ? (
        <div className="nq-surface-pad space-y-4">
          <NimiqIcon name="login" className="nq-green" style={{ width: '3rem', height: '3rem' }} />
          <p className="nq-text text-on-card-muted">Connect your Nimiq wallet to join this group</p>
          {connectError && <div className="nq-notice error"><p className="nq-text">{connectError}</p></div>}
          <button onClick={connect} disabled={connecting} className="btn-primary w-full">
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        </div>
      ) : (
        <div className="card space-y-4">
          <p className="nq-h3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 nq-green" /> Join as a member
          </p>
          <div>
            <label className="label-on-card">Your display name</label>
            <input className="input-field" placeholder="e.g. Ada" value={name} onChange={e => setName(e.target.value)} />
          </div>
          {isFlexible && (
            <div>
              <label className="label-on-card">Your savings per cycle (NIM)</label>
              <input
                className="input-field"
                type="number"
                min={invite.minContribution}
                max={invite.maxContribution}
                step="0.01"
                placeholder={`${invite.minContribution} – ${invite.maxContribution}`}
                value={savedAmount}
                onChange={e => setSavedAmount(e.target.value)}
                onFocus={() => { if (!savedAmount) setSavedAmount(defaultAmount) }}
              />
              <p className="nq-text-s text-on-card-muted mt-1">
                Choose between {formatNim(invite.minContribution)} and {formatNim(invite.maxContribution)}
              </p>
            </div>
          )}
          {error && <div className="nq-notice error"><p className="nq-text">{error}</p></div>}
          <button onClick={handleJoin} disabled={joining || !name.trim()} className="btn-primary w-full">
            {joining ? 'Joining…' : 'Join Group'}
          </button>
        </div>
      )}
    </div>
  )
}