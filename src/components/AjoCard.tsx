import { Link } from 'react-router-dom'
import { Users, Coins, ChevronRight } from 'lucide-react'
import type { AjoGroup } from '../types'
import { formatSavingsLabel, formatCycleLabel } from '../lib/utils'

interface AjoCardProps {
  group: AjoGroup
}

export default function AjoCard({ group }: AjoCardProps) {
  const contributed = group.members.filter(m => m.hasContributed).length
  const progress = group.members.length > 0
    ? Math.round((contributed / group.members.length) * 100)
    : 0

  return (
    <Link to={`/group/${group.id}`} className="card block hover:border-nimiq-green/20 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-base group-hover:text-nimiq-green transition-colors">{group.name}</h3>
          <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{group.description}</p>
        </div>
        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
          group.status === 'active' ? 'bg-nimiq-green/20 text-nimiq-green' : 'bg-white/10 text-white/50'
        }`}>
          {group.status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-white/50 mb-3">
        <span className="flex items-center gap-1">
          <Coins className="w-3.5 h-3.5 text-ajo-gold" />
          {formatSavingsLabel(group)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {group.members.length}/{group.maxMembers}
        </span>
        <span>{formatCycleLabel(group.cycleDays)}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-ajo-slate rounded-full overflow-hidden">
          <div
            className="h-full bg-nimiq-green rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-white/40">{progress}%</span>
        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-nimiq-green transition-colors" />
      </div>
    </Link>
  )
}