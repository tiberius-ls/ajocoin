import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAjo } from '../context/AjoContext'

export default function CreateAjo() {
  const { wallet, connect, connecting, createGroup } = useAjo()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('50')
  const [cycleDays, setCycleDays] = useState('30')
  const [maxMembers, setMaxMembers] = useState('6')
  const [treasury, setTreasury] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet.address) {
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
      creatorAddress: wallet.address,
      treasuryAddress: treasury.trim() || wallet.address,
    })

    setTimeout(() => {
      setSubmitting(false)
      navigate('/dashboard')
    }, 400)
  }

  if (!wallet.address) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Connect your wallet</h2>
        <p className="text-sm text-white/40 mb-6 max-w-xs">You need a Nimiq wallet to create an ajo group.</p>
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
          <input
            className="input-field"
            placeholder="e.g. Lagos Tech Ajo"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input-field resize-none h-20"
            placeholder="What's this group about?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Amount (NIM)</label>
            <input
              className="input-field"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Cycle (days)</label>
            <input
              className="input-field"
              type="number"
              min="7"
              value={cycleDays}
              onChange={e => setCycleDays(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Max Members</label>
          <input
            className="input-field"
            type="number"
            min="2"
            max="20"
            value={maxMembers}
            onChange={e => setMaxMembers(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Treasury Address (optional)</label>
          <input
            className="input-field"
            placeholder="Defaults to your wallet"
            value={treasury}
            onChange={e => setTreasury(e.target.value)}
          />
        </div>

        <button type="submit" disabled={submitting || !name.trim()} className="btn-primary w-full">
          {submitting ? 'Creating…' : 'Create Group'}
        </button>
      </form>
    </motion.div>
  )
}