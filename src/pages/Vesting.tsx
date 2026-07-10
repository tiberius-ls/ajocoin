import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Wallet } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import EmptyState from '../components/EmptyState'
import NimiqIcon from '../components/nimiq/NimiqIcon'
import { formatNim, formatDate, vestingProgress, daysBetween } from '../lib/utils'

export default function Vesting() {
  const { vesting, wallet, myGroups, isConnected, connecting, connect, connectError, withdrawVested } = useAjo()
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const myVesting = vesting.filter(v => v.memberAddress === wallet.address)

  if (!isConnected) {
    return (
      <EmptyState
        icon={Wallet}
        title="Connect your wallet"
        description="See your locked payouts and withdraw vested funds."
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

  const handleWithdraw = async (vestingId: string) => {
    setWithdrawingId(vestingId)
    setMessage('')
    const result = await withdrawVested(vestingId)
    setWithdrawingId(null)
    if (result.success) setMessage('Withdrawal sent to your wallet!')
    else setMessage(result.error ?? 'Withdrawal failed')
    setTimeout(() => setMessage(''), 4000)
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h2 className="nq-h1 text-on-blue">Vesting</h2>
        <p className="nq-text text-on-blue-muted">Withdraw your vested payouts</p>
      </div>

      {message && (
        <div className="nq-notice success"><p className="nq-text">{message}</p></div>
      )}

      {myVesting.length === 0 ? (
        <EmptyState
          icon={Lock}
          title="No vesting schedules"
          description="Vesting schedules are created when you receive an ajo payout."
        />
      ) : (
        <div className="space-y-4">
          {myVesting.map((schedule, i) => {
            const progress = vestingProgress(schedule)
            const remaining = schedule.totalAmount - schedule.releasedAmount
            const daysLeft = daysBetween(new Date().toISOString(), schedule.endDate)
            const totalDays = daysBetween(schedule.startDate, schedule.endDate)
            const cliffProgress = (schedule.cliffDays / totalDays) * 100
            const group = myGroups.find(g => g.id === schedule.groupId)
            const isTreasurer = group?.treasuryAddress === wallet.address
            const canWithdraw = remaining > 0 && progress >= cliffProgress && isTreasurer
            const chunk = Math.min(remaining, schedule.totalAmount * 0.25)

            return (
              <motion.div
                key={schedule.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="nq-label nq-gold">{schedule.groupName}</p>
                    <h3 className="nq-h3 text-on-card mt-0.5">{formatNim(schedule.totalAmount)} locked</h3>
                  </div>
                  <div className="text-right">
                    <p className="nq-h2 nq-green">{formatNim(remaining)}</p>
                    <p className="nq-text-s text-on-card-muted">available</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between nq-text-s text-on-card-muted mb-1.5">
                    <span>{formatNim(schedule.releasedAmount)} withdrawn</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="progress-track" style={{ height: '0.5rem' }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, var(--nimiq-gold), var(--nimiq-green))',
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="card-inset">
                    <p className="stat-label" style={{ marginBottom: '0.15rem' }}>Cliff</p>
                    <p className="nq-text font-semibold text-on-card">{schedule.cliffDays}d</p>
                  </div>
                  <div className="card-inset">
                    <p className="stat-label" style={{ marginBottom: '0.15rem' }}>Start</p>
                    <p className="nq-text font-semibold text-on-card">{formatDate(schedule.startDate)}</p>
                  </div>
                  <div className="card-inset">
                    <p className="stat-label" style={{ marginBottom: '0.15rem' }}>Ends</p>
                    <p className="nq-text font-semibold text-on-card flex items-center justify-center gap-1">
                      <NimiqIcon name="stopwatch" style={{ width: '1.25rem', height: '1.25rem' }} />
                      {daysLeft}d
                    </p>
                  </div>
                </div>

                {canWithdraw ? (
                  <button
                    onClick={() => handleWithdraw(schedule.id)}
                    disabled={withdrawingId === schedule.id}
                    className="btn-gold w-full flex items-center justify-center gap-2"
                  >
                    <NimiqIcon name="download" style={{ width: '1.25rem', height: '1.25rem' }} />
                    {withdrawingId === schedule.id ? 'Withdrawing…' : `Withdraw ${formatNim(chunk)}`}
                  </button>
                ) : remaining > 0 && !isTreasurer ? (
                  <p className="nq-text-s text-on-card-muted text-center">Treasurer will release vested funds to your wallet</p>
                ) : remaining > 0 ? (
                  <p className="nq-text-s text-on-card-muted text-center">Cliff period not reached yet</p>
                ) : (
                  <p className="nq-text-s nq-green text-center">Fully withdrawn</p>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}