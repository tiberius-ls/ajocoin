import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { UserPlus, Wallet } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import { parseInviteParam } from '../lib/storage'
import { formatNim } from '../lib/utils'

export default function JoinGroup() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { isConnected, connecting, connect, connectError, joinFromInvite } = useAjo()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  const inviteParam = params.get('invite')
  const invite = inviteParam ? parseInviteParam(inviteParam) : null

  const handleJoin = () => {
    if (!inviteParam) return
    setJoining(true)
    setError('')
    const result = joinFromInvite(inviteParam, name)
    setJoining(false)
    if (result.success) {
      navigate(`/group/${invite?.id}`)
    } else {
      setError(result.error ?? 'Failed to join')
    }
  }

  if (!invite) {
    return (
      <div className="text-center py-20 px-6">
        <p className="text-white/40 mb-4">Invalid or missing invite link</p>
        <Link to="/" className="text-nimiq-green text-sm">← Go home</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold">Join Ajo Group</h2>
        <p className="text-sm text-white/40 mt-1">You've been invited to a savings circle</p>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-lg">{invite.name}</h3>
        <p className="text-sm text-white/50">{invite.description}</p>
        <div className="flex gap-4 text-xs text-white/40 pt-2 border-t border-white/5">
          <span>{formatNim(invite.contributionAmount)}/cycle</span>
          <span>{invite.cycleDays} day cycles</span>
          <span>Up to {invite.maxMembers} members</span>
        </div>
      </div>

      {!isConnected ? (
        <div className="card text-center space-y-4">
          <Wallet className="w-8 h-8 text-nimiq-green mx-auto" />
          <p className="text-sm text-white/50">Connect your Nimiq wallet to join this group</p>
          {connectError && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{connectError}</p>
          )}
          <button onClick={connect} disabled={connecting} className="btn-primary w-full">
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        </div>
      ) : (
        <div className="card space-y-4">
          <p className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-nimiq-green" /> Join as a member
          </p>
          <div>
            <label className="label">Your display name</label>
            <input
              className="input-field"
              placeholder="e.g. Ada"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={joining || !name.trim()}
            className="btn-primary w-full"
          >
            {joining ? 'Joining…' : 'Join Group'}
          </button>
        </div>
      )}
    </div>
  )
}