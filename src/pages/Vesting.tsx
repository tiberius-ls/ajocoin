import { motion } from 'framer-motion'
import { Lock, Unlock, Clock } from 'lucide-react'
import { useAjo } from '../context/AjoContext'
import EmptyState from '../components/EmptyState'
import { formatNim, formatDate, vestingProgress, daysBetween } from '../lib/utils'

export default function Vesting() {
  const { vesting, wallet, connect, connecting, releaseVesting } = useAjo()

  const myVesting = vesting.filter(v => v.memberAddress === wallet.address)
  const allVesting = wallet.address ? vesting : []

  if (!wallet.address) {
    return (
      <EmptyState
        icon={Lock}
        title="Connect to view vesting"
        description="See your locked payouts and release schedules."
        action={
          <button onClick={connect} disabled={connecting} className="btn-primary">
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        }
      />
    )
  }

  const schedules = allVesting.length > 0 ? allVesting : myVesting

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Vesting</h2>
        <p className="text-sm text-white/40">Locked payouts with cliff periods</p>
      </div>

      <div className="card !p-4 bg-gradient-to-r from-ajo-gold/5 to-nimiq-green/5">
        <p className="text-xs text-white/50">
          Vesting protects group funds by releasing payouts gradually. Funds unlock after the cliff period and vest linearly until the end date.
        </p>
      </div>

      {schedules.length === 0 ? (
        <EmptyState
          icon={Lock}
          title="No vesting schedules"
          description="Vesting schedules are created when a member receives their ajo payout."
        />
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule, i) => {
            const progress = vestingProgress(schedule)
            const remaining = schedule.totalAmount - schedule.releasedAmount
            const daysLeft = daysBetween(new Date().toISOString(), schedule.endDate)
            const isMine = schedule.memberAddress === wallet.address
            const canRelease = isMine && remaining > 0 && progress >= (schedule.cliffDays / daysBetween(schedule.startDate, schedule.endDate)) * 100

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
                    <h3 className="font-semibold mt-0.5">{schedule.memberName}</h3>
                    {isMine && <span className="text-[10px] text-nimiq-green">Your schedule</span>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatNim(schedule.totalAmount)}</p>
                    <p className="text-[10px] text-white/30">total locked</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-white/40 mb-1.5">
                    <span>{formatNim(schedule.releasedAmount)} released</span>
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
                      <Clock className="w-3 h-3" />
                      {daysLeft}d
                    </p>
                  </div>
                </div>

                {canRelease && (
                  <button
                    onClick={() => releaseVesting(schedule.id, Math.min(remaining, schedule.totalAmount * 0.25))}
                    className="btn-gold w-full flex items-center justify-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    Release {formatNim(Math.min(remaining, schedule.totalAmount * 0.25))}
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}