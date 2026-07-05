import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import { useAjo } from '../context/AjoContext'

export default function CreateAjo() {
  const { isConnected, connect, connecting, connectError, createGroup, wallet } = useAjo()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('50')
  const [cycleDays, setCycleDays] = useState('30')
  const [maxMembers, setMaxMembers] = useState('6')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected) {
      await connect()
      return
    }

    setSubmitting(true)
    createGroup({
      name: name.trim(),
      description: description.trim(),
      contributionAmount: parseFloat(amount),
      cycleDays: parseInt(cycleDays),
      maxMembers: parseInt(maxMembers),
      creatorAddress: wallet.address!,
      treasuryAddress: wallet.address!,
    })

    setTimeout(() => {
      setSubmitting(false)
      navigate('/dashboard')
    }, 300)
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <Wallet className="w-10 h-10 text-nimiq-green mb-4" />
        <h2 className="text-xl font-bold mb-2">Connect your wallet</h2>
        <p className="text-sm text-white/40 mb-6 max-w-xs">You need a Nimiq wallet to create an ajo group.</p>
        {connectError && <p className="text-sm text-red-400 mb-4">{connectError}</p>}
        <button onClick={connect} disabled={connecting} className="btn-primary">
          {connecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-xl font-bold mb-1">Create Ajo Group</h2>
      <p className="text-sm text-white/40 mb-6">Set up a new rotating savings circle</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Group Name</label>
          <input className="input-field" placeholder="e.g. Lagos Tech Ajo" value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input-field resize-none h-20" placeholder="What's this group about?" value={description} onChange={e => setDescription(e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Amount (NIM)</label>
            <input className="input-field" type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="label">Cycle (days)</label>
            <input className="input-field" type="number" min="7" value={cycleDays} onChange={e => setCycleDays(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="label">Max Members</label>
          <input className="input-field" type="number" min="2" max="20" value={maxMembers} onChange={e => setMaxMembers(e.target.value)} required />
        </div>

        <p className="text-xs text-white/30">Treasury will use your connected wallet address. Share the invite link after creating to add members.</p>

        <button type="submit" disabled={submitting || !name.trim()} className="btn-primary w-full">
          {submitting ? 'Creating…' : 'Create Group'}
        </button>
      </form>
    </motion.div>
  )
}