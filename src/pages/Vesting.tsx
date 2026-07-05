import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, ArrowDownToLine, Clock, Wallet } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import EmptyState from '../components/EmptyState'
import { formatNim, formatDate, vestingProgress, daysBetween } from '../lib/utils'

export default function Vesting() {
  const { vesting, wallet, isConnected, connecting, connect, connectError, withdrawVested } = useAjo()
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
            {connectError && <p className="text-xs text-red-400">{connectError}</p>}
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
      <div>
        <h2 className="text-xl font-bold">Vesting</h2>
        <p className="text-sm text-white/40">Withdraw your vested payouts</p>
      </div>

      {message && (
        <div className="text-sm text-nimiq-green bg-nimiq-green/10 rounded-xl px-4 py-3">{message}</div>
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
            const canWithdraw = remaining > 0 && progress >= cliffProgress
            const chunk = Math.min(remaining, schedule.totalAmount * 0.25)

            return (
              <motion.div
                key={schedule.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-ajo-gold font-semibold uppercase">{schedule.groupName}</p>
                    <h3 className="font-semibold mt-0.5">{formatNim(schedule.totalAmount)} locked</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-nimiq-green">{formatNim(remaining)}</p>
                    <p className="text-[10px] text-white/30">available</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-white/40 mb-1.5">
                    <span>{formatNim(schedule.releasedAmount)} withdrawn</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-ajo-slate rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-ajo-gold to-nimiq-green rounded-full transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-ajo-slate rounded-xl py-2">
                    <p className="text-[10px] text-white/30 uppercase">Cliff</p>
                    <p className="text-sm font-semibold">{schedule.cliffDays}d</p>
                  </div>
                  <div className="bg-ajo-slate rounded-xl py-2">
                    <p className="text-[10px] text-white/30 uppercase">Start</p>
                    <p className="text-sm font-semibold">{formatDate(schedule.startDate)}</p>
                  </div>
                  <div className="bg-ajo-slate rounded-xl py-2">
                    <p className="text-[10px] text-white/30 uppercase">Ends</p>
                    <p className="text-sm font-semibold flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" /> {daysLeft}d
                    </p>
                  </div>
                </div>

                {canWithdraw ? (
                  <button
                    onClick={() => handleWithdraw(schedule.id)}
                    disabled={withdrawingId === schedule.id}
                    className="btn-gold w-full flex items-center justify-center gap-2"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    {withdrawingId === schedule.id ? 'Withdrawing…' : `Withdraw ${formatNim(chunk)}`}
                  </button>
                ) : remaining > 0 ? (
                  <p className="text-xs text-white/30 text-center">Cliff period not reached yet</p>
                ) : (
                  <p className="text-xs text-nimiq-green text-center">Fully withdrawn</p>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}