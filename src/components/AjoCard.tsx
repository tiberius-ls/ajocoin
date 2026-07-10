import { Link } from 'react-router-dom'
import { Users, ChevronRight } from 'lucide-react'
import type { AjoGroup } from '../types'
import { formatSavingsLabel, formatCycleLabel } from '../lib/utils'
import NimiqIcon from './nimiq/NimiqIcon'

interface AjoCardProps {
  group: AjoGroup
}

export default function AjoCard({ group }: AjoCardProps) {
  const contributed = group.members.filter(m => m.hasContributed).length
  const progress = group.members.length > 0
    ? Math.round((contributed / group.members.length) * 100)
    : 0

  return (
    <Link to={`/group/${group.id}`} className="card block transition-transform active:scale-[0.99] group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="nq-h3 group-hover:nq-green transition-colors">{group.name}</h3>
          <p className="nq-text-s text-on-card-muted mt-0.5 line-clamp-1">{group.description}</p>
        </div>
        <span className={`nq-text-s uppercase px-2 py-0.5 rounded-full ${
          group.status === 'active' ? 'nq-green-bg nq-green' : 'nq-gray-bg text-on-card-muted'
        }`} style={{ fontSize: '1.1rem', padding: '0.25rem 0.75rem', borderRadius: '999px' }}>
          {group.status}
        </span>
      </div>

      <div className="flex items-center gap-4 nq-text-s text-on-card-muted mb-3">
        <span className="flex items-center gap-1">
          <NimiqIcon name="transfer" className="nq-gold" style={{ width: '1.5rem', height: '1.5rem' }} />
          {formatSavingsLabel(group)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {group.members.length}/{group.maxMembers}
        </span>
        <span>{formatCycleLabel(group.cycleDays)}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="nq-text-s text-on-card-muted">{progress}%</span>
        <ChevronRight className="w-4 h-4 text-on-card-muted group-hover:nq-green transition-colors" />
      </div>
    </Link>
  )
}