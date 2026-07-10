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
    const result = createGroup({
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

    setSubmitting(false)
    if (result.success) {
      navigate('/dashboard')
    } else {
      setFormError(result.error ?? 'Failed to create group')
    }
  }

  if (!isConnected) {
    return (
      <div className="card flex flex-col items-center justify-center py-12 text-center px-6">
        <Wallet className="w-10 h-10 nq-green mb-4" />
        <h2 className="nq-h2 mb-2">Connect your wallet</h2>
        <p className="nq-text text-on-card-muted mb-6 max-w-xs">You need a Nimiq wallet to create an ajo group.</p>
        {connectError && <div className="nq-notice error mb-4 w-full"><p className="nq-text">{connectError}</p></div>}
        <button onClick={connect} disabled={connecting} className="btn-primary">
          {connecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="nq-h1 text-on-blue mb-1">Create Ajo Group</h2>
      <p className="nq-text text-on-blue-muted mb-6">Set the savings rules for your group</p>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="label-on-card">Group Name</label>
          <input className="input-field" placeholder="e.g. Lagos Tech Ajo" value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div>
          <label className="label-on-card">Description</label>
          <textarea className="input-field resize-none h-20" placeholder="What's this group about?" value={description} onChange={e => setDescription(e.target.value)} required />
        </div>

        <div>
          <label className="label-on-card">Savings mode</label>
          <div className="grid grid-cols-2 gap-2">
            {(['fixed', 'flexible'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`nq-button-s w-full ${mode === m ? 'green' : 'light-blue'}`}
              >
                {m === 'fixed' ? 'Fixed amount' : 'Flexible range'}
              </button>
            ))}
          </div>
          <p className="nq-text-s text-on-card-muted mt-1.5">
            {mode === 'fixed'
              ? 'Every member saves the same amount each cycle.'
              : 'Each member picks their own amount within your min–max range.'}
          </p>
        </div>

        {mode === 'fixed' ? (
          <div>
            <label className="label-on-card">Amount per cycle (NIM)</label>
            <input className="input-field" type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-on-card">Minimum (NIM)</label>
                <input className="input-field" type="number" min="0.01" step="0.01" value={minAmount} onChange={e => setMinAmount(e.target.value)} required />
              </div>
              <div>
                <label className="label-on-card">Maximum (NIM)</label>
                <input className="input-field" type="number" min="0.01" step="0.01" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label-on-card">Your savings amount (NIM)</label>
              <input className="input-field" type="number" min="0.01" step="0.01" value={creatorAmount} onChange={e => setCreatorAmount(e.target.value)} required />
              <p className="text-[11px] text-white/30 mt-1">How much you will save each cycle</p>
            </div>
          </>
        )}

        <div>
          <label className="label-on-card">Savings cycle</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {CYCLE_PRESETS.map(p => (
              <button
                key={p.days}
                type="button"
                onClick={() => handleCyclePreset(p.days)}
                className={`nq-button-s ${cyclePreset === p.days ? 'gold' : 'light-blue'}`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCyclePreset('custom')}
              className={`nq-button-s ${cyclePreset === 'custom' ? 'gold' : 'light-blue'}`}
            >
              Custom
            </button>
          </div>
          {cyclePreset === 'custom' && (
            <div>
              <label className="label-on-card">Custom cycle (days)</label>
              <input className="input-field" type="number" min="1" value={cycleDays} onChange={e => setCycleDays(e.target.value)} required />
            </div>
          )}
          {cyclePreset !== 'custom' && (
            <p className="nq-text-s text-on-card-muted">Members contribute every {cycleDays} days</p>
          )}
        </div>

        <div>
          <label className="label-on-card">Max Members</label>
          <input className="input-field" type="number" min="2" max="20" value={maxMembers} onChange={e => setMaxMembers(e.target.value)} required />
        </div>

        {formError && <div className="nq-notice error"><p className="nq-text">{formError}</p></div>}

        <p className="nq-text-s text-on-card-muted">
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