import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import { CYCLE_PRESETS, formatNim } from '../lib/utils'
import type { ContributionMode } from '../types'

export default function CreateAjo() {
  const { isConnected, connect, connecting, connectError, createGroup, wallet } = useAjo()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<ContributionMode>('fixed')
  const [amount, setAmount] = useState('50')
  const [minAmount, setMinAmount] = useState('10')
  const [maxAmount, setMaxAmount] = useState('100')
  const [creatorAmount, setCreatorAmount] = useState('50')
  const [cycleDays, setCycleDays] = useState('30')
  const [cyclePreset, setCyclePreset] = useState<number | 'custom'>(30)
  const [maxMembers, setMaxMembers] = useState('6')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const handleCyclePreset = (days: number) => {
    setCyclePreset(days)
    setCycleDays(String(days))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!isConnected) {
      await connect()
      return
    }

    const parsedMin = parseFloat(minAmount)
    const parsedMax = parseFloat(maxAmount)
    const parsedCycle = parseInt(cycleDays)
    const parsedMembers = parseInt(maxMembers)

    if (mode === 'flexible' && parsedMin >= parsedMax) {
      setFormError('Maximum amount must be greater than minimum')
      return
    }

    const fixedAmount = parseFloat(amount)
    const creatorSaved = mode === 'flexible' ? parseFloat(creatorAmount) : fixedAmount

    if (mode === 'flexible' && (creatorSaved < parsedMin || creatorSaved > parsedMax)) {
      setFormError(`Your savings amount must be between ${parsedMin} and ${parsedMax} NIM`)
      return
    }

    setSubmitting(true)
    createGroup({
      name: name.trim(),
      description: description.trim(),
      contributionMode: mode,
      contributionAmount: mode === 'fixed' ? fixedAmount : creatorSaved,
      minContribution: mode === 'fixed' ? fixedAmount : parsedMin,
      maxContribution: mode === 'fixed' ? fixedAmount : parsedMax,
      cycleDays: parsedCycle,
      maxMembers: parsedMembers,
      creatorAddress: wallet.address!,
      treasuryAddress: wallet.address!,
    }, creatorSaved)

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
      <p className="text-sm text-white/40 mb-6">Set the savings rules for your group</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Group Name</label>
          <input className="input-field" placeholder="e.g. Lagos Tech Ajo" value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input-field resize-none h-20" placeholder="What's this group about?" value={description} onChange={e => setDescription(e.target.value)} required />
        </div>

        <div>
          <label className="label">Savings mode</label>
          <div className="grid grid-cols-2 gap-2">
            {(['fixed', 'flexible'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
                  mode === m
                    ? 'border-nimiq-green bg-nimiq-green/10 text-nimiq-green'
                    : 'border-white/10 bg-ajo-slate text-white/50 hover:border-white/20'
                }`}
              >
                {m === 'fixed' ? 'Fixed amount' : 'Flexible range'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/30 mt-1.5">
            {mode === 'fixed'
              ? 'Every member saves the same amount each cycle.'
              : 'Each member picks their own amount within your min–max range.'}
          </p>
        </div>

        {mode === 'fixed' ? (
          <div>
            <label className="label">Amount per cycle (NIM)</label>
            <input className="input-field" type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Minimum (NIM)</label>
                <input className="input-field" type="number" min="0.01" step="0.01" value={minAmount} onChange={e => setMinAmount(e.target.value)} required />
              </div>
              <div>
                <label className="label">Maximum (NIM)</label>
                <input className="input-field" type="number" min="0.01" step="0.01" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label">Your savings amount (NIM)</label>
              <input className="input-field" type="number" min="0.01" step="0.01" value={creatorAmount} onChange={e => setCreatorAmount(e.target.value)} required />
              <p className="text-[11px] text-white/30 mt-1">How much you will save each cycle</p>
            </div>
          </>
        )}

        <div>
          <label className="label">Savings cycle</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {CYCLE_PRESETS.map(p => (
              <button
                key={p.days}
                type="button"
                onClick={() => handleCyclePreset(p.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  cyclePreset === p.days
                    ? 'border-ajo-gold bg-ajo-gold/10 text-ajo-gold'
                    : 'border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCyclePreset('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                cyclePreset === 'custom'
                  ? 'border-ajo-gold bg-ajo-gold/10 text-ajo-gold'
                  : 'border-white/10 text-white/40 hover:border-white/20'
              }`}
            >
              Custom
            </button>
          </div>
          {cyclePreset === 'custom' && (
            <div>
              <label className="label">Custom cycle (days)</label>
              <input className="input-field" type="number" min="1" value={cycleDays} onChange={e => setCycleDays(e.target.value)} required />
            </div>
          )}
          {cyclePreset !== 'custom' && (
            <p className="text-xs text-white/40">Members contribute every {cycleDays} days</p>
          )}
        </div>

        <div>
          <label className="label">Max Members</label>
          <input className="input-field" type="number" min="2" max="20" value={maxMembers} onChange={e => setMaxMembers(e.target.value)} required />
        </div>

        {formError && <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{formError}</p>}

        <p className="text-xs text-white/30">
          Treasury uses your wallet. Payout each round equals the total of all member contributions.
          {mode === 'flexible' && ` Range: ${formatNim(parseFloat(minAmount) || 0)} – ${formatNim(parseFloat(maxAmount) || 0)}.`}
        </p>

        <button type="submit" disabled={submitting || !name.trim()} className="btn-primary w-full">
          {submitting ? 'Creating…' : 'Create Group'}
        </button>
      </form>
    </motion.div>
  )
}